import assert from 'node:assert/strict';
import {
  WorkoutProgram,
  WorkoutProgramDay,
  Goal,
  WorkoutSession,
  UserProfile,
  PersonalRecord,
  ExercisePerformance,
  ExerciseBest,
  BodyMeasurement,
} from '../src/types';
import {
  getNextProgramDay,
  getActiveDashboardGoals,
  getWeeklyQuickStats,
  getLastActivity,
  getWarmUpHint,
  buildHomeGoalContext,
  homeGoalValueText,
} from '../src/utilsHome';

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

const todayStr = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const profile: UserProfile = {
  name: 'Test',
  level: 2,
  currentXp: 100,
  nextLevelXp: 500,
  streakDays: 3,
  bestStreak: 5,
  weeklyTargetSessions: 3,
  weeklyCompletedSessions: 1,
  totalWorkouts: 5,
  totalVolumeKg: 1200,
  joinedDate: '2026-01-01',
};

const day = (over: Partial<WorkoutProgramDay> & { id: string; name: string }): WorkoutProgramDay => ({
  dayOfWeek: 'Lundi',
  muscleGroups: ['Pectoraux'],
  exerciseIds: [],
  ...over,
});

// A rich day: 2 configs (3 sets each) on exerciseIds and configs, plus a legacy id.
const richDay: WorkoutProgramDay = {
  id: 'd1',
  name: 'Jour 1',
  dayOfWeek: 'Lundi',
  muscleGroups: ['Pectoraux', 'Dos'],
  exerciseIds: ['ex-a', 'ex-b'],
  exercises: [
    { id: 'c1', exerciseId: 'ex-a', exerciseName: 'Pompes', sets: 3, reps: 10, restSec: 60, targetWeightKg: 0 },
    { id: 'c2', exerciseId: 'ex-b', exerciseName: 'Rowing', sets: 4, reps: 8, restSec: 90, targetWeightKg: 20 },
  ],
};

const program = (days: WorkoutProgramDay[]): WorkoutProgram => ({
  id: 'p1',
  title: 'Full Body',
  description: '',
  daysPerWeek: 3,
  level: 'Intermédiaire',
  isActive: true,
  color: 'violet',
  days,
});

// ------------------------- Next session selection -------------------------

ok('selectNextProgramDay: no program -> null', () => {
  assert.equal(getNextProgramDay(undefined, new Date('2026-09-01')), null);
});

ok('selectNextProgramDay: program with no days -> null', () => {
  assert.equal(getNextProgramDay(program([]), new Date('2026-09-01')), null);
});

ok('selectNextProgramDay: picks today planned day when scheduled', () => {
  // 2026-09-07 is a Monday
  const prog = program([day({ id: 'd1', name: 'Jour 1', dayOfWeek: 'Lundi' }), day({ id: 'd2', name: 'Jour 2', dayOfWeek: 'Mercredi' })]);
  const next = getNextProgramDay(prog, new Date('2026-09-07T10:00:00'));
  assert.ok(next);
  assert.equal(next.name, 'Jour 1');
});

ok('selectNextProgramDay: falls back to first day when no schedule matches', () => {
  const prog = program([day({ id: 'd1', name: 'A', dayOfWeek: 'Lundi' })]);
  const next = getNextProgramDay(prog, new Date('2026-09-09T10:00:00')); // Wednesday
  assert.ok(next);
  assert.equal(next.name, 'A');
});

ok('selectNextProgramDay: exercise count distinct (no double count via ids+configs)', () => {
  const next = getNextProgramDay(program([richDay]), new Date('2026-09-07'));
  assert.ok(next);
  assert.equal(next.exerciseCount, 2); // ex-a & ex-b once each
});

ok('selectNextProgramDay: set count from configs (3+4=7)', () => {
  const next = getNextProgramDay(program([richDay]), new Date('2026-09-07'));
  assert.ok(next);
  assert.equal(next.setCount, 7);
});

ok('selectNextProgramDay: duration minutes >= 1 when exercises exist', () => {
  const next = getNextProgramDay(program([richDay]), new Date('2026-09-07'));
  assert.ok(next);
  assert.ok(next.durationMin >= 1);
  assert.ok(next.durationSec > 0);
});

// Program day with exerciseIds only (legacy format), duplicate IDs. The
// exercise counter de-duplicates (getDayExerciseCount), and the set counter
// reuses getDayTotalSets unchanged (per exerciseIds element) — BOTH are the
// already-locked helpers, reused as-is per the LOT G spec.
ok('selectNextProgramDay: exerciseIds only, duplicates de-duplicated for count', () => {
  const legacy: WorkoutProgramDay = {
    id: 'dL',
    name: 'Jour L',
    dayOfWeek: 'Lundi',
    muscleGroups: ['Dos'],
    exerciseIds: ['x', 'x', 'y'],
  };
  const next = getNextProgramDay(program([legacy]), new Date('2026-09-07'));
  assert.ok(next);
  assert.equal(next.exerciseCount, 2); // x, y (dedup via getDayExerciseCount)
  assert.equal(next.setCount, 9); // getDayTotalSets reused as-is (3 entries * LEGACY 3)
});

// program with configs only (no exerciseIds).
ok('selectNextProgramDay: configs only (no exerciseIds)', () => {
  const cfgOnly: WorkoutProgramDay = {
    id: 'dC',
    name: 'Jour C',
    dayOfWeek: 'Lundi',
    muscleGroups: ['Bras'],
    exerciseIds: [],
    exercises: [
      { id: 'c1', exerciseId: 'e1', exerciseName: 'A', sets: 2, reps: 10, restSec: 60, targetWeightKg: 0 },
    ],
  };
  const next = getNextProgramDay(program([cfgOnly]), new Date('2026-09-07'));
  assert.ok(next);
  assert.equal(next.exerciseCount, 1);
  assert.equal(next.setCount, 2);
});

// ------------------------- Active goals -------------------------

const goalCtx = buildHomeGoalContext({
  sessions: [],
  profile,
  records: [],
  exercisePerformances: [],
  exerciseBests: [],
  measurements: [],
});

const makeGoal = (partial: Partial<Goal> & { title: string }): Goal => ({
  id: 'g' + Math.random().toString(36).slice(2),
  category: 'custom',
  targetValue: 100,
  currentValue: 50,
  unit: '',
  completed: false,
  createdAt: todayStr(),
  direction: 'gain',
  initialValue: 0,
  ...partial,
});

ok('activeGoals: empty goals -> []', () => {
  assert.deepEqual(getActiveDashboardGoals([], goalCtx, new Date(), 3), []);
});

ok('activeGoals: only active goals returned (max 3)', () => {
  const active = makeGoal({ title: 'A', goalMetric: 'custom', targetValue: 10, initialValue: 0, currentValue: 5 });
  const achieved = makeGoal({ title: 'B', goalMetric: 'custom', targetValue: 10, initialValue: 0, currentValue: 10 });
  const expired = makeGoal({ title: 'C', goalMetric: 'custom', targetValue: 10, initialValue: 0, currentValue: 2, deadline: '2020-01-01' });
  const goals = getActiveDashboardGoals([active, achieved, expired], goalCtx, new Date(), 3);
  assert.equal(goals.length, 1);
  assert.equal(goals[0].status, 'Actif');
  assert.equal(goals[0].goal.title, 'A');
});

ok('activeGoals: achieved goal excluded', () => {
  const achieved = makeGoal({ title: 'Atteint', goalMetric: 'custom', targetValue: 10, initialValue: 0, currentValue: 10 });
  assert.equal(getActiveDashboardGoals([achieved], goalCtx, new Date(), 3).length, 0);
});

ok('activeGoals: expired goal excluded', () => {
  const expired = makeGoal({ title: 'Expiré', goalMetric: 'custom', targetValue: 10, initialValue: 0, currentValue: 2, deadline: '2020-01-01' });
  assert.equal(getActiveDashboardGoals([expired], goalCtx, new Date(), 3).length, 0);
});

ok('activeGoals: limit caps to 3', () => {
  const goals = [1, 2, 3, 4].map((n) => makeGoal({ title: 'G' + n, goalMetric: 'custom', targetValue: 10, initialValue: 0, currentValue: 1 }));
  assert.equal(getActiveDashboardGoals(goals, goalCtx, new Date(), 3).length, 3);
});

ok('activeGoals: current + target + percent present', () => {
  const g = makeGoal({ title: 'Pompes', goalMetric: 'reps', targetValue: 30, initialValue: 10, currentValue: 25 });
  const out = getActiveDashboardGoals([g], goalCtx, new Date(), 3)[0];
  assert.equal(out.target, 30);
  assert.equal(out.percent, 75);
});

// reps goal derives current from best exercise performance (real data).
ok('activeGoals: reps goal derives current from real best', () => {
  const perfs: ExercisePerformance[] = [{
    id: 'p1', exerciseId: 'e1', exerciseName: 'Pompes', sessionId: 's1', sessionTitle: 'S1', date: '2026-09-01', mode: 'reps',
    setsPlanned: 1, setsCompleted: 1, totalReps: 20, totalDurationSec: 0, totalVolumeKg: 0, weightUsedKg: 0,
    sets: [], bestSet: null,
  }];
  const bests: ExerciseBest[] = [{ exerciseId: 'e1', exerciseName: 'Pompes', bestWeightKg: null, bestReps: { value: 20, date: '2026-09-01' }, bestVolumeKg: null, bestDurationSec: null, lastPerformedDate: '2026-09-01', timesPerformed: 1, updatedAt: '2026-09-01T00:00:00' }];
  const ctx = buildHomeGoalContext({ sessions: [], profile, records: [], exercisePerformances: perfs, exerciseBests: bests, measurements: [] });
  const g = makeGoal({ title: 'Pompes 30', goalMetric: 'reps', exerciseId: 'e1', targetValue: 30, initialValue: 10, currentValue: 10 });
  const out = getActiveDashboardGoals([g], ctx, new Date(), 3)[0];
  assert.equal(out.current, 20);
  assert.equal(out.percent, 50); // (20-10)/(30-10)
});

ok('activeGoals: duration stays in seconds, never reps', () => {
  const perfs: ExercisePerformance[] = [{
    id: 'p1', exerciseId: 'e1', exerciseName: 'Planche', sessionId: 's1', sessionTitle: 'S1', date: '2026-09-01', mode: 'timer',
    setsPlanned: 1, setsCompleted: 1, totalReps: 0, totalDurationSec: 45, totalVolumeKg: 0, weightUsedKg: 0,
    sets: [], bestSet: null,
  }];
  const ctx = buildHomeGoalContext({ sessions: [], profile, records: [], exercisePerformances: perfs, exerciseBests: [], measurements: [] });
  const g = makeGoal({ title: 'Planche 60', goalMetric: 'duration', exerciseId: 'e1', targetValue: 60, initialValue: 30, currentValue: 30 });
  const out = getActiveDashboardGoals([g], ctx, new Date(), 3)[0];
  assert.equal(out.current, 45); // seconds, not 0 reps
  assert.equal(homeGoalValueText(g, out.current), '45 sec');
});

// ------------------------- Weekly quick stats -------------------------

const session = (id: string, date: string, repsSets: number, timerSets: number): WorkoutSession => ({
  id,
  title: 'S' + id,
  date,
  startTime: '18:00',
  durationMinutes: 30,
  completed: true,
  totalVolumeKg: 0,
  exercises: [
    { exerciseId: 'e1', exerciseName: 'Pompes', muscleGroup: 'Pectoraux', sets: Array.from({ length: repsSets }, () => ({ setNumber: 1, weightKg: 0, reps: 10, completed: true })) },
    { exerciseId: 'e2', exerciseName: 'Planche', muscleGroup: 'Abdos', sets: Array.from({ length: timerSets }, () => ({ setNumber: 1, weightKg: 0, reps: 0, mode: 'timer', durationSec: 45, completed: true })) },
  ],
});

ok('quickStats: time-based reps never counted as rep (timer excluded from reps)', () => {
  const s = session('s1', todayStr(), 2, 2); // 2 reps sets (20 reps) + 2 timer sets
  const stats = getWeeklyQuickStats([s], 'week', new Date());
  assert.equal(stats.sessions, 1);
  assert.equal(stats.validatedSets, 4);
  assert.equal(stats.repCount, 20); // timers not converted
  assert.equal(stats.timerSetCount, 2);
  assert.equal(stats.uniqueExercises, 2);
});

ok('quickStats: duplicate exercise in one session is not double counted (uniqueExercises=1)', () => {
  const oneEx: WorkoutSession = {
    id: 'sX', title: 'SX', date: todayStr(), startTime: '18:00', durationMinutes: 30, completed: true, totalVolumeKg: 0,
    exercises: [
      { exerciseId: 'ee', exerciseName: 'Biceps', muscleGroup: 'Bras', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }] },
      { exerciseId: 'ee', exerciseName: 'Biceps', muscleGroup: 'Bras', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }] },
    ],
  };
  const stats = getWeeklyQuickStats([oneEx], 'week', new Date());
  assert.equal(stats.uniqueExercises, 1);
  assert.equal(stats.validatedSets, 2);
});

ok('quickStats: no NaN / Infinity', () => {
  const stats = getWeeklyQuickStats([session('s1', todayStr(), 2, 1)], 'week', new Date());
  for (const v of [stats.sessions, stats.validatedSets, stats.repCount, stats.timerSetCount, stats.uniqueExercises, stats.stretchCount, stats.durationMinutes]) {
    assert.ok(Number.isFinite(v), `not finite: ${v}`);
    assert.ok(v >= 0, `negative: ${v}`);
  }
});

ok('quickStats: zero stats for no sessions', () => {
  const stats = getWeeklyQuickStats([], 'week', new Date());
  assert.equal(stats.sessions, 0);
  assert.equal(stats.validatedSets, 0);
  assert.equal(stats.repCount, 0);
  assert.equal(stats.uniqueExercises, 0);
});

// ------------------------- Last activity -------------------------

ok('lastActivity: none when no sessions', () => {
  assert.equal(getLastActivity([]), null);
});

ok('lastActivity: most recent session, distinct exercises', () => {
  const oldS = session('s1', todayStr(-3), 1, 0);
  const newS: WorkoutSession = {
    ...session('s2', todayStr(), 1, 0), title: 'Nouvelle', exercises: [
      { exerciseId: 'e1', exerciseName: 'Pompes', muscleGroup: 'Pectoraux', sets: [{ setNumber: 1, weightKg: 0, reps: 5, completed: true }] },
      { exerciseId: 'e2', exerciseName: 'Planche', muscleGroup: 'Abdos', sets: [{ setNumber: 1, weightKg: 0, reps: 0, mode: 'timer', durationSec: 30, completed: true }] },
    ],
  };
  const act = getLastActivity([oldS, newS]);
  assert.ok(act);
  assert.equal(act.title, 'Nouvelle');
  assert.equal(act.exerciseCount, 2);
  assert.deepEqual(act.exerciseNames, ['Pompes', 'Planche']);
});

// ------------------------- Warm-up -------------------------

ok('warmUp: presentational hint provided', () => {
  const w = getWarmUpHint();
  assert.equal(typeof w.minutes, 'string');
  assert.match(w.minutes, /3–5|3-5/);
});

console.log(`\n${passed} tests PASS, ${failed} FAIL`);
if (failed > 0) process.exitCode = 1;
