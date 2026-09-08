import assert from 'node:assert/strict';
import { WorkoutSession, PersonalRecord, Goal, ExercisePerformance } from '../src/types';
import { computeBadges, mostRecentlyUnlockedBadge, nextBadgeToUnlock, BadgeContext } from '../src/utilsBadges';

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

function session(id: string, date: string, opts?: { reps?: number; sets?: number; weight?: number; guided?: boolean; timerSec?: number; durationMin?: number }): WorkoutSession {
  const sets = opts?.sets ?? 1;
  const logSets = Array.from({ length: sets }, (_, i) => ({
    setNumber: i + 1,
    weightKg: opts?.weight ?? 0,
    reps: opts?.timerSec ? 0 : (opts?.reps ?? 8),
    mode: opts?.timerSec ? 'timer' as const : 'reps' as const,
    durationSec: opts?.timerSec,
    completed: true,
  }));
  return {
    id,
    title: `Séance ${id}`,
    date,
    startTime: '18:00',
    durationMinutes: opts?.durationMin ?? 30,
    completed: true,
    totalVolumeKg: opts?.timerSec ? 0 : (opts?.reps ?? 8) * (opts?.weight ?? 0) * sets,
    exercises: [{ exerciseId: 'e1', exerciseName: 'E1', muscleGroup: 'Pectoraux', sets: logSets }],
    guided: opts?.guided ?? false,
  };
}

function record(id: string, date: string): PersonalRecord {
  return { id, exerciseId: `ex-${id}`, exerciseName: `Exo ${id}`, weightKg: 80 + id.length, reps: 8, date };
}

function goal(id: string, completed: boolean): Goal {
  return {
    id,
    title: `Objectif ${id}`,
    category: 'custom',
    targetValue: completed ? 20 : 20,
    currentValue: completed ? 20 : 5,
    unit: 'séances',
    completed,
    createdAt: '2026-09-06',
    description: '',
  };
}

function badgeById(badges: ReturnType<typeof computeBadges>, id: string) {
  const b = badges.find((x) => x.id === id);
  assert.ok(b, `badge ${id} présent`);
  return b;
}

const emptyCtx = (ctx?: Partial<BadgeContext>): BadgeContext => ({
  sessions: [],
  records: [],
  exercisePerformances: [],
  goals: [],
  profile: { streakDays: 0, bestStreak: 0 },
  ...ctx,
});

// ---------------------------------------------------------------- BADGES -----

ok('aucune donnée -> tous les badges verrouillés, aucun débloqué', () => {
  const badges = computeBadges(emptyCtx());
  assert.equal(badges.length, 18);
  assert.equal(badges.filter((b) => b.unlocked).length, 0);
  assert.equal(badgeById(badges, 'first-session').progress?.current, 0);
  assert.equal(badgeById(badges, 'sessions-100').progress?.target, 100);
});

ok('1 session valide -> badge première séance débloqué avec date', () => {
  const badges = computeBadges(emptyCtx({ sessions: [session('s1', '2026-09-03')] }));
  const b = badgeById(badges, 'first-session');
  assert.equal(b.unlocked, true);
  assert.equal(b.unlockedAt, '2026-09-03');
});

ok('séance sans série validée ne compte pas', () => {
  const voidSession: WorkoutSession = {
    id: 'sv', title: 'Vide', date: '2026-09-04', startTime: '09:00', durationMinutes: 5, completed: true, totalVolumeKg: 0,
    exercises: [{ exerciseId: 'e1', exerciseName: 'E1', muscleGroup: 'Pectoraux', sets: [{ setNumber: 1, weightKg: 0, reps: 8, mode: 'reps', completed: false }] }],
  };
  const badges = computeBadges(emptyCtx({ sessions: [voidSession] }));
  assert.equal(badgeById(badges, 'first-session').unlocked, false);
});

ok('10 séances -> Régularité débloquée à la date de la 10e séance', () => {
  const sessions = Array.from({ length: 10 }, (_, i) => session(`s${i}`, `2026-08-${String(i + 1).padStart(2, '0')}`));
  const badges = computeBadges(emptyCtx({ sessions }));
  assert.equal(badgeById(badges, 'sessions-10').unlocked, true);
  assert.equal(badgeById(badges, 'sessions-10').unlockedAt, '2026-08-10');
  assert.equal(badgeById(badges, 'sessions-25').unlocked, false);
  assert.equal(badgeById(badges, 'sessions-25').progress?.current, 10);
});

ok('séance chronométrée (durée) compte comme set mais pas comme répétitions', () => {
  const badges = computeBadges(emptyCtx({ sessions: [session('t1', '2026-09-05', { timerSec: 45, sets: 3 })] }));
  assert.equal(badgeById(badges, 'first-session').unlocked, true);
  assert.equal(badgeById(badges, 'sets-100').progress?.current, 3);
  assert.equal(badgeById(badges, 'reps-1000').progress?.current, 0);
});

ok('1 séance guidée -> badge première séance guidée avec date', () => {
  const badges = computeBadges(emptyCtx({ sessions: [session('g1', '2026-09-02', { guided: true })] }));
  const b = badgeById(badges, 'first-guided');
  assert.equal(b.unlocked, true);
  assert.equal(b.unlockedAt, '2026-09-02');
});

ok('séance classique ne débloque pas le badge guidé', () => {
  const badges = computeBadges(emptyCtx({ sessions: [session('c1', '2026-09-02')] }));
  assert.equal(badgeById(badges, 'first-guided').unlocked, false);
});

ok('10 records -> Collectionneur débloqué à la date du 10e record', () => {
  const records = Array.from({ length: 10 }, (_, i) => record(`r${i}`, `2026-07-${String(i + 1).padStart(2, '0')}`));
  const badges = computeBadges(emptyCtx({ records }));
  assert.equal(badgeById(badges, 'records-10').unlocked, true);
  assert.equal(badgeById(badges, 'records-10').unlockedAt, '2026-07-10');
});

ok('streak 7+ (profil) -> Semaine parfaite débloquée', () => {
  const noStreak = computeBadges(emptyCtx());
  assert.equal(badgeById(noStreak, 'streak-7').unlocked, false);
  const badges = computeBadges(emptyCtx({ profile: { streakDays: 9, bestStreak: 2 } }));
  assert.equal(badgeById(badges, 'streak-7').unlocked, true);
  assert.equal(badgeById(badges, 'streak-30').unlocked, false);
  assert.equal(badgeById(badges, 'streak-30').progress?.current, 9);
});

ok('le meilleur streak historique compte aussi (badge stable)', () => {
  const viaBest = computeBadges(emptyCtx({ profile: { streakDays: 0, bestStreak: 31 } }));
  assert.equal(badgeById(viaBest, 'streak-30').unlocked, true);
});

ok('objectif atteint -> badge objectif débloqué (sans date forcée)', () => {
  const badges = computeBadges(emptyCtx({ goals: [goal('a', true), goal('b', false)] }));
  const b = badgeById(badges, 'first-goal');
  assert.equal(b.unlocked, true);
  assert.equal(badgeById(badges, 'first-goal').unlockedAt, undefined);
});

ok('séries/répétitions/volume accumulés depuis les sets validés', () => {
  const s = session('big', '2026-09-05', { sets: 3, reps: 12, weight: 20 });
  const badges = computeBadges(emptyCtx({ sessions: [s] }));
  assert.equal(badgeById(badges, 'sets-100').progress?.current, 3);
  assert.equal(badgeById(badges, 'reps-1000').progress?.current, 36);
  assert.equal(badgeById(badges, 'volume-10000').progress?.current, Math.round(12 * 20 * 3));
});

ok('patient du volume: 10000 kg atteints -> badge débloqué', () => {
  const heavy = session('big', '2026-09-05', { sets: 3, reps: 12, weight: 300 });
  const heavy2 = session('big2', '2026-09-06', { sets: 3, reps: 12, weight: 300 });
  const badges = computeBadges(emptyCtx({ sessions: [heavy, heavy2] }));
  assert.equal(badgeById(badges, 'volume-10000').unlocked, true);
});

ok('recalcul identique après ré-import (déterministe, pas de persistance)', () => {
  const ctx = emptyCtx({
    sessions: [session('s1', '2026-09-03'), session('s2', '2026-09-04', { guided: true })],
    records: [record('r1', '2026-09-03')],
    goals: [goal('g1', true)],
    profile: { streakDays: 8, bestStreak: 8 },
  });
  const a = computeBadges(ctx);
  const b = computeBadges(ctx);
  assert.deepEqual(a, b);
});

ok('mostRecentlyUnlockedBadge: retourne le plus récent débloqué', () => {
  const badges = computeBadges(emptyCtx({
    sessions: [session('s1', '2026-09-01'), session('s2', '2026-09-06'), session('s3', '2026-09-09')],
  }));
  const top = mostRecentlyUnlockedBadge(badges);
  assert.ok(top);
  assert.equal(top!.id, 'first-session');
  assert.equal(top!.unlockedAt, '2026-09-01');
});

ok('mostRecentlyUnlockedBadge: null sans aucun badge débloqué', () => {
  assert.equal(mostRecentlyUnlockedBadge(computeBadges(emptyCtx())), null);
});

ok('nextBadgeToUnlock: repère le badge dont la progression est la plus avancée', () => {
  const badges = computeBadges(emptyCtx({
    sessions: Array.from({ length: 10 }, (_, i) => session(`s${i}`, `2026-08-${String(i + 1).padStart(2, '0')}`)),
  }));
  const next = nextBadgeToUnlock(badges);
  assert.ok(next);
  assert.equal(next!.id, 'sessions-25'); // 10/25 : progression la plus avancée
  assert.equal(next!.progress?.current, 10);
  assert.equal(next!.progress?.target, 25);
});

ok('le badge de première séance n’apparaît jamais comme suivant une fois débloqué', () => {
  const badges = computeBadges(emptyCtx({ sessions: [session('s1', '2026-09-05')] }));
  assert.notEqual(nextBadgeToUnlock(badges)?.id, 'first-session');
});

ok('exercicePerformances n’influence pas le calcul actuel des badges', () => {
  const perf: ExercisePerformance = {
    id: 'p1', exerciseId: 'e1', exerciseName: 'E1', sessionId: 's1', sessionTitle: '', date: '2026-09-01', mode: 'reps', setsPlanned: 3, setsCompleted: 3, totalReps: 30, totalDurationSec: 0, totalVolumeKg: 0, weightUsedKg: 0, sets: [], bestSet: null,
  };
  const withPerf = computeBadges(emptyCtx({ exercisePerformances: [perf] }));
  const without = computeBadges(emptyCtx());
  assert.deepEqual(withPerf, without);
});

console.log(`\n${passed} passed, ${failed} failed`);