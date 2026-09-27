// LOT J — Backup / Export / Import (Sauvegardes).
//
// Pure, framework-free functions that build, serialise, parse and validate a
// SportTrack backup. They run under node (no DOM / IndexedDB required), so the
// validation logic can be unit-tested with tsx.
//
// The backup format is independent of IndexedDB's DB_VERSION. Bumping the
// backup formatVersion NEVER touches DB_VERSION (which must stay exactly 8).
//
// Backport/forward-compat: backups produced before this LOT carried no
// formatVersion field but already used the { data: ... } envelope. They are
// treated as formatVersion 1 (the current format).

export const EXPORT_FORMAT_VERSION = 1;
export const BACKUP_APP = 'SportTrack';

// All IndexedDB object stores that are user data and therefore part of a full
// backup. Order is irrelevant; existence of every store key is validated on
// import. profile is a single object (not an array).
export const BACKUP_STORE_KEYS = [
  'profile',
  'programs',
  'exercises',
  'sessions',
  'records',
  'goals',
  'measurements',
  'exercisePerformances',
  'exerciseBests',
  'sessionDrafts',
] as const;

// localStorage key owned by SportTrack that is part of the user's personalisation
// (LOT H preferences). Restored on import WITHOUT touching other storage keys.
export const SETTINGS_KEY = 'sporttrack-settings';

// Error types surfaced to the UI as human-readable messages.
export type BackupErrorCode =
  | 'INVALID_JSON'
  | 'EMPTY_FILE'
  | 'NOT_OBJECT'
  | 'NO_DATA'
  | 'UNKNOWN_FORMAT_VERSION'
  | 'MISSING_STORE'
  | 'BAD_STORE_TYPE'
  | 'BAD_RECORD'
  | 'NON_FINITE_NUMBER'
  | 'BAD_SETTINGS';

export const BACKUP_ERROR_MESSAGES: Record<BackupErrorCode, string> = {
  INVALID_JSON: 'Le fichier n’est pas un JSON valide.',
  EMPTY_FILE: 'Le fichier est vide.',
  NOT_OBJECT: 'La sauvegarde doit être un objet JSON.',
  NO_DATA: 'La sauvegarde ne contient pas de données (bloc "data" manquant).',
  UNKNOWN_FORMAT_VERSION: 'Version de format de sauvegarde inconnue.',
  MISSING_STORE: 'La sauvegarde est incomplète (données manquantes).',
  BAD_STORE_TYPE: 'Les données sauvegardées ont un format incorrect.',
  BAD_RECORD: 'Une entrée sauvegardée est invalide.',
  NON_FINITE_NUMBER: 'La sauvegarde contient des valeurs numériques invalides (NaN/Infinity).',
  BAD_SETTINGS: 'Les préférences sauvegardées sont invalides.',
};

export class BackupError extends Error {
  code: BackupErrorCode;
  constructor(code: BackupErrorCode) {
    super(BACKUP_ERROR_MESSAGES[code]);
    this.name = 'BackupError';
    this.code = code;
  }
}

// ---- Serialisable-value sanitising (export) --------------------------------
//
// JSON.stringify turns NaN / Infinity into null and throws on circular
// references. Before exporting we walk the object graph and:
//   - replace any non-finite number with 0 (never export corrupt numeric data),
//   - throw if a circular reference is detected (data must be acyclic).

export function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function sanitizeExportValue(value: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (value === null || value === undefined || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'bigint' || typeof value === 'symbol' || typeof value === 'function') {
    // Not serialisable meaningfully -> drop.
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeExportValue(item, seen, depth + 1));
  }
  if (typeof value === 'object') {
    if (depth > 128 || seen.has(value)) {
      throw new BackupError('BAD_RECORD'); // circular / too deep -> refuse
    }
    seen.add(value);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value)) {
      const cleaned = sanitizeExportValue((value as Record<string, unknown>)[k], seen, depth + 1);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }
  return value;
}

// ---- Export builder ---------------------------------------------------------

export interface BackupEnvelope {
  formatVersion: number;
  app: string;
  exportedAt: string;
  data: Record<string, unknown>; // keyed by store name (BACKUP_STORE_KEYS)
  settings?: unknown; // WorkoutSettings (optional)
}

// Build a full backup envelope from already-loaded store data and an optional
// settings object. Returns a plain object (caller JSON.stringifies it).
export function buildBackup(
  storeData: Record<string, unknown>,
  settings?: unknown
): BackupEnvelope {
  for (const key of BACKUP_STORE_KEYS) {
    if (!(key in storeData)) {
      throw new BackupError('MISSING_STORE');
    }
  }
  const data: Record<string, unknown> = {};
  for (const key of BACKUP_STORE_KEYS) {
    data[key] = sanitizeExportValue(storeData[key]);
  }
  const envelope: BackupEnvelope = {
    formatVersion: EXPORT_FORMAT_VERSION,
    app: BACKUP_APP,
    exportedAt: new Date().toISOString(),
    data,
  };
  if (settings !== undefined && settings !== null) {
    envelope.settings = sanitizeExportValue(settings);
  }
  return envelope;
}

export function serializeBackup(storeData: Record<string, unknown>, settings?: unknown): string {
  const envelope = buildBackup(storeData, settings);
  return JSON.stringify(envelope, null, 2);
}

// ---- Security limits (DoS protection) ------------------------------------

/** Maximum byte-length accepted for a raw JSON backup string. */
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024; // 20 MB

/** Maximum number of records allowed in any single store array. */
export const MAX_STORE_RECORDS = 100_000;

/** Maximum byte-length for any single string value inside the backup. */
export const MAX_STRING_LENGTH = 50_000;

/** Maximum recursive depth for import-side validation (matches export side). */
const MAX_VALIDATION_DEPTH = 128;

// ---- Validation / parsing (import) ------------------------------------------

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// Recursively ensure no non-finite number sneaks in (JSON.parse of a crafted
// string like "1e400" yields Infinity).
function assertFiniteNumbers(
  value: unknown,
  path: string,
  seen = new WeakSet<object>(),
  depth = 0,
): void {
  if (depth > MAX_VALIDATION_DEPTH) {
    throw new BackupError('BAD_RECORD');
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new BackupError('NON_FINITE_NUMBER');
    }
    return;
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'bigint' || typeof value === 'symbol' || typeof value === 'function') {
    throw new BackupError('BAD_RECORD');
  }
  if (typeof value === 'object') {
    if (seen.has(value)) throw new BackupError('BAD_RECORD');
    seen.add(value);
    if (Array.isArray(value)) {
      if (value.length > MAX_STORE_RECORDS) {
        throw new BackupError('BAD_RECORD');
      }
      value.forEach((item, i) => assertFiniteNumbers(item, `${path}[${i}]`, seen, depth + 1));
    } else {
      for (const k of Object.keys(value)) {
        const v = (value as Record<string, unknown>)[k];
        if (typeof v === 'string' && v.length > MAX_STRING_LENGTH) {
          throw new BackupError('BAD_RECORD');
        }
        assertFiniteNumbers(v, `${path}.${k}`, seen, depth + 1);
      }
    }
  }
}

// IndexedDB keyPath per array store. exerciseBests is keyed by exerciseId (the
// others by id). Used to validate that every record carries its primary key.
const STORE_KEY_PATH: Record<string, string> = {
  programs: 'id',
  exercises: 'id',
  sessions: 'id',
  records: 'id',
  goals: 'id',
  measurements: 'id',
  exercisePerformances: 'id',
  exerciseBests: 'exerciseId',
  sessionDrafts: 'id',
};

// Validate a single backup record: must be a plain object carrying its string
// primary key (the IndexedDB keyPath). Extra / unknown properties are tolerated
// (forward-compatible); only malformed core data is rejected.
function validateRecord(value: unknown, storeKey: string, index: number): void {
  if (!isPlainObject(value)) {
    throw new BackupError('BAD_RECORD');
  }
  const idField = STORE_KEY_PATH[storeKey];
  const id = idField ? (value as Record<string, unknown>)[idField] : undefined;
  if (typeof id !== 'string' || id.length === 0 || id.length > MAX_STRING_LENGTH) {
    throw new BackupError('BAD_RECORD');
  }
  assertFiniteNumbers(value, `${storeKey}[${index}]`);
}

// Validate the whole `data` block. Returns the validated data object.
export function validateBackupData(data: unknown): Record<string, unknown> {
  if (!isPlainObject(data)) {
    throw new BackupError('NO_DATA');
  }
  for (const key of BACKUP_STORE_KEYS) {
    if (!(key in data)) {
      throw new BackupError('MISSING_STORE');
    }
    const value = data[key];
    if (key === 'profile') {
      if (!isPlainObject(value)) throw new BackupError('BAD_STORE_TYPE');
      if (typeof (value as Record<string, unknown>).name !== 'string') {
        throw new BackupError('BAD_RECORD');
      }
      assertFiniteNumbers(value, 'profile');
    } else {
      if (!Array.isArray(value)) throw new BackupError('BAD_STORE_TYPE');
      if (value.length > MAX_STORE_RECORDS) throw new BackupError('BAD_RECORD');
      value.forEach((item, i) => validateRecord(item, key, i));
    }
  }
  return data as Record<string, unknown>;
}

// Parse a JSON backup string fully. Returns the validated envelope (data +
// optional settings). Throws BackupError on any problem so callers can show a
// clear message and — crucially — can refuse to touch IndexedDB until this
// function returns a valid result.
export function parseBackup(json: string): { data: Record<string, unknown>; settings?: unknown } {
  if (typeof json !== 'string') {
    throw new BackupError('INVALID_JSON');
  }
  const trimmed = json.trim();
  if (trimmed.length === 0) {
    throw new BackupError('EMPTY_FILE');
  }
  if (trimmed.length > MAX_BACKUP_BYTES) {
    throw new BackupError('BAD_RECORD');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new BackupError('INVALID_JSON');
  }
  if (!isPlainObject(parsed)) {
    throw new BackupError('NOT_OBJECT');
  }

  const formatVersion = parsed['formatVersion'];
  if (formatVersion !== undefined && formatVersion !== null) {
    // Unknown / newer formats are refused, never half-applied.
    if (formatVersion !== EXPORT_FORMAT_VERSION) {
      throw new BackupError('UNKNOWN_FORMAT_VERSION');
    }
  }
  // Absent formatVersion => legacy pre-versioning backup, still v1-shaped.

  const data = validateBackupData(parsed['data']);

  let settings: unknown;
  if (parsed['settings'] !== undefined && parsed['settings'] !== null) {
    if (!isPlainObject(parsed['settings'])) throw new BackupError('BAD_SETTINGS');
    assertFiniteNumbers(parsed['settings'], 'settings');
    settings = parsed['settings'];
  }

  return { data, settings };
}
