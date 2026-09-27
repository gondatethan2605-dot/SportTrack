import assert from 'node:assert/strict';
import { WorkoutSession } from '../src/types';
import {
  startOfWeek,
  startOfMonth,
  periodStartDate,
  filterSessionsByPeriod,
  isValidCompletedSet,
  computePeriodStats,
  computeExercisePopularity,
  emptyPeriodStats,
  computeSessionsPerWeek,
  computeSessionsPerMonth,
  countSessionsThisWeek,
  countSessionsThisMonth,
  comparePeriodStats,
  evolutionPercent,
  classifyExerciseTrends,
  computeYearlyVolumeTrend,
} from '../src/utilsStats';
import { buildSessionPerformances } from '../src/utilsProgression';

// ---------------------------------------------------------------- helpers -----
function session(
  id: string,
  date: string,
  exercises: { exerciseId: string; exerciseName: string; sets: { setNumber: number; weightKg: number; reps: number; mode?: 'reps' | 'timer'; durationSec?: number; completed: boolean }[]; muscleGroup?: string }[],
  opts?: { stretchesCount?: number; durationMinutes?: number; totalVolumeKg?: number }
): WorkoutSession {
  return {
    id,
    title: `Séance ${id}`,
    date,
    startTime: '18:00',
    durationMinutes: opts?.durationMinutes ?? 30,
    completed: true,
    totalVolumeKg: opts?.totalVolumeKg ?? 0,
    exercises: exercises.map((e) => ({
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      muscleGroup: e.muscleGroup || 'Pectoraux',
      sets: e.sets,
    })),
    stretchesCount: opts?.stretchesCount ?? 0,
  };
}

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

// ---------------------------------------------------------------- TESTS -----

// --- startOfWeek / startOfMonth ---
ok('startOfWeek returns Monday', () => {
  // Wed 2026-09-02 -> Monday 2026-08-31
  const result = startOfWeek(new Date(2026, 8, 2));
  assert.equal(result, '2026-08-31');
});

ok('startOfWeek on Monday returns same day', () => {
  const result = startOfWeek(new Date(2026, 8, 7)); // Monday 2026-09-07
  assert.equal(result, '2026-09-07');
});

ok('startOfWeek on Sunday returns previous Monday', () => {
  const result = startOfWeek(new Date(2026, 8, 6)); // Sunday 2026-09-06
  assert.equal(result, '2026-08-31');
});

ok('startOfMonth returns 1st of month', () => {
  const result = startOfMonth(new Date(2026, 8, 15));
  assert.equal(result, '2026-09-01');
});

ok('startOfMonth January', () => {
  const result = startOfMonth(new Date(2027, 0, 25));
  assert.equal(result, '2027-01-01');
});

// --- periodStartDate ---
ok('periodStartDate week -> Monday', () => {
  const result = periodStartDate('week', new Date(2026, 8, 2));
  assert.equal(result, '2026-08-31');
});

ok('periodStartDate month -> 1st', () => {
  const result = periodStartDate('month', new Date(2026, 8, 15));
  assert.equal(result, '2026-09-01');
});

ok('periodStartDate global -> null', () => {
  assert.equal(periodStartDate('global', new Date()), null);
});

// --- filterSessionsByPeriod ---
ok('filterSessionsByPeriod global returns all', () => {
  const s = [
    session('s1', '2025-01-01', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [] }]),
    session('s2', '2026-09-01', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [] }]),
  ];
  assert.equal(filterSessionsByPeriod(s, 'global').length, 2);
});

ok('filterSessionsByPeriod week filters', () => {
  const s = [
    session('s1', '2026-09-07', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [] }]), // Monday
    session('s2', '2026-08-30', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [] }]), // previous Saturday
  ];
  // Mon 2026-09-07 is in the week of 2026-09-07..2026-09-13
  const result = filterSessionsByPeriod(s, 'week', new Date(2026, 8, 9));
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 's1');
});

// --- isValidCompletedSet ---
ok('isValidCompletedSet: reps completed > 0 -> true', () => {
  assert.equal(isValidCompletedSet({ completed: true, mode: 'reps', reps: 10, durationSec: 0 }), true);
});

ok('isValidCompletedSet: reps completed = 0 -> false', () => {
  assert.equal(isValidCompletedSet({ completed: true, mode: 'reps', reps: 0, durationSec: 0 }), false);
});

ok('isValidCompletedSet: timer completed + duration > 0 -> true', () => {
  assert.equal(isValidCompletedSet({ completed: true, mode: 'timer', reps: 0, durationSec: 45 }), true);
});

ok('isValidCompletedSet: timer completed + duration = 0 -> false', () => {
  assert.equal(isValidCompletedSet({ completed: true, mode: 'timer', reps: 0, durationSec: 0 }), false);
});

ok('isValidCompletedSet: not completed -> false', () => {
  assert.equal(isValidCompletedSet({ completed: false, mode: 'reps', reps: 10 }), false);
});

ok('isValidCompletedSet: undefined mode treated as reps', () => {
  assert.equal(isValidCompletedSet({ completed: true, reps: 10 }), true);
});

ok('isValidCompletedSet: undefined mode + 0 reps -> false', () => {
  assert.equal(isValidCompletedSet({ completed: true, reps: 0 }), false);
});

// --- computePeriodStats ---
ok('0 sessions -> all zeros', () => {
  const stats = computePeriodStats([]);
  assert.deepEqual(stats, emptyPeriodStats());
});

ok('1 session, 2 reps sets -> validatedSets=2, repCount=24, timerSetCount=0', () => {
  const s = session('s1', '2026-01-01', [{
    exerciseId: 'e1', exerciseName: 'Push', muscleGroup: 'Pectoraux',
    sets: [
      { setNumber: 1, weightKg: 0, reps: 10, completed: true },
      { setNumber: 2, weightKg: 0, reps: 14, completed: true },
    ],
  }]);
  const stats = computePeriodStats([s]);
  assert.equal(stats.sessions, 1);
  assert.equal(stats.validatedSets, 2);
  assert.equal(stats.repCount, 24);
  assert.equal(stats.timerSetCount, 0);
  assert.equal(stats.uniqueExercises, 1);
});

ok('timer set counted in timerSetCount, NOT in repCount', () => {
  const s = session('s1', '2026-01-01', [{
    exerciseId: 'e1', exerciseName: 'Plank', muscleGroup: 'Core',
    sets: [
      { setNumber: 1, weightKg: 0, reps: 0, mode: 'timer', durationSec: 45, completed: true },
      { setNumber: 2, weightKg: 0, reps: 0, mode: 'timer', durationSec: 30, completed: true },
    ],
  }]);
  const stats = computePeriodStats([s]);
  assert.equal(stats.validatedSets, 2);
  assert.equal(stats.timerSetCount, 2);
  assert.equal(stats.repCount, 0); // timer sets never add reps
});

ok('mixed reps and timer in same session', () => {
  const s = session('s1', '2026-01-01', [
    {
      exerciseId: 'e1', exerciseName: 'Push', muscleGroup: 'Pectoraux',
      sets: [{ setNumber: 1, weightKg: 0, reps: 12, completed: true }],
    },
    {
      exerciseId: 'e2', exerciseName: 'Plank', muscleGroup: 'Core',
      sets: [{ setNumber: 1, weightKg: 0, reps: 0, mode: 'timer', durationSec: 60, completed: true }],
    },
  ]);
  const stats = computePeriodStats([s]);
  assert.equal(stats.validatedSets, 2);
  assert.equal(stats.repCount, 12);
  assert.equal(stats.timerSetCount, 1);
  assert.equal(stats.uniqueExercises, 2);
});

ok('multiple sessions -> no double counting exercises', () => {
  const s1 = session('s1', '2026-01-01', [{
    exerciseId: 'e1', exerciseName: 'Push', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }],
  }]);
  const s2 = session('s2', '2026-01-02', [{
    exerciseId: 'e1', exerciseName: 'Push', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }],
  }]);
  const stats = computePeriodStats([s1, s2]);
  assert.equal(stats.uniqueExercises, 1); // same exercise -> still 1 unique
  assert.equal(stats.sessions, 2);
  assert.equal(stats.validatedSets, 2);
  assert.equal(stats.repCount, 20);
});

ok('stretches counted correctly', () => {
  const s1 = session('s1', '2026-01-01', [], { stretchesCount: 3 });
  const s2 = session('s2', '2026-01-02', [], { stretchesCount: 5 });
  const stats = computePeriodStats([s1, s2]);
  assert.equal(stats.stretchCount, 8);
});

ok('stretchesCount undefined treated as 0', () => {
  const s = session('s1', '2026-01-01', []);
  delete (s as any).stretchesCount;
  const stats = computePeriodStats([s]);
  assert.equal(stats.stretchCount, 0);
});

ok('durationMinutes summed', () => {
  const s1 = session('s1', '2026-01-01', [], { durationMinutes: 30 });
  const s2 = session('s2', '2026-01-02', [], { durationMinutes: 45 });
  const stats = computePeriodStats([s1, s2]);
  assert.equal(stats.durationMinutes, 75);
});

ok('uncompleted sets excluded', () => {
  const s = session('s1', '2026-01-01', [{
    exerciseId: 'e1', exerciseName: 'Push', sets: [
      { setNumber: 1, weightKg: 0, reps: 10, completed: true },
      { setNumber: 2, weightKg: 0, reps: 12, completed: false },
    ],
  }]);
  const stats = computePeriodStats([s]);
  assert.equal(stats.validatedSets, 1);
  assert.equal(stats.repCount, 10);
});

ok('many exercises in one session -> uniqueExercises counts all distinct', () => {
  const s = session('s1', '2026-01-01', [
    { exerciseId: 'e1', exerciseName: 'A', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }] },
    { exerciseId: 'e2', exerciseName: 'B', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }] },
    { exerciseId: 'e3', exerciseName: 'C', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }] },
    { exerciseId: 'e4', exerciseName: 'D', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }] },
  ]);
  const stats = computePeriodStats([s]);
  assert.equal(stats.uniqueExercises, 4);
  assert.equal(stats.sessions, 1);
});

// --- computeExercisePopularity ---
ok('popularity: 2 exercises, one in 2 sessions', () => {
  const s1 = session('s1', '2026-01-01', [{
    exerciseId: 'e1', exerciseName: 'Push', sets: [
      { setNumber: 1, weightKg: 0, reps: 10, completed: true },
      { setNumber: 2, weightKg: 0, reps: 10, completed: true },
    ],
  }]);
  const s2 = session('s2', '2026-01-02', [{
    exerciseId: 'e1', exerciseName: 'Push', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }],
  }, {
    exerciseId: 'e2', exerciseName: 'Pull', sets: [{ setNumber: 1, weightKg: 0, reps: 8, completed: true }],
  }]);
  const pop = computeExercisePopularity([s1, s2]);
  assert.equal(pop.length, 2);
  assert.equal(pop[0].exerciseId, 'e1'); // most sessions
  assert.equal(pop[0].sessionCount, 2);
  assert.equal(pop[0].validatedSetCount, 3);
  assert.equal(pop[1].exerciseId, 'e2');
  assert.equal(pop[1].sessionCount, 1);
  assert.equal(pop[1].validatedSetCount, 1);
});

ok('popularity: empty sessions -> empty array', () => {
  assert.deepEqual(computeExercisePopularity([]), []);
});

ok('popularity: ties broken by name', () => {
  const s1 = session('s1', '2026-01-01', [
    { exerciseId: 'e1', exerciseName: 'Zebra', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }] },
    { exerciseId: 'e2', exerciseName: 'Apple', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }] },
  ]);
  const pop = computeExercisePopularity([s1]);
  // Both have sessionCount=1, validatedSetCount=1; alphabetical: Apple first
  assert.equal(pop[0].name, 'Apple');
  assert.equal(pop[1].name, 'Zebra');
});

ok('chronology: multiple weeks/months data', () => {
  const s1 = session('s1', '2026-07-01', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }] }]);
  const s2 = session('s2', '2026-09-10', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [{ setNumber: 1, weightKg: 0, reps: 12, completed: true }] }]);
  // Week filter on Sep 9 2026 (week starts Mon 2026-09-07, ends Sun 2026-09-13)
  // s2 is Sep 10 -> in the week; s1 is Jul 1 -> not in the week
  const weekSessions = filterSessionsByPeriod([s1, s2], 'week', new Date(2026, 8, 9));
  assert.equal(weekSessions.length, 1);
  assert.equal(weekSessions[0].id, 's2');
  // Month filter Sep 2026 -> s2 is Sep 10 -> included; s1 is Jul 1 -> excluded
  const monthSessions = filterSessionsByPeriod([s1, s2], 'month', new Date(2026, 8, 15));
  assert.equal(monthSessions.length, 1);
  assert.equal(monthSessions[0].id, 's2');
  // Global -> both included
  const allSessions = filterSessionsByPeriod([s1, s2], 'global');
  assert.equal(allSessions.length, 2);
});

// --- computeSessionsPerWeek / computeSessionsPerMonth ---
ok('computeSessionsPerWeek: 3 sessions across 2 active weeks -> 1.5', () => {
  const s1 = session('a', '2026-09-07', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }] }]); // Mon
  const s2 = session('b', '2026-09-08', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }] }]); // same week
  const s3 = session('c', '2026-09-15', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }] }]); // next week
  assert.equal(computeSessionsPerWeek([s1, s2, s3]), 1.5);
});

ok('computeSessionsPerWeek: empty -> 0', () => {
  assert.equal(computeSessionsPerWeek([]), 0);
});

ok('computeSessionsPerWeek: incomplete dates ignored', () => {
  const s1 = session('a', '2026-09-07', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [] }]);
  const bad = session('b', 'not-a-date', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [] }]);
  assert.equal(computeSessionsPerWeek([s1, bad]), 1);
});

ok('computeSessionsPerMonth: 3 sessions across 2 months -> 1.5', () => {
  const s1 = session('a', '2026-01-05', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [] }]);
  const s2 = session('b', '2026-01-20', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [] }]);
  const s3 = session('c', '2026-02-10', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [] }]);
  assert.equal(computeSessionsPerMonth([s1, s2, s3]), 1.5);
});

// --- countSessionsThisWeek / countSessionsThisMonth ---
ok('countSessionsThisWeek uses the current calendar week (Mon start)', () => {
  const now = new Date(2026, 8, 9); // Wed 2026-09-09 -> week 09-07..09-13
  const inWeek = session('a', '2026-09-07', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [] }]);
  const before = session('b', '2026-09-06', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [] }]); // Sunday, previous week
  assert.equal(countSessionsThisWeek([inWeek, before], now), 1);
});

ok('countSessionsThisMonth uses the current calendar month', () => {
  const now = new Date(2026, 8, 15); // Sep 2026
  const inMonth = session('a', '2026-09-10', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [] }]);
  const before = session('b', '2026-08-31', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [] }]);
  assert.equal(countSessionsThisMonth([inMonth, before], now), 1);
});

// --- comparePeriodStats ---
ok('comparePeriodStats week: current vs previous 7-day window', () => {
  const now = new Date(2026, 8, 9); // week 09-07..09-13, previous 08-31..09-06
  const cur = session('c1', '2026-09-08', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }] }], { durationMinutes: 30 });
  const prev = session('p1', '2026-09-01', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }] }], { durationMinutes: 45 });
  const older = session('o1', '2026-08-20', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [] }]);
  const cmp = comparePeriodStats([cur, prev, older], 'week', now);
  if (!cmp) throw new Error('expected a comparison object');
  assert.equal(cmp.current.sessions, 1);
  assert.equal(cmp.previous.sessions, 1);
  assert.equal(cmp.hasPrevious, true);
  assert.equal(cmp.current.durationMinutes, 30);
  assert.equal(cmp.previous.durationMinutes, 45);
});

ok('comparePeriodStats month: current vs previous month boundaries', () => {
  const now = new Date(2026, 8, 15); // Sep 2026, previous = Aug 2026
  const cur = session('c1', '2026-09-10', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }] }]);
  const prev = session('p1', '2026-08-05', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }] }]);
  const older = session('o1', '2026-07-20', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [] }]);
  const cmp = comparePeriodStats([cur, prev, older], 'month', now);
  if (!cmp) throw new Error('expected a comparison object');
  assert.equal(cmp.current.sessions, 1);
  assert.equal(cmp.previous.sessions, 1);
  assert.equal(cmp.hasPrevious, true);
});

ok('comparePeriodStats month: previous session on last day of previous month is included', () => {
  const now = new Date(2026, 8, 15); // Sep 2026
  const prev = session('p1', '2026-08-31', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [] }]);
  const cmp = comparePeriodStats([prev], 'month', now);
  if (!cmp) throw new Error('expected a comparison object');
  assert.equal(cmp.previous.sessions, 1);
  assert.equal(cmp.hasPrevious, true);
});

ok('comparePeriodStats week: hasPrevious false when no previous session', () => {
  const now = new Date(2026, 8, 9);
  const cur = session('c1', '2026-09-08', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [] }]);
  const cmp = comparePeriodStats([cur], 'week', now);
  if (!cmp) throw new Error('expected a comparison object');
  assert.equal(cmp.hasPrevious, false);
  assert.equal(cmp.current.sessions, 1);
  assert.equal(cmp.previous.sessions, 0);
});

ok('comparePeriodStats global -> null', () => {
  assert.equal(comparePeriodStats([], 'global'), null);
});

// --- evolutionPercent ---
ok('evolutionPercent guards against division by zero and non-finite', () => {
  assert.equal(evolutionPercent(10, 0), null);
  assert.equal(evolutionPercent(NaN, 10), null);
  assert.equal(evolutionPercent(10, Infinity), null);
  assert.equal(evolutionPercent(10, NaN), null);
});

ok('evolutionPercent computes signed percentages', () => {
  assert.equal(evolutionPercent(10, 10), 0);
  assert.equal(evolutionPercent(12, 10), 20);
  assert.equal(evolutionPercent(8, 10), -20);
});

// --- classifyExerciseTrends ---
function repsSession(id: string, date: string, exerciseId: string, name: string, reps: number) {
  return session(id, date, [{ exerciseId, exerciseName: name, sets: [{ setNumber: 1, weightKg: 0, reps, completed: true }] }]);
}

ok('classifyExerciseTrends: progressing / stagnating / regressing / insufficient', () => {
  const perfs = [
    repsSession('s1', '2026-01-01', 'e1', 'Push', 10),
    repsSession('s2', '2026-01-08', 'e1', 'Push', 12),
    repsSession('s3', '2026-01-01', 'e2', 'Pull', 10),
    repsSession('s4', '2026-01-08', 'e2', 'Pull', 10),
    repsSession('s5', '2026-01-01', 'e3', 'Squat', 12),
    repsSession('s6', '2026-01-08', 'e3', 'Squat', 8),
    repsSession('s7', '2026-01-01', 'e4', 'Lunges', 10),
  ].flatMap((s) => buildSessionPerformances(s));

  const groups = classifyExerciseTrends(perfs);
  assert.deepEqual(groups.progressing.map((i) => i.exerciseId), ['e1']);
  assert.deepEqual(groups.stagnating.map((i) => i.exerciseId), ['e2']);
  assert.deepEqual(groups.regressing.map((i) => i.exerciseId), ['e3']);
  // e4 has a single performance -> "insufficient", must never be labelled
  assert.ok(!groups.progressing.some((i) => i.exerciseId === 'e4'));
  assert.ok(!groups.stagnating.some((i) => i.exerciseId === 'e4'));
  assert.ok(!groups.regressing.some((i) => i.exerciseId === 'e4'));
});

ok('classifyExerciseTrends: empty -> empty groups', () => {
  const groups = classifyExerciseTrends([]);
  assert.equal(groups.progressing.length, 0);
  assert.equal(groups.stagnating.length, 0);
  assert.equal(groups.regressing.length, 0);
});

ok('classifyExerciseTrends: trend metrics stay homogeneous (never reps<->seconds)', () => {
  // Timer exercise: durations 60 -> 75 -> progressing with unit "sec"
  const perfs = [
    session('s1', '2026-01-01', [{ exerciseId: 't1', exerciseName: 'Plank', muscleGroup: 'Core', sets: [{ setNumber: 1, weightKg: 0, reps: 0, mode: 'timer', durationSec: 60, completed: true }] }]),
    session('s2', '2026-01-08', [{ exerciseId: 't1', exerciseName: 'Plank', muscleGroup: 'Core', sets: [{ setNumber: 1, weightKg: 0, reps: 0, mode: 'timer', durationSec: 75, completed: true }] }]),
  ].flatMap((s) => buildSessionPerformances(s));
  const groups = classifyExerciseTrends(perfs);
  assert.deepEqual(groups.progressing.map((i) => i.exerciseId), ['t1']);
  assert.equal(groups.progressing[0].unit, 'sec');
  assert.equal(groups.progressing[0].current, 75);
});

// --- computeYearlyVolumeTrend ---
ok('computeYearlyVolumeTrend: only months with data, chronological, same year', () => {
  const sJuly = session('jul', '2026-07-10', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }] }], { totalVolumeKg: 3000 });
  const sAug = session('aug', '2026-08-12', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [{ setNumber: 1, weightKg: 0, reps: 10, completed: true }] }], { totalVolumeKg: 4500 });
  const sOtherYear = session('old', '2025-11-05', [{ exerciseId: 'e1', exerciseName: 'Push', sets: [] }], { totalVolumeKg: 9999 });
  const trend = computeYearlyVolumeTrend([sOtherYear, sAug, sJuly], 2026);
  assert.equal(trend.length, 2);
  assert.equal(trend[0].key, '2026-07');
  assert.equal(trend[1].key, '2026-08');
  assert.equal(trend[0].label, 'Juil');
  assert.equal(trend[1].label, 'Août');
  assert.equal(trend[0].volumeKg, 3000);
  assert.equal(trend[1].volumeKg, 4500);
  assert.equal(trend[0].sessions, 1);
  assert.equal(trend[0].validatedSets, 1);
});

ok('computeYearlyVolumeTrend: no data for the year -> empty', () => {
  assert.deepEqual(computeYearlyVolumeTrend([], 2026), []);
});

// ---------------------------------------------------------------- report -----
console.log(`\n${passed} tests PASS, ${failed} FAIL`);
if (failed === 0) {
  console.log('ALL TESTS PASSED');
} else {
  console.log('SOME TESTS FAILED');
}
