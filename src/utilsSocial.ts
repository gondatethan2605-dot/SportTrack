import { WorkoutSession, PersonalRecord, Goal, UserProfile } from './types';
import { hasValidCompletedSet } from './utilsSession';
import { computeBadges } from './utilsBadges';
import { computeChallengeProgress, completedChallenges, weekStartIso, type StorageLike } from './utilsChallenges';
import { totalXpFromProfile } from './utilsLevels';
import { countSessionsThisWeek, countRecordsInPeriod } from './utilsStats';
import { evolutionPercent } from './utilsStats';

// LOT 7 — Item 20 (Social, 100% local). NOTHING in this module is ever written
// to IndexedDB, never influences the XP formula and never rewards any social
// action. Friend profiles live in localStorage under SOCIAL_FRIENDS_KEY.

export const SOCIAL_FORMAT_VERSION = 1;
export const SOCIAL_APP = 'SportTrack';
export const SOCIAL_DOC_TYPE = 'social-profile';
export const SOCIAL_FRIENDS_KEY = 'sporttrack-social-friends';
export const MAX_SOCIAL_BYTES = 128 * 1024;
export const MAX_FRIENDS = 50;
export const MAX_ALIAS_LENGTH = 40;

export interface SocialStats {
  level: number;
  xp: number;
  sessions: number;
  records: number;
  badges: number;
  volumeKg: number;
  durationMinutes: number;
  streakDays: number;
  challengesCompleted: number;
  weeklySessions: number;
}

export interface SocialProfileFile {
  formatVersion: number;
  app: string;
  type: string;
  exportedAt: string;
  profile: SocialStats;
}

export interface SocialProfileInput {
  profile: UserProfile;
  sessions: WorkoutSession[];
  records: PersonalRecord[];
  goals: Goal[];
}

const SOCIAL_PROFILE_KEYS: (keyof SocialStats)[] = [
  'level',
  'xp',
  'sessions',
  'records',
  'badges',
  'volumeKg',
  'durationMinutes',
  'streakDays',
  'challengesCompleted',
  'weeklySessions',
];

export function buildSocialProfile(input: SocialProfileInput): SocialProfileFile {
  const sessions = (input.sessions || []).filter(
    (s) => s && s.completed === true && hasValidCompletedSet(s.exercises || [])
  );
  const records = input.records || [];
  const goals = input.goals || [];
  const badges = computeBadges({
    sessions,
    records,
    exercisePerformances: [],
    goals,
    profile: { streakDays: input.profile?.streakDays || 0, bestStreak: input.profile?.bestStreak || 0 },
  });

  const challenges = completedChallenges(computeChallengeProgress({ sessions, records })).length;

  let volumeKg = 0;
  let durationMinutes = 0;
  for (const s of sessions) {
    if (Number.isFinite(s.totalVolumeKg)) volumeKg += s.totalVolumeKg || 0;
    if (Number.isFinite(s.durationMinutes)) durationMinutes += s.durationMinutes || 0;
  }

  const stats: SocialStats = {
    level: Math.max(1, Math.floor(input.profile?.level || 1)),
    xp: Math.max(0, Math.round(totalXpFromProfile(input.profile) || 0)),
    sessions: sessions.length,
    records: records.length,
    badges: badges.filter((b) => b.unlocked).length,
    volumeKg: Math.round(volumeKg),
    durationMinutes: Math.round(durationMinutes),
    streakDays: Math.max(0, Math.round(input.profile?.streakDays || 0)),
    challengesCompleted: challenges,
    weeklySessions: countSessionsThisWeek(sessions),
  };

  return {
    formatVersion: SOCIAL_FORMAT_VERSION,
    app: SOCIAL_APP,
    type: SOCIAL_DOC_TYPE,
    exportedAt: new Date().toISOString(),
    profile: stats,
  };
}

export function serializeSocialProfile(file: SocialProfileFile): string {
  return JSON.stringify(file, null, 2);
}

export type SocialErrorCode =
  | 'INVALID_JSON'
  | 'EMPTY'
  | 'TOO_LARGE'
  | 'NOT_OBJECT'
  | 'UNKNOWN_VERSION'
  | 'WRONG_TYPE'
  | 'WRONG_APP'
  | 'BAD_PROFILE'
  | 'NON_FINITE';

export class SocialError extends Error {
  constructor(public readonly code: SocialErrorCode, message: string) {
    super(message);
    this.name = 'SocialError';
  }
}

function rejectNonFiniteNumbers(value: unknown, path: string, seen: Set<unknown>): void {
  if (value === null || value === undefined || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new SocialError('NON_FINITE', `Valeur non finie à ${path}`);
    }
    return;
  }
  if (typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((v, i) => rejectNonFiniteNumbers(v, `${path}[${i}]`, seen));
    return;
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    rejectNonFiniteNumbers((value as Record<string, unknown>)[key], `${path}.${key}`, seen);
  }
}

// Strict, defensive validation of an imported social profile. Accepts raw JSON
// text or an already-parsed object. Unknown fields are never trusted and are
// dropped; every known numeric field must be a finite number >= 0. The result
// is a clean snapshot that is impossible to turn into something executable.
export function parseSocialProfile(raw: string | unknown, sizeLimit: number = MAX_SOCIAL_BYTES): SocialProfileFile {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) throw new SocialError('EMPTY', 'Fichier vide.');
    if (trimmed.length > sizeLimit) throw new SocialError('TOO_LARGE', 'Fichier trop volumineux.');
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new SocialError('INVALID_JSON', 'JSON invalide.');
    }
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new SocialError('NOT_OBJECT', 'Format non reconnu.');
  }
  rejectNonFiniteNumbers(parsed, '', new Set());

  const doc = parsed as Record<string, unknown>;
  if (doc.formatVersion !== SOCIAL_FORMAT_VERSION) {
    throw new SocialError('UNKNOWN_VERSION', 'Version de format inconnue.');
  }
  if (doc.type !== SOCIAL_DOC_TYPE) {
    throw new SocialError('WRONG_TYPE', 'Type de document inconnu.');
  }
  if (doc.app !== SOCIAL_APP) {
    throw new SocialError('WRONG_APP', 'Application inconnue.');
  }
  const profile = doc.profile;
  if (profile === null || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new SocialError('BAD_PROFILE', 'Profil manquant ou invalide.');
  }

  const source = profile as Record<string, unknown>;
  const result: SocialStats = {} as SocialStats;
  for (const key of SOCIAL_PROFILE_KEYS) {
    const value = source[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new SocialError('BAD_PROFILE', `Champ du profil invalide : ${key}.`);
    }
    result[key] = value;
  }

  return {
    formatVersion: SOCIAL_FORMAT_VERSION,
    app: SOCIAL_APP,
    type: SOCIAL_DOC_TYPE,
    exportedAt: typeof doc.exportedAt === 'string' && doc.exportedAt.length <= 64 ? doc.exportedAt : '',
    profile: result,
  };
}

function defaultStorage(): StorageLike | null {
  try {
    const ls = (globalThis as unknown as { localStorage?: StorageLike }).localStorage;
    return ls || null;
  } catch {
    return null;
  }
}

export interface SocialFriendEntry {
  id: string;
  alias: string;
  importedAt: string;
  profile: SocialStats;
}

function cleanAlias(alias: string): string {
  const clean = String(alias || '').trim().slice(0, MAX_ALIAS_LENGTH);
  return clean;
}

export function buildFriendEntry(alias: string, file: SocialProfileFile, now: Date = new Date()): SocialFriendEntry {
  const clean = cleanAlias(alias);
  return {
    id: clean || `ami-${now.getTime()}`,
    alias: clean || 'Ami',
    importedAt: now.toISOString(),
    profile: { ...file.profile },
  };
}

// Parse-safe loader: malformed storage or invalid entries are never kept.
export function loadSocialFriends(storage: StorageLike | null = defaultStorage()): SocialFriendEntry[] {
  if (!storage) return [];
  const raw = storage.getItem(SOCIAL_FRIENDS_KEY);
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const friends: SocialFriendEntry[] = [];
  for (const entry of parsed as unknown[]) {
    try {
      const e = entry as Record<string, unknown>;
      const alias = typeof e.alias === 'string' ? e.alias.trim() : '';
      if (!alias || alias.length > MAX_ALIAS_LENGTH) continue;
      const validated = parseSocialProfile({
        formatVersion: SOCIAL_FORMAT_VERSION,
        app: SOCIAL_APP,
        type: SOCIAL_DOC_TYPE,
        exportedAt: typeof e.importedAt === 'string' ? e.importedAt : '',
        profile: e.profile,
      });
      friends.push({
        id: typeof e.id === 'string' && e.id.trim() ? e.id : alias,
        alias,
        importedAt: typeof e.importedAt === 'string' ? e.importedAt : new Date().toISOString(),
        profile: validated.profile,
      });
    } catch {
      continue;
    }
  }
  return friends;
}

export function saveSocialFriends(friends: SocialFriendEntry[], storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SOCIAL_FRIENDS_KEY, JSON.stringify(friends.slice(0, MAX_FRIENDS)));
    return true;
  } catch {
    return false;
  }
}

// Add or refresh a friend, deduplicated by alias (an alias in use is replaced).
export function upsertFriend(list: SocialFriendEntry[], entry: SocialFriendEntry): SocialFriendEntry[] {
  const next = (list || []).filter((f) => f.alias !== entry.alias);
  next.push(entry);
  return next.slice(0, MAX_FRIENDS);
}

export function removeFriend(list: SocialFriendEntry[], id: string): SocialFriendEntry[] {
  if (!id) return list || [];
  return (list || []).filter((f) => f.id !== id && f.alias !== id);
}

export const SOCIAL_RANK_METRICS: { id: SocialRankMetric; label: string }[] = [
  { id: 'level', label: 'Niveau' },
  { id: 'xp', label: 'XP totale' },
  { id: 'sessions', label: 'Séances' },
  { id: 'records', label: 'Records' },
];

export type SocialRankMetric = 'level' | 'xp' | 'sessions' | 'records';

export interface SocialRankRow {
  id: string;
  alias: string;
  stats: SocialStats;
  isMe?: boolean;
}

export function rankSocialProfiles(rows: SocialRankRow[], metric: SocialRankMetric): SocialRankRow[] {
  return (rows || [])
    .slice()
    .sort(
      (a, b) =>
        (b.stats?.[metric] || 0) - (a.stats?.[metric] || 0) ||
        (a.alias || '').localeCompare(b.alias || '', 'fr')
    );
}

export interface SocialComparisonRow {
  key: string;
  label: string;
  unit: string;
  mine: number;
  friend: number;
  delta: number | null;
  percent: number | null;
}

export function compareSocialProfiles(mine: SocialStats, friend: SocialStats): SocialComparisonRow[] {
  const rows: { key: keyof SocialStats; label: string; unit: string }[] = [
    { key: 'level', label: 'Niveau', unit: '' },
    { key: 'xp', label: 'XP totale', unit: 'xp' },
    { key: 'sessions', label: 'Séances', unit: '' },
    { key: 'records', label: 'Records', unit: '' },
    { key: 'badges', label: 'Badges', unit: '' },
    { key: 'volumeKg', label: 'Volume', unit: 'kg' },
    { key: 'durationMinutes', label: 'Durée', unit: 'min' },
    { key: 'streakDays', label: 'Série en cours', unit: 'j' },
    { key: 'challengesCompleted', label: 'Défis hebdo réussis', unit: '' },
    { key: 'weeklySessions', label: 'Séances cette semaine', unit: '' },
  ];
  return rows.map((r) => {
    const mineValue = Number.isFinite(mine?.[r.key]) ? (mine[r.key] as number) : 0;
    const friendValue = Number.isFinite(friend?.[r.key]) ? (friend[r.key] as number) : 0;
    const delta = Number.isFinite(mineValue) && Number.isFinite(friendValue) ? mineValue - friendValue : null;
    return {
      key: r.key,
      label: r.label,
      unit: r.unit,
      mine: mineValue,
      friend: friendValue,
      delta,
      percent: evolutionPercent(mineValue, friendValue),
    };
  });
}

export interface SocialChallengeDefinition {
  id: string;
  name: string;
  description: string;
  kind: 'sessions' | 'sets' | 'records';
  target: number;
}

export const SOCIAL_CHALLENGES: SocialChallengeDefinition[] = [
  { id: 'soc-3-sessions', name: '3 séances validées', description: 'Réaliser 3 séances validées cette semaine', kind: 'sessions', target: 3 },
  { id: 'soc-30-sets', name: '30 séries validées', description: 'Valider 30 séries complètes cette semaine', kind: 'sets', target: 30 },
  { id: 'soc-1-record', name: 'Un record cette semaine', description: 'Établir au moins 1 record personnel cette semaine', kind: 'records', target: 1 },
];

export interface SocialChallengeProgress {
  definition: SocialChallengeDefinition;
  current: number;
  percent: number;
  completed: boolean;
}

export function computeSocialChallengeProgress(
  sessions: WorkoutSession[],
  records: PersonalRecord[],
  today: Date = new Date()
): SocialChallengeProgress[] {
  const valid = (sessions || []).filter(
    (s) => s && s.completed === true && hasValidCompletedSet(s.exercises || [])
  );
  const start = weekStartIso(today);
  const weekSessions = valid.filter((s) => s.date >= start);
  const weekRecords = countRecordsInPeriod(records || [], start);

  let sets = 0;
  for (const s of weekSessions) {
    for (const ex of s.exercises || []) {
      for (const set of ex.sets || []) {
        if (!set || set.completed !== true) continue;
        if (set.mode === 'timer' ? (set.durationSec || 0) > 0 : (set.reps || 0) > 0) sets += 1;
      }
    }
  }

  const toProgress = (definition: SocialChallengeDefinition, current: number): SocialChallengeProgress => {
    const safe = Number.isFinite(current) && current > 0 ? Math.round(current) : 0;
    const percent = definition.target > 0 ? Math.min(100, Math.round((safe / definition.target) * 100)) : 0;
    return { definition, current: safe, percent, completed: safe >= definition.target };
  };

  return SOCIAL_CHALLENGES.map((c) => {
    switch (c.kind) {
      case 'sessions':
        return toProgress(c, weekSessions.length);
      case 'sets':
        return toProgress(c, sets);
      case 'records':
      default:
        return toProgress(c, weekRecords);
    }
  });
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString('fr-FR') : '0';
}

export function buildSocialShareText(stats: SocialStats): string {
  return [
    'SportTrack — Profil sportif',
    `Niveau ${stats.level}`,
    `XP totale : ${formatNumber(stats.xp)}`,
    `${formatNumber(stats.sessions)} séance(s) validée(s)`,
    `${formatNumber(stats.records)} record(s) personnel(s)`,
    `${formatNumber(stats.badges)} badge(s)`,
    `Volume : ${formatNumber(stats.volumeKg)} kg`,
    `Durée : ${formatNumber(stats.durationMinutes)} min`,
    `Série en cours : ${formatNumber(stats.streakDays)} jour(s)`,
    `Séances cette semaine : ${formatNumber(stats.weeklySessions)}`,
    'Profil 100% local — aucune donnée personnelle partagée.',
  ].join('\n');
}

export function buildSocialChallengeText(progress: SocialChallengeProgress): string {
  return [
    `SportTrack — Défi : ${progress.definition.name}`,
    progress.definition.description,
    `Objectif : ${progress.definition.target}`,
    `Ma progression : ${progress.current}/${progress.definition.target}`,
    'Relevez le défi ! (100% local, aucun serveur)',
  ].join('\n');
}