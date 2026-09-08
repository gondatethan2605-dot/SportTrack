import assert from 'node:assert/strict';
import { WorkoutSession, PersonalRecord } from '../src/types';
import {
  computeWeekKey,
  weekStartIso,
  weekEndIso,
  weekStart,
  computeChallengeProgress,
  settleWeeklyChallengeRewards,
  loadChallengeLedger,
  saveChallengeLedger,
  emptyChallengeLedger,
  claimedCreditForWeek,
  ChallengeLedger,
  CHALLENGE_LEDGER_KEY,
  WEEKLY_CHALLENGES,
} from '../src/utilsChallenges';

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

function session(id: string, date: string, opts?: { reps?: number; sets?: number; weight?: number; durationMin?: number }): WorkoutSession {
  const sets = opts?.sets ?? 1;
  const logSets = Array.from({ length: sets }, (_, i) => ({
    setNumber: i + 1,
    weightKg: opts?.weight ?? 0,
    reps: opts?.reps ?? 8,
    mode: 'reps' as const,
    completed: true,
  }));
  return {
    id,
    title: id,
    date,
    startTime: '18:00',
    durationMinutes: opts?.durationMin ?? 30,
    completed: true,
    totalVolumeKg: (opts?.reps ?? 8) * (opts?.weight ?? 0) * sets,
    exercises: [{ exerciseId: 'e1', exerciseName: 'E1', muscleGroup: 'Pectoraux', sets: logSets }],
  };
}

function record(id: string, date: string): PersonalRecord {
  return { id, exerciseId: 'e1', exerciseName: 'E1', weightKg: 80, reps: 8, date };
}

function stubStorage(): { store: Record<string, string>; storage: { getItem(k: string): string | null; setItem(k: string, v: string): void } } {
  const store: Record<string, string> = {};
  return { store, storage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } } };
}

const MON_2026_09_07 = new Date(2026, 8, 7); // 07/09/2026 = Monday
const WED_2026_09_09 = new Date(2026, 8, 9);
const SUN_2026_09_06 = new Date(2026, 8, 6); // Sunday before the Monday
const NEXT_MON = new Date(2026, 8, 14);

// ---------------------------------------------------------------- WEEK -----

ok('weekStartIso(Monday) = même jour', () => {
  assert.equal(weekStartIso(MON_2026_09_07), '2026-09-07');
});

ok('weekStartIso(mardi->dimanche) remonte au lundi', () => {
  const wed = new Date(2026, 8, 9);
  assert.equal(weekStartIso(wed), '2026-09-07');
  const sun = new Date(2026, 8, 13);
  assert.equal(weekStartIso(sun), '2026-09-07');
});

ok('weekEndIso(dimanche) = dimanche même semaine', () => {
  assert.equal(weekEndIso(WED_2026_09_09), '2026-09-13');
});

ok('weekEndIso(sunday before Monday) = dimanche du group previous', () => {
  assert.equal(weekEndIso(SUN_2026_09_06), '2026-09-06');
});

ok('weekStart returns a Monday (getDay() == 1)', () => {
  const d = weekStart(WED_2026_09_09);
  assert.equal(d.getDay(), 1);
});

ok('weekStart avoids mangling local time (00:00:00)', () => {
  const d = weekStart(WED_2026_09_09);
  assert.equal(d.getHours(), 0);
  assert.equal(d.getMinutes(), 0);
  assert.equal(d.getSeconds(), 0);
});

ok('computeWeekKey is deterministic across dates inside the same week', () => {
  assert.equal(computeWeekKey(MON_2026_09_07), computeWeekKey(WED_2026_09_09));
});

ok('computeWeekKey format YYYY-Www', () => {
  const k = computeWeekKey(MON_2026_09_07);
  assert.ok(/^\d{4}-W\d{2}$/.test(k), `clé: ${k}`);
});

ok('computeWeekKey differs when the week changes (lundi suivant)', () => {
  assert.notEqual(computeWeekKey(MON_2026_09_07), computeWeekKey(NEXT_MON));
});

ok('computeWeekKey(garde-default) renvoie une clé bien formée quand aucun argument', () => {
  const k = computeWeekKey();
  assert.ok(/^\d{4}-W\d{2}$/.test(k));
});

ok('début et fin de la semaine coïncident via weekStartIso / computeWeekKey', () => {
  const weekStart = weekStartIso(WED_2026_09_09);
  const weekEnd = weekEndIso(WED_2026_09_09);
  assert.equal(computeWeekKey(new Date(weekStart)), computeWeekKey(new Date(weekEnd)));
});

// ---------------------------------------------------------------- PROGRESS -----

ok('aucune session -> tous les compteurs à 0, aucun défi complété', () => {
  const p = computeChallengeProgress({ sessions: [], records: [], today: MON_2026_09_07 });
  assert.equal(p.length, 8);
  assert.equal(p.filter((c) => c.completed).length, 0);
  assert.ok(p.every((c) => c.current === 0));
});

ok('3 séances validées cette semaine -> défi 3 séances complété', () => {
  const sessions = [
    session('s1', '2026-09-07'),
    session('s2', '2026-09-07'),
    session('s3', '2026-09-07'),
  ];
  const p = computeChallengeProgress({ sessions, records: [], today: new Date(2026, 8, 7) });
  const t3 = p.find((c) => c.definition.id === 'wch-sessions-3')!;
  assert.equal(t3.completed, true);
  assert.equal(t3.current, 3);
  assert.equal(t3.percent, 100);
  const t5 = p.find((c) => c.definition.id === 'wch-sessions-5')!;
  assert.equal(t5.completed, false);
  assert.equal(t5.percent, 60);
});

ok('sessions hors semaine ne comptent pas', () => {
  const sessions = [session('hors', '2026-09-01')];
  const p = computeChallengeProgress({ sessions, records: [], today: MON_2026_09_07 });
  assert.ok(p.every((c) => c.current === 0));
});

ok('durée cumulée via durationMinutes en secondes convertis en minutes', () => {
  const sessions = [session('long', '2026-09-07', { durationMin: 120 })];
  const p = computeChallengeProgress({ sessions, records: [], today: MON_2026_09_07 });
  const dur = p.find((c) => c.definition.id === 'wch-duration-120')!;
  assert.equal(dur.completed, true);
  assert.equal(dur.current, 120);
});

ok('jour unique = 3 jours différents', () => {
  const sessions = [session('a', '2026-09-07'), session('b', '2026-09-07')];
  const p = computeChallengeProgress({ sessions, records: [], today: MON_2026_09_07 });
  const days = p.find((c) => c.definition.id === 'wch-days-3')!;
  assert.equal(days.current, 1);
  assert.equal(days.completed, false);
});

ok('répétitions cumulées: 1 session avec 2 sets x 10 reps = 20 reps', () => {
  const sessions = [session('s1', '2026-09-07', { sets: 2, reps: 10 })];
  const p = computeChallengeProgress({ sessions, records: [], today: MON_2026_09_07 });
  const reps500 = p.find((c) => c.definition.id === 'wch-reps-500')!;
  assert.equal(reps500.current, 20);
  assert.equal(reps500.percent, Math.round((20 / 500) * 100));
});

ok('record cette semaine compte dans les défis records', () => {
  const records = [record('r1', '2026-09-08'), record('r2', '2026-09-01')];
  const p = computeChallengeProgress({ sessions: [], records, today: MON_2026_09_07 });
  const r1 = p.find((c) => c.definition.id === 'wch-records-1')!;
  assert.equal(r1.current, 1);
  assert.equal(r1.completed, true);
  const r2 = p.find((c) => c.definition.id === 'wch-records-2')!;
  assert.equal(r2.current, 1);
  assert.equal(r2.completed, false);
});

ok('les défis ont tous un rewardXp > 0', () => {
  assert.ok(WEEKLY_CHALLENGES.every((c) => c.rewardXp > 0));
});

ok('all 5 kinds are represented', () => {
  const kinds = new Set(WEEKLY_CHALLENGES.map((c) => c.kind));
  assert.deepEqual(kinds, new Set(['sessions', 'reps', 'duration', 'records', 'uniqueDays']));
});

ok('percent est toujours entre 0 et 100 inclus', () => {
  const sessions = [
    session('a', '2026-09-07', { sets: 3, reps: 50 }),
    session('b', '2026-09-08', { sets: 3, reps: 50 }),
    session('c', '2026-09-09', { sets: 3, reps: 50 }),
    session('d', '2026-09-10', { sets: 3, reps: 50 }),
    session('e', '2026-09-11', { sets: 3, reps: 50 }),
  ];
  const p = computeChallengeProgress({ sessions, records: [], today: MON_2026_09_07 });
  for (const c of p) {
    assert.ok(c.percent >= 0 && c.percent <= 100, `percent ${c.definition.id} = ${c.percent}`);
  }
});

// ---------------------------------------------------------------- CLAIMS -----

ok('settle: récompense unique, pas de double attribution après re-settle', () => {
  const sessions = [session('s1', '2026-09-07'), session('s2', '2026-09-08'), session('s3', '2026-09-09')];
  const progress = computeChallengeProgress({ sessions, records: [], today: new Date(2026, 8, 7) });
  const ledger = emptyChallengeLedger();
  const wk = computeWeekKey(new Date(2026, 8, 7));
  const first = settleWeeklyChallengeRewards(progress, ledger, wk);
  const completedIds = progress.filter((c) => c.completed).map((c) => c.definition.id);
  assert.equal(completedIds.length, 2); // sessions-3 + days-3
  assert.equal(first.pending.length, 2);
  const total = first.pending.reduce((a, p) => a + p.xp, 0);
  assert.equal(total, 350);
  assert.equal(first.ledger.totalChallengeXpEarned, 350);
  for (const id of completedIds) assert.equal(first.ledger.weekClaims[id], true);
  const second = settleWeeklyChallengeRewards(progress, first.ledger, wk);
  assert.equal(second.pending.length, 0);
  assert.equal(second.ledger.totalChallengeXpEarned, 350);
});

ok('settle: nouveau semaine reset les claims mais pas le total', () => {
  const sessions = [session('s1', '2026-09-07'), session('s2', '2026-09-08'), session('s3', '2026-09-09')];
  const progress = computeChallengeProgress({ sessions, records: [], today: new Date(2026, 8, 7) });
  const wk = computeWeekKey(new Date(2026, 8, 7));
  let ledger = settleWeeklyChallengeRewards(progress, emptyChallengeLedger(), wk).ledger;
  assert.equal(ledger.totalChallengeXpEarned, 350);
  const newWk = computeWeekKey(new Date(2026, 8, 14));
  const second = settleWeeklyChallengeRewards(progress, ledger, newWk);
  assert.equal(second.pending.length, 2);
  assert.equal(second.ledger.totalChallengeXpEarned, 700);
  assert.equal(Object.keys(second.ledger.weekClaims).length, 2);
});

ok('settle: défi non complété n’est jamais claimé', () => {
  const sessions = [session('s1', '2026-09-07')];
  const progress = computeChallengeProgress({ sessions, records: [], today: MON_2026_09_07 });
  const wk = computeWeekKey(MON_2026_09_07);
  const result = settleWeeklyChallengeRewards(progress, emptyChallengeLedger(), wk);
  assert.equal(result.pending.length, 0);
  assert.equal(result.ledger.totalChallengeXpEarned, 0);
});

ok('claimedCreditForWeek somme les récompenses complétées', () => {
  const sessions = [session('s1', '2026-09-07'), session('s2', '2026-09-08'), session('s3', '2026-09-09')];
  const progress = computeChallengeProgress({ sessions, records: [], today: new Date(2026, 8, 7) });
  assert.equal(claimedCreditForWeek(progress, computeWeekKey(new Date(2026, 8, 7))), 350);
});

ok('claimedCreditForWeek = 0 sans aucune session', () => {
  const progress = computeChallengeProgress({ sessions: [], records: [], today: MON_2026_09_07 });
  assert.equal(claimedCreditForWeek(progress, computeWeekKey(MON_2026_09_07)), 0);
});

ok('load/save round-trip avec un stub localStorage', () => {
  const { store, storage } = stubStorage();
  const ledger: ChallengeLedger = { totalChallengeXpEarned: 1234, weekKey: '2026-W36', weekClaims: { 'wch-sessions-3': true }, updatedAt: '2026-09-06T12:00:00' };
  assert.equal(saveChallengeLedger(ledger, storage), true);
  assert.ok(store[CHALLENGE_LEDGER_KEY]);
  const loaded = loadChallengeLedger(storage);
  assert.equal(loaded.totalChallengeXpEarned, 1234);
  assert.equal(loaded.weekKey, '2026-W36');
  assert.equal(loaded.weekClaims['wch-sessions-3'], true);
});

ok('loadChallengeLedger: clé absente -> ledger vide', () => {
  const { storage } = stubStorage();
  const ledger = loadChallengeLedger(storage);
  assert.equal(ledger.totalChallengeXpEarned, 0);
  assert.equal(ledger.weekKey, '');
  assert.deepEqual(ledger.weekClaims, {});
});

ok('loadChallengeLedger: JSON corrompu -> fallback vide sans throw', () => {
  const store: Record<string, string> = { [CHALLENGE_LEDGER_KEY]: '{bad json!!' };
  const storage = { getItem: (k: string) => store[k] ?? null, setItem: () => {} };
  const ledger = loadChallengeLedger(storage);
  assert.equal(ledger.totalChallengeXpEarned, 0);
  assert.equal(ledger.weekKey, '');
});

ok('loadChallengeLedger: total négatif sanitisé à 0', () => {
  const store: Record<string, string> = { [CHALLENGE_LEDGER_KEY]: JSON.stringify({ totalChallengeXpEarned: -50, weekKey: '2026-W36', weekClaims: {} }) };
  const storage = { getItem: (k: string) => store[k] ?? null, setItem: () => {} };
  const ledger = loadChallengeLedger(storage);
  assert.equal(ledger.totalChallengeXpEarned, 0);
});

ok('loadChallengeLedger avec null storage -> ledger vide', () => {
  const ledger = loadChallengeLedger(null);
  assert.equal(ledger.totalChallengeXpEarned, 0);
});

ok('settle ne modifie pas l’objet ledger passé en entrée (immuabilité)', () => {
  const sessions = [session('s1', '2026-09-07'), session('s2', '2026-09-08'), session('s3', '2026-09-09')];
  const progress = computeChallengeProgress({ sessions, records: [], today: MON_2026_09_07 });
  const wk = computeWeekKey(MON_2026_09_07);
  const original = emptyChallengeLedger();
  settleWeeklyChallengeRewards(progress, original, wk);
  assert.equal(original.totalChallengeXpEarned, 0);
  assert.deepEqual(original.weekClaims, {});
});

console.log(`\n${passed} passed, ${failed} failed`);