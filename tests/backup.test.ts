// LOT J — Backup / Export / Import : tests des fonctions pures du module
// src/db/backup.ts (aucun navigateur requis). Couvre : format, version,
// validation, refus des données invalides, sécurité (aucune suppression avant
// validation), restauration d'un backup valide, et invariants (DB_VERSION=8).
//
// Exécutable via :  tsx tests/backup.test.ts

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EXPORT_FORMAT_VERSION,
  BACKUP_STORE_KEYS,
  serializeBackup,
  buildBackup,
  parseBackup,
  BackupError,
  sanitizeExportValue,
} from '../src/db/backup';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
function ok(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL  ${name}`);
    console.error('      ', (e as Error).message);
    process.exitCode = 1;
  }
}
function na(name: string) {
  console.log(`N/A   ${name}`);
}

// A minimal but structurally-complete set of store data (exactly the 10 keys).
function sampleData(overrides: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = {
    profile: { id: 'main_profile', name: 'Athlète', level: 2, currentXp: 50, nextLevelXp: 500, streakDays: 1, bestStreak: 1, weeklyTargetSessions: 3, weeklyCompletedSessions: 0, totalWorkouts: 1, totalVolumeKg: 100, joinedDate: '2026-01-01' },
    programs: [{ id: 'p1', title: 'Full Body', description: '', daysPerWeek: 3, level: 'Débutant', isActive: true, color: '#7c3aed', days: [] }],
    exercises: [{ id: 'e1', name: 'Développé', primaryMuscle: 'Pectoraux', bodyPart: 'Pectoraux', equipment: 'Barre', difficulty: 'Débutant', category: 'Musculation', description: '', defaultSets: 3, defaultReps: 10, defaultRestSec: 60 }],
    sessions: [{ id: 's1', title: 'Séance 1', date: '2026-01-01', startTime: '10:00', durationMinutes: 30, completed: true, totalVolumeKg: 100, exercises: [] }],
    records: [{ id: 'r1', exerciseId: 'e1', exerciseName: 'Développé', weightKg: 80, reps: 5, date: '2026-01-01', previousWeightKg: 75 }],
    goals: [{ id: 'g1', title: 'Objectif', category: 'frequency', targetValue: 3, currentValue: 1, unit: 'séances', completed: false, createdAt: '2026-01-01' }],
    measurements: [{ id: 'm1', date: '2026-01-01', weightKg: 80 }],
    exercisePerformances: [{ id: 'perf-1', exerciseId: 'e1', exerciseName: 'Développé', sessionId: 's1', sessionTitle: 'Séance 1', date: '2026-01-01', mode: 'reps', setsPlanned: 3, setsCompleted: 3, totalReps: 12, totalDurationSec: 0, totalVolumeKg: 100, weightUsedKg: 80, sets: [], bestSet: null }],
    exerciseBests: [{ exerciseId: 'e1', exerciseName: 'Développé', bestWeightKg: null, bestReps: null, bestVolumeKg: null, bestDurationSec: null, lastPerformedDate: '2026-01-01', timesPerformed: 1, updatedAt: '2026-01-01' }],
    sessionDrafts: [],
  };
  return { ...data, ...overrides };
}

const sampleSettings = { soundEnabled: false, voiceEnabled: true, vibrationEnabled: true, defaultRestSec: 60, units: 'metric', animationsEnabled: false };

// ---- 1. Export complet / format --------------------------------------------
{
  const json = serializeBackup(sampleData(), sampleSettings);
  const parsed = JSON.parse(json);
  ok('export: JSON valide', () => assert.doesNotThrow(() => JSON.parse(json)));
  ok('export: formatVersion = 1', () => assert.equal(parsed.formatVersion, EXPORT_FORMAT_VERSION));
  ok('export: exportedAt présent (ISO)', () => {
    assert.equal(typeof parsed.exportedAt, 'string');
    assert.ok(parsed.exportedAt.length > 0);
    assert.ok(!Number.isNaN(Date.parse(parsed.exportedAt)));
  });
  ok('export: data contient les 10 stores', () => {
    for (const k of BACKUP_STORE_KEYS) assert.ok(k in parsed.data, `store manquant: ${k}`);
  });
  ok('export: profile présent', () => assert.equal(parsed.data.profile.name, 'Athlète'));
  ok('export: programmes présents', () => assert.deepEqual(parsed.data.programs, sampleData().programs));
  ok('export: séances présentes', () => assert.equal(parsed.data.sessions.length, 1));
  ok('export: records présents', () => assert.equal(parsed.data.records.length, 1));
  ok('export: goals présents', () => assert.equal(parsed.data.goals.length, 1));
  ok('export: measurements présents', () => assert.equal(parsed.data.measurements.length, 1));
  ok('export: exercisePerformances présents', () => assert.equal(parsed.data.exercisePerformances.length, 1));
  ok('export: exerciseBests présents', () => assert.equal(parsed.data.exerciseBests.length, 1));
  ok('export: sessionDrafts présents', () => assert.ok(Array.isArray(parsed.data.sessionDrafts)));
  ok('export: settings inclus', () => assert.equal(parsed.settings.soundEnabled, false));
}

// ---- Export sans settings ---------------------------------------------------
{
  const json = serializeBackup(sampleData());
  const parsed = JSON.parse(json);
  ok('export sans settings: champ absent', () => assert.ok(!('settings' in parsed)));
}

// ---- 3. Validation export : NaN / Infinity normalisés ------------------------
{
  const dirty = sampleData({ programs: [{ id: 'p1', title: 'Bad', description: '', daysPerWeek: NaN, level: 'Débutant', isActive: true, color: '#000', days: [] }] });
  const parsed = JSON.parse(serializeBackup(dirty));
  const daysPerWeek = parsed.data.programs[0].daysPerWeek;
  ok('export: NaN remplacé par 0 (non-null)', () => assert.equal(daysPerWeek, 0));
  ok('export: pas de Infinity exporté', () => {
    assert.ok(JSON.stringify(parsed).indexOf('Infinity') === -1);
  });
  const inf = sanitizeExportValue(Infinity);
  ok('sanitizeExportValue(Infinity) → 0', () => assert.equal(inf, 0));
  const nan = sanitizeExportValue(NaN);
  ok('sanitizeExportValue(NaN) → 0', () => assert.ok(Object.is(nan, 0)));
}

// ---- 4. Import valide --------------------------------------------------------
{
  const backup = serializeBackup(sampleData(), sampleSettings);
  const { data, settings } = parseBackup(backup);
  ok('import valide: data restitué', () => assert.equal((data.programs as unknown[]).length, 1));
  ok('import valide: settings restitué', () => assert.equal((settings as any).defaultRestSec, 60));
  ok('import valide: profile restitué', () => assert.equal((data.profile as any).name, 'Athlète'));
}

// ---- 6. Fichier vide / JSON invalide / mauvais format ------------------------
function expectReject(name: string, input: string, code: string) {
  ok(name, () => {
    try {
      parseBackup(input);
    } catch (e) {
      assert.ok(e instanceof BackupError, 'doit être un BackupError');
      assert.equal((e as BackupError).code, code);
      return;
    }
    assert.fail('ne doit pas accepter');
  });
}
expectReject('fichier vide → EMPTY_FILE', '', 'EMPTY_FILE');
expectReject('JSON invalide → INVALID_JSON', '{ not json', 'INVALID_JSON');
expectReject('JSON invalide (garbage) → INVALID_JSON', 'hello world', 'INVALID_JSON');
expectReject('mauvais format (tableau racine) → NOT_OBJECT', '[1,2,3]', 'NOT_OBJECT');
expectReject('mauvais format (null) → NOT_OBJECT', 'null', 'NOT_OBJECT');
expectReject('pas de bloc data → NO_DATA', JSON.stringify({ formatVersion: 1 }), 'NO_DATA');
expectReject('atomes sans data → NO_DATA', JSON.stringify({ foo: 1 }), 'NO_DATA');

// ---- Version inconnue ---------------------------------------------------------
expectReject('version inconnue (2) → UNKNOWN_FORMAT_VERSION', JSON.stringify({ formatVersion: 2, data: sampleData() }), 'UNKNOWN_FORMAT_VERSION');
expectReject('version inconnue (0) → UNKNOWN_FORMAT_VERSION', JSON.stringify({ formatVersion: 0, data: sampleData() }), 'UNKNOWN_FORMAT_VERSION');

// ---- Champs manquants ---------------------------------------------------------
{
  const missing = { ...sampleData() };
  delete missing.goals;
  expectReject('champ manquant (goals) → MISSING_STORE', JSON.stringify({ formatVersion: 1, data: missing }), 'MISSING_STORE');
}

// ---- Types incorrects ----------------------------------------------------------
{
  const badStore = sampleData({ programs: 'pas-un-tableau' });
  expectReject('store non-tableau (programs string) → BAD_STORE_TYPE', JSON.stringify({ formatVersion: 1, data: badStore }), 'BAD_STORE_TYPE');
  const badProfile = sampleData({ profile: [1, 2] });
  expectReject('profile non-objet → BAD_STORE_TYPE', JSON.stringify({ formatVersion: 1, data: badProfile }), 'BAD_STORE_TYPE');
  const badRecord = sampleData({ records: [{ noId: true }] });
  expectReject('record sans id → BAD_RECORD', JSON.stringify({ formatVersion: 1, data: badRecord }), 'BAD_RECORD');
  const badRecordPrimitive = sampleData({ goals: ['x'] });
  expectReject('record primitif → BAD_RECORD', JSON.stringify({ formatVersion: 1, data: badRecordPrimitive }), 'BAD_RECORD');
}

// ---- NaN / Infinity si représentables -------------------------------------------
// JSON.stringify turns Infinity into literal `null`, so to exercise the
// NON_FINITE_NUMBER path we must send RAW JSON text that parses to Infinity.
{
  // A raw backup whose session durationMinutes is the literal 1e400 (= Infinity).
  const base = { formatVersion: 1, data: sampleData({ sessions: [{ id: 's1', title: 'x', date: '2026-01-01', startTime: '10:00', durationMinutes: 0, completed: true, totalVolumeKg: 1, exercises: [] }] }) };
  const raw = JSON.stringify(base).replace('"durationMinutes":0', '"durationMinutes":1e400');
  expectReject('durerInfinity (1e400 au parse) → NON_FINITE_NUMBER', raw, 'NON_FINITE_NUMBER');

  const rawRec = JSON.stringify({ formatVersion: 1, data: sampleData({ records: [{ id: 'r1', exerciseId: 'e1', exerciseName: 'x', weightKg: 0, reps: 1, date: '2026-01-01' }] }) })
    .replace('"weightKg":0', '"weightKg":1e400');
  expectReject('1e400 dans records → NON_FINITE_NUMBER', rawRec, 'NON_FINITE_NUMBER');
}

// ---- Legacy : ancien export sans formatVersion -----------------------------------
{
  const legacy = { data: sampleData() };
  const json = JSON.stringify(legacy);
  const { data } = parseBackup(json);
  ok('legacy (sans formatVersion) accepté → v1', () => assert.equal((data.programs as unknown[]).length, 1));
}

// ---- Sécurité : rien n'est supprimé avant validation -----------------------------
// (testé au niveau des fonctions pures : parseBackup ne fait aucune écriture)
ok('parseBackup ne modifie aucune donnée (pure)', () => {
  const store = sampleData();
  const before = JSON.stringify(store);
  try { parseBackup(JSON.stringify({ formatVersion: 2, data: store })); } catch { /* attendu */ }
  assert.equal(JSON.stringify(store), before);
});

// ---- Données étrangères non supprimées -------------------------------------------
// Le module ne manipule que la clé sporttrack-settings ; aucune clé étrangère n'y
// est référencée. Vérifions qu'aucune onction de suppression de localStorage n'existe.
{
  const backupRaw = fs.readFileSync(path.join(ROOT, 'src', 'db', 'backup.ts'), 'utf8');
  ok('backup.ts ne référence aucune clé localStorage étrangère', () => {
    assert.ok(!/localStorage\.(clear|removeItem)\(/.test(backupRaw));
  });
  const indexedRaw = fs.readFileSync(path.join(ROOT, 'src', 'db', 'indexedDb.ts'), 'utf8');
  ok('indexedDb.ts (import) ne supprime que la clé SportTrack settings', () => {
    assert.ok(!/localStorage\.clear\(/.test(indexedRaw));
  });
}

// ---- DB_VERSION reste 8 -----------------------------------------------------------
{
  const dbRaw = fs.readFileSync(path.join(ROOT, 'src', 'db', 'indexedDb.ts'), 'utf8');
  const m = dbRaw.match(/DB_VERSION\s*=\s*(\d+)/);
  ok('DB_VERSION = 8 (exactement, pas de 9)', () => assert.equal(m![1], '8'));
}

// ---- sessionDrafts restaurés ------------------------------------------------------
{
  const withDraft = sampleData({ sessionDrafts: [{ id: 'active_draft', title: 'brouillon', exercises: [], elapsedSeconds: 5, isTimerRunning: false, feeling: '⚡ Normal' as string, notes: '', phase: 'musculation' as string, completedStretchesCount: 0, currentStretchIdx: 0, currentSideIndex: 1, updatedAt: '2026-01-01' }] });
  ok('import: sessionDrafts inclus et validés', () => {
    const { data } = parseBackup(serializeBackup(withDraft));
    assert.equal((data.sessionDrafts as unknown[]).length, 1);
    assert.equal((data.sessionDrafts[0] as any).id, 'active_draft');
  });
}

// ---- buildBackup exige tous les stores --------------------------------------------
{
  ok('buildBackup refuse les stores manquants', () => {
    assert.throws(() => buildBackup({} as any), BackupError);
  });
}

// ---- Bootstrap / restauration "round-trip" -----------------------------------------
{
  const original = sampleData();
  const json = serializeBackup(original, sampleSettings);
  const { data, settings } = parseBackup(json);
  ok('restauration round-trip: programmes identiques', () => assert.deepEqual(data.programs, original.programs));
  ok('restauration round-trip: séances identiques', () => assert.deepEqual(data.sessions, original.sessions));
  ok('restauration round-trip: records identiques', () => assert.deepEqual(data.records, original.records));
  ok('restauration round-trip: goals identiques', () => assert.deepEqual(data.goals, original.goals));
  ok('restauration round-trip: measurements identiques', () => assert.deepEqual(data.measurements, original.measurements));
  ok('restauration round-trip: performances identiques', () => assert.deepEqual(data.exercisePerformances, original.exercisePerformances));
  ok('restauration round-trip: bests identiques', () => assert.deepEqual(data.exerciseBests, original.exerciseBests));
  ok('restauration round-trip: settings restitués', () => assert.equal((settings as any).animationsEnabled, false));
}

na('écriture IndexedDB réelle (import dans le navigateur)');
na('téléchargement réel du fichier JSON');
na('reset réglages réel / données intactes (navigateur)');

console.log(`\n===== RÉSUMÉ =====`);
console.log(`${passed}/${passed + failed} PASS`);
