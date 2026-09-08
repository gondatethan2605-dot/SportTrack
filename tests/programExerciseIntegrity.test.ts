import assert from 'node:assert/strict';
import {
  countExerciseProgramUsages,
  renameExerciseInPrograms,
  removeExerciseFromPrograms,
} from '../src/utilsProgram';
import { WorkoutProgram, WorkoutProgramDay } from '../src/types';

let passed = 0;
function ok(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (e) {
    console.error(`FAIL  ${name}`);
    console.error('      ', (e as Error).message);
    process.exitCode = 1;
  }
}

function day(id: string, exerciseIds: string[], configs: WorkoutProgramDay['exercises']): WorkoutProgramDay {
  return { id, name: `Jour ${id}`, muscleGroups: ['Full Body'], exerciseIds, exercises: configs };
}

function config(id: string, exerciseId: string, exerciseName: string, extra?: Partial<NonNullable<WorkoutProgramDay['exercises']>[number]>): NonNullable<WorkoutProgramDay['exercises']>[number] {
  return {
    id,
    exerciseId,
    exerciseName,
    sets: 3,
    reps: 10,
    mode: 'reps' as const,
    durationSec: 0,
    targetWeightKg: 20,
    restSec: 90,
    transitionRestSec: 120,
    notes: 'note-originale',
    ...extra,
  };
}

const basePrograms: WorkoutProgram[] = [
  {
    id: 'p1',
    title: 'Push',
    description: '',
    daysPerWeek: 2,
    level: 'Intermédiaire',
    isActive: true,
    color: '#fff',
    days: [
      day('d1', ['e1', 'e2'], [config('c1', 'e1', 'Pompes'), config('c2', 'e2', 'Tractions')]),
      day('d2', ['e1'], [config('c3', 'e1', 'Pompes')]),
    ],
  },
  {
    id: 'p2',
    title: 'Legs',
    description: '',
    daysPerWeek: 1,
    level: 'Débutant',
    isActive: true,
    color: '#fff',
    days: [day('d3', ['e3'], [config('c4', 'e3', 'Squats')])],
  },
];

// ------------------------------------------------- Item 15: usage counting ----
ok('1. countExerciseProgramUsages: counts distinct programs and days', () => {
  const usage = countExerciseProgramUsages(basePrograms, 'e1');
  assert.equal(usage.programCount, 1); // only p1
  assert.equal(usage.dayCount, 2); // d1 + d2
});

ok('2. countExerciseProgramUsages: zero usage when not referenced', () => {
  const usage = countExerciseProgramUsages(basePrograms, 'e-inexistant');
  assert.deepEqual(usage, { programCount: 0, dayCount: 0 });
});

ok('3. countExerciseProgramUsages: counts legacy exerciseIds too', () => {
  const legacyOnly: WorkoutProgram[] = [
    {
      id: 'pL',
      title: 'Legacy',
      description: '',
      daysPerWeek: 1,
      level: 'Débutant',
      isActive: true,
      color: '#fff',
      days: [day('dL', ['e9'], undefined)],
    },
  ];
  assert.deepEqual(countExerciseProgramUsages(legacyOnly, 'e9'), { programCount: 1, dayCount: 1 });
});

ok('4. countExerciseProgramUsages: same exercise in several programs', () => {
  const usage = countExerciseProgramUsages(basePrograms, 'e1');
  const extraProgram = [
    ...basePrograms,
    { ...basePrograms[1], id: 'p3', days: [day('d4', ['e1'], [config('c5', 'e1', 'Pompes')])] },
  ];
  const usage2 = countExerciseProgramUsages(extraProgram, 'e1');
  assert.equal(usage2.programCount, usage.programCount + 1);
});

// ------------------------------------------------------- Item 15: rename ------
ok('5. renameExerciseInPrograms: renames only the display name, preserves everything else', () => {
  const next = renameExerciseInPrograms(basePrograms, 'e1', 'Pompes larges');
  assert.notEqual(next, basePrograms);
  const cfg = next[0].days[0].exercises?.find((c) => c.exerciseId === 'e1');
  assert.ok(cfg);
  assert.equal(cfg.exerciseName, 'Pompes larges');
  // every other field preserved verbatim
  assert.equal(cfg.sets, 3);
  assert.equal(cfg.targetWeightKg, 20);
  assert.equal(cfg.restSec, 90);
  assert.equal(cfg.transitionRestSec, 120);
  assert.equal(cfg.notes, 'note-originale');
});

ok('6. renameExerciseInPrograms: other exercises and programs untouched', () => {
  const next = renameExerciseInPrograms(basePrograms, 'e1', 'Pompes larges');
  // e2 in p1 unchanged
  assert.equal(next[0].days[0].exercises?.find((c) => c.exerciseId === 'e2')?.exerciseName, 'Tractions');
  // p2 totally unchanged (same reference)
  assert.equal(next[1], basePrograms[1]);
});

ok('7. renameExerciseInPrograms: same name -> same array reference (no write)', () => {
  const next = renameExerciseInPrograms(basePrograms, 'e1', 'Pompes');
  assert.equal(next, basePrograms);
});

ok('8. renameExerciseInPrograms: unknown exercise -> same array reference', () => {
  const next = renameExerciseInPrograms(basePrograms, 'e-unknown', 'X');
  assert.equal(next, basePrograms);
});

ok('9. renameExerciseInPrograms: blank or missing name -> same array reference', () => {
  assert.equal(renameExerciseInPrograms(basePrograms, 'e1', '   '), basePrograms);
  assert.equal(renameExerciseInPrograms(basePrograms, 'e1', ''), basePrograms);
  assert.equal(renameExerciseInPrograms(null as never, 'e1', 'X'), null);
});

// ----------------------------------------------------- Item 15: delete -------
ok('10. removeExerciseFromPrograms: removes every reference (configs + legacy ids)', () => {
  const { programs: next, removedReferences } = removeExerciseFromPrograms(basePrograms, 'e1');
  // d1: legacy id e1 + config c1 ; d2: legacy id e1 + config c3 -> 4 references
  assert.equal(removedReferences, 4);
  for (const p of next) {
    for (const d of p.days) {
      assert.ok(!(d.exerciseIds || []).includes('e1'));
      assert.ok(!(d.exercises || []).some((c) => c.exerciseId === 'e1'));
    }
  }
  // e2 config still there (stopped being affected)
  assert.equal(next[0].days[0].exercises?.find((c) => c.exerciseId === 'e2')?.exerciseName, 'Tractions');
});

ok('11. removeExerciseFromPrograms: untouched programs keep their reference', () => {
  const { programs: next } = removeExerciseFromPrograms(basePrograms, 'e1');
  assert.equal(next[1], basePrograms[1]);
});

ok('12. removeExerciseFromPrograms: no references -> same array + 0 removed', () => {
  const result = removeExerciseFromPrograms(basePrograms, 'e-unknown');
  assert.equal(result.programs, basePrograms);
  assert.equal(result.removedReferences, 0);
});

ok('13. removeExerciseFromPrograms: legacy-only references removed', () => {
  const legacyProgram: WorkoutProgram[] = [
    {
      id: 'pL2',
      title: 'Legacy',
      description: '',
      daysPerWeek: 1,
      level: 'Débutant',
      isActive: true,
      color: '#fff',
      days: [day('dL2', ['e9', 'e10'], undefined)],
    },
  ];
  const { programs: next, removedReferences } = removeExerciseFromPrograms(legacyProgram, 'e9');
  assert.equal(removedReferences, 1);
  assert.deepEqual(next[0].days[0].exerciseIds, ['e10']);
});

ok('14. removeExerciseFromPrograms: empty/missing args are safe', () => {
  assert.equal(removeExerciseFromPrograms(basePrograms, '').removedReferences, 0);
  const res = removeExerciseFromPrograms([] , 'e1');
  assert.equal(res.removedReferences, 0);
  assert.deepEqual(res.programs, []);
});

// ---------------------------------------------------------------- report -----
console.log(`\n${passed} tests passed.`);