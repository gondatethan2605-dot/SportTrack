import assert from 'node:assert/strict';
import { WorkoutSession, WorkoutSet } from '../src/types';
import {
  buildSessionDetail,
  buildExerciseDetail,
  buildExerciseSetDetail,
  setHasValue,
  hasUsableExerciseData,
  sessionDetailTitle,
} from '../src/utilsSessionDetail';

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

function set(n: number, opts: Partial<WorkoutSet> = {}): WorkoutSet {
  return { setNumber: n, weightKg: 0, reps: 0, mode: 'reps', durationSec: 0, completed: true, ...opts };
}

function session(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 's1',
    title: 'Pectoraux',
    programId: 'p1',
    date: '2026-09-08',
    startTime: '18:30',
    durationMinutes: 45,
    completed: true,
    totalVolumeKg: 4800,
    exercises: [
      {
        exerciseId: 'ex-bench-press',
        exerciseName: 'Développé couché',
        muscleGroup: 'Pectoraux',
        restSec: 90,
        sets: [
          set(1, { weightKg: 60, reps: 8 }),
          set(2, { weightKg: 60, reps: 8 }),
          set(3, { weightKg: 62.5, reps: 6 }),
        ],
      },
      {
        exerciseId: 'ex-plank',
        exerciseName: 'Planche',
        muscleGroup: 'Abdominaux',
        sets: [
          set(1, { mode: 'timer', durationSec: 45 }),
          set(2, { mode: 'timer', durationSec: 45 }),
        ],
      },
    ],
    stretchesCompleted: true,
    stretchesCount: 3,
    guided: true,
    feeling: '⚡ Normal',
    notes: 'Bonne séance',
    ...overrides,
  };
}

ok('setHasValue: reps with value true, zero missing', () => {
  assert.equal(setHasValue(set(1, { reps: 8 })), true);
  assert.equal(setHasValue(set(1, { reps: 0 })), false);
});

ok('setHasValue: timer uses duration only', () => {
  assert.equal(setHasValue(set(1, { mode: 'timer', durationSec: 45 })), true);
  assert.equal(setHasValue(set(1, { mode: 'timer', durationSec: 0 })), false);
});

ok('buildExerciseSetDetail: reps display', () => {
  const d = buildExerciseSetDetail(set(1, { weightKg: 62.5, reps: 8 }));
  assert.equal(d.mode, 'reps');
  assert.equal(d.display, '8 × 62.5 kg');
  assert.equal(d.completed, true);
  assert.deepEqual([d.reps, d.weightKg, d.durationSec], [8, 62.5, 0]);
});

ok('buildExerciseSetDetail: timer display (never reps)', () => {
  const d = buildExerciseSetDetail(set(1, { mode: 'timer', durationSec: 45 }));
  assert.equal(d.mode, 'timer');
  assert.equal(d.display, '45 s');
  assert.deepEqual([d.reps, d.durationSec], [0, 45]);
});

ok('buildExerciseSetDetail: uncompleted + no value -> marked incomplete', () => {
  const d = buildExerciseSetDetail(set(1, { completed: false, reps: 0 }));
  assert.equal(d.completed, false);
  assert.equal(d.display, '0 reps');
});

ok('buildExerciseDetail: aggregates only completed sets', () => {
  const ex = buildExerciseDetail({
    exerciseId: 'ex-a',
    exerciseName: 'A',
    muscleGroup: 'Pecho',
    restSec: 60,
    sets: [
      set(1, { weightKg: 50, reps: 10 }),
      set(2, { weightKg: 50, reps: 10, completed: false }),
      set(3, { weightKg: 60, reps: 5 }),
    ],
  });
  assert.equal(ex.completedSets, 2);
  assert.equal(ex.plannedSets, 3);
  assert.equal(ex.totalReps, 15);
  assert.equal(ex.totalDurationSec, 0);
  assert.equal(ex.volumeKg, 50 * 10 + 60 * 5);
  assert.equal(ex.hasValidSeries, true);
  assert.equal(ex.restSec, 60);
});

ok('buildExerciseDetail: timer totals seconds, zero reps/volume', () => {
  const ex = buildExerciseDetail({
    exerciseId: 'ex-b',
    exerciseName: 'B',
    muscleGroup: 'Core',
    sets: [
      set(1, { mode: 'timer', durationSec: 60 }),
      set(2, { mode: 'timer', durationSec: 30 }),
    ],
  });
  assert.equal(ex.completedSets, 2);
  assert.equal(ex.totalDurationSec, 90);
  assert.equal(ex.totalReps, 0);
  assert.equal(ex.volumeKg, 0);
});

ok('buildSessionDetail: totals + canonical XP', () => {
  const d = buildSessionDetail(session());
  assert.equal(d.exerciseCount, 2); // both exercises have valid completed sets
  assert.equal(d.totalCompletedSets, 5);
  assert.equal(d.totalVolumeKg, 60 * 8 + 60 * 8 + 62.5 * 6);
  // canonical formula: 250 + 2*20 + 3*25 = 365
  assert.equal(d.xp, 365);
  assert.equal(d.stretchesCompleted, true);
  assert.equal(d.stretchesCount, 3);
});

ok('buildSessionDetail: session without exercises counts 0', () => {
  const d = buildSessionDetail(session({ exercises: [], stretchesCount: 0 }));
  assert.equal(d.exerciseCount, 0);
  assert.equal(d.totalCompletedSets, 0);
  assert.equal(d.xp, 250);
});

ok('buildSessionDetail: empty/undefined safe', () => {
  const d = buildSessionDetail({} as WorkoutSession);
  assert.equal(d.exerciseCount, 0);
  assert.equal(d.xp, 250);
});

ok('buildSessionDetail: exercises without valid series are not counted', () => {
  const d = buildSessionDetail(
    session({
      exercises: [
        {
          exerciseId: 'ex-c',
          exerciseName: 'C',
          muscleGroup: 'Dos',
          sets: [set(1, { completed: true, reps: 0, mode: 'timer', durationSec: 0 })],
        },
      ],
    })
  );
  assert.equal(d.exerciseCount, 0);
  assert.equal(d.exercises[0].hasValidSeries, false);
});

ok('hasUsableExerciseData: true only with a valid completed set', () => {
  assert.equal(hasUsableExerciseData(session()), true);
  assert.equal(hasUsableExerciseData(session({ exercises: [] })), false);
});

ok('sessionDetailTitle: falls back to generic', () => {
  assert.equal(sessionDetailTitle(session()), 'Pectoraux');
  assert.equal(sessionDetailTitle({ ...session(), title: '  ' }), 'Séance');
});