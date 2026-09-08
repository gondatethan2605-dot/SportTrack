import assert from 'node:assert/strict';
import { WorkoutSession, ExercisePerformance } from '../src/types';
import { computeSessionXp } from '../src/utilsXp';
import {
  computeBestSessions,
  computeSessionAverages,
  summarizeExercise,
  computeYearlyVolumeTrend,
} from '../src/utilsStats';

// ---------------------------------------------------------------- helpers -----
function session(
  id: string,
  date: string,
  exercises: { exerciseId: string; exerciseName: string; sets: { setNumber: number; weightKg: number; reps: number; mode?: 'reps' | 'timer'; durationSec?: number; completed: boolean }[] }[],
  opts?: { stretchesCount?: number; durationMinutes?: number; totalVolumeKg?: number; completed?: boolean }
): WorkoutSession {
  return {
    id,
    title: `Séance ${id}`,
    date,
    startTime: '18:00',
    durationMinutes: opts?.durationMinutes ?? 30,
    completed: opts?.completed ?? true,
    totalVolumeKg: opts?.totalVolumeKg ?? 0,
    exercises: (exercises || []).map((e) => ({
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      muscleGroup: 'Pectoraux',
      sets: (e.sets || []).map((s) => ({
        setNumber: s.setNumber,
        weightKg: s.weightKg,
        reps: s.reps,
        mode: s.mode || 'reps',
        durationSec: s.durationSec ?? 0,
        completed: s.completed,
      })),
    })),
    stretchesCount: opts?.stretchesCount ?? 0,
  };
}

function perf(
  id: string,
  date: string,
  sets: { setNumber: number; weightKg: number; reps: number; mode?: 'reps' | 'timer'; durationSec?: number; completed: boolean }[],
  opts?: { exerciseName?: string; mode?: 'reps' | 'timer'; weightUsedKg?: number }
): ExercisePerformance {
  return {
    id,
    exerciseId: 'e1',
    exerciseName: opts?.exerciseName || 'Développé',
    sessionId: id,
    sessionTitle: `Séance ${id}`,
    date,
    mode: opts?.mode ?? 'reps',
    setsPlanned: sets.length,
    setsCompleted: sets.filter((s) => s.completed).length,
    totalReps: sets.filter((s) => s.completed && (s.mode || 'reps') === 'reps').reduce((a, s) => a + s.reps, 0),
    totalDurationSec: sets.filter((s) => s.completed && (s.mode || 'reps') === 'timer').reduce((a, s) => a + (s.durationSec || 0), 0),
    totalVolumeKg: sets.filter((s) => s.completed && (s.mode || 'reps') === 'reps').reduce((a, s) => a + s.weightKg * s.reps, 0),
    weightUsedKg: opts?.weightUsedKg ?? 0,
    sets: sets.map((s) => ({
      setNumber: s.setNumber,
      weightKg: s.weightKg,
      reps: s.reps,
      mode: s.mode || 'reps',
      durationSec: s.durationSec ?? 0,
      completed: s.completed,
    })),
    bestSet: null,
  };
}

const repSet = (n: number, w: number, r: number, completed = true) => ({ setNumber: n, weightKg: w, reps: r, completed });
const timerSet = (n: number, d: number, completed = true) => ({ setNumber: n, weightKg: 0, reps: 0, mode: 'timer' as const, durationSec: d, completed });

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

// ------------------------------------------------------------ computeBestSessions --
ok('computeBestSessions: empty -> null-ish safe summary', () => {
  const summary = computeBestSessions([]);
  assert.equal(summary.count, 0);
  assert.equal(summary.bestVolume, null);
  assert.equal(summary.longest, null);
});

ok('computeBestSessions: picks largest volume and longest duration', () => {
  const sessions = [
    session('a', '2026-01-05', [{ exerciseId: 'e1', exerciseName: 'X', sets: [repSet(1, 30, 10)] }], { totalVolumeKg: 120, durationMinutes: 25 }),
    session('b', '2026-01-06', [{ exerciseId: 'e1', exerciseName: 'X', sets: [repSet(1, 30, 10)] }], { totalVolumeKg: 300, durationMinutes: 40 }),
    session('c', '2026-01-07', [{ exerciseId: 'e1', exerciseName: 'X', sets: [repSet(1, 30, 10)] }], { totalVolumeKg: 200, durationMinutes: 60 }),
  ];
  const summary = computeBestSessions(sessions);
  assert.equal(summary.count, 3);
  assert.equal(summary.bestVolume?.id, 'b');
  assert.equal(summary.bestVolume?.value, 300);
  assert.equal(summary.longest?.id, 'c');
  assert.equal(summary.longest?.value, 60);
});

ok('computeBestSessions: ties keep the first occurrence, non-finite inputs are skipped', () => {
  const sessions = [
    session('a', '2026-01-01', [{ exerciseId: 'e1', exerciseName: 'X', sets: [repSet(1, 30, 10)] }], { totalVolumeKg: 100, durationMinutes: 30 }),
    session('b', '2026-01-02', [{ exerciseId: 'e1', exerciseName: 'X', sets: [repSet(1, 30, 10)] }], { totalVolumeKg: 'evil' as unknown as number, durationMinutes: 30 }),
    null as unknown as WorkoutSession,
  ];
  const summary = computeBestSessions(sessions);
  assert.equal(summary.bestVolume?.id, 'a');
  assert.equal(summary.count, 3);
  assert.equal(summary.longest?.id, 'a');
});

// --------------------------------------------------------- computeSessionAverages --
ok('computeSessionAverages: zero sessions -> all zeros', () => {
  const avg = computeSessionAverages([]);
  assert.deepEqual(avg, { avgDurationMinutes: 0, avgVolumeKg: 0, avgValidatedSets: 0, avgReps: 0 });
});

ok('computeSessionAverages: averages over validated sets only, no timer->reps conversion', () => {
  const sessions = [
    session('a', '2026-01-05', [
      { exerciseId: 'e1', exerciseName: 'X', sets: [repSet(1, 30, 10), repSet(2, 30, 10)] },
      { exerciseId: 'e2', exerciseName: 'Y', sets: [timerSet(1, 60)] },
    ], { totalVolumeKg: 600, durationMinutes: 60 }),
    session('b', '2026-01-06', [
      { exerciseId: 'e1', exerciseName: 'X', sets: [repSet(1, 30, 10)] },
    ], { totalVolumeKg: 300, durationMinutes: 30 }),
  ];
  const avg = computeSessionAverages(sessions);
  assert.equal(avg.avgDurationMinutes, 45); // (60+30)/2
  assert.equal(avg.avgVolumeKg, 450); // (600+300)/2
  assert.equal(avg.avgValidatedSets, 2); // 3 reps sets + 1 timer set over 2 sessions
  assert.equal(avg.avgReps, 15); // (20+10)/2 — timer set never becomes reps
});

// ------------------------------------------------------------- summarizeExercise --
ok('summarizeExercise: empty entries -> zero summary', () => {
  const s = summarizeExercise([]);
  assert.equal(s.sessions, 0);
  assert.equal(s.validatedSets, 0);
  assert.equal(s.totalReps, 0);
  assert.equal(s.totalDurationSec, 0);
  assert.equal(s.totalVolumeKg, 0);
  assert.equal(s.weightUsedKg, 0);
  assert.equal(s.lastDate, null);
  assert.equal(s.mode, null);
});

ok('summarizeExercise: aggregates real numbers, most recent entry carries weight/mode', () => {
  const entries = [
    perf('p1', '2026-01-05', [repSet(1, 30, 10), repSet(2, 30, 10)], { weightUsedKg: 30 }),
    perf('p2', '2026-01-08', [timerSet(1, 45), repSet(2, 40, 8)], { weightUsedKg: 40 }),
  ];
  const s = summarizeExercise(entries);
  assert.equal(s.sessions, 2);
  assert.equal(s.validatedSets, 4);
  assert.equal(s.totalReps, 28); // 10+10+8 — timer set never becomes reps
  assert.equal(s.totalDurationSec, 45);
  assert.equal(s.totalVolumeKg, 920); // 30*10 + 30*10 + 40*8
  assert.equal(s.weightUsedKg, 40); // from latest entry (p2)
  assert.equal(s.mode, 'reps'); // latest entry keeps its mode
  assert.equal(s.lastDate, '2026-01-08');
});

ok('summarizeExercise: incomplete sets never inflate totals', () => {
  const entries = [perf('p1', '2026-01-05', [repSet(1, 30, 10, false), repSet(2, 30, 10)], { weightUsedKg: 30 })];
  const s = summarizeExercise(entries);
  assert.equal(s.sessions, 1);
  assert.equal(s.validatedSets, 1);
  assert.equal(s.totalReps, 10);
  assert.equal(s.totalVolumeKg, 300);
});

// ------------------------------------------------------- computeYearlyVolumeTrend --
ok('computeYearlyVolumeTrend: fills duration + xp months, chronologically ordered, other years excluded', () => {
  const year = 2026;
  const sessions = [
    session('a', '2026-03-10', [{ exerciseId: 'e1', exerciseName: 'X', sets: [repSet(1, 30, 10)] }], { totalVolumeKg: 100, durationMinutes: 20, stretchesCount: 2 }),
    session('b', '2026-01-15', [{ exerciseId: 'e1', exerciseName: 'X', sets: [repSet(1, 30, 10)] }], { totalVolumeKg: 50, durationMinutes: 40, stretchesCount: 0 }),
    session('c', '2027-01-01', [{ exerciseId: 'e1', exerciseName: 'X', sets: [repSet(1, 30, 10)] }], { totalVolumeKg: 999, durationMinutes: 999 }),
    session('d', '2026-01-20', [{ exerciseId: 'e1', exerciseName: 'X', sets: [repSet(1, 30, 10)] }], { totalVolumeKg: 0, durationMinutes: 0, stretchesCount: 5 }),
  ];
  const trend = computeYearlyVolumeTrend(sessions, year);
  assert.deepEqual(trend.map((t) => t.key), ['2026-01', '2026-03']);
  assert.equal(trend[0].label, 'Jan');
  assert.equal(trend[1].label, 'Mar');

  const jan = trend[0];
  assert.equal(jan.sessions, 2);
  assert.equal(jan.volumeKg, 50);
  assert.equal(jan.durationMinutes, 40); // 40 + 0
  assert.equal(jan.validatedSets, 2);
  assert.equal(jan.xpEarned, computeSessionXp(1, 0) + computeSessionXp(1, 5));

  const mar = trend[1];
  assert.equal(mar.durationMinutes, 20);
  assert.equal(mar.xpEarned, computeSessionXp(1, 2));
});

ok('computeYearlyVolumeTrend: no sessions in year -> empty list', () => {
  assert.deepEqual(computeYearlyVolumeTrend([], 2026), []);
  assert.deepEqual(computeYearlyVolumeTrend([session('a', '2026-01-10', [])], 2025), []);
});

ok('computeYearlyVolumeTrend: validates empty / completed sessions identically to the app', () => {
  const inferiors = session('a', '2026-01-10', [{ exerciseId: 'e1', exerciseName: 'X', sets: [repSet(1, 30, 10, false)] }], { totalVolumeKg: 100 });
  const trend = computeYearlyVolumeTrend([inferiors], 2026);
  assert.equal(trend.length, 1);
  assert.equal(trend[0].validatedSets, 0);
});

// ---------------------------------------------------------------- report -----
console.log(`\n${passed} tests PASS, ${failed} FAIL`);
if (failed === 0) {
  console.log('ALL TESTS PASSED');
} else {
  console.log('SOME TESTS FAILED');
}