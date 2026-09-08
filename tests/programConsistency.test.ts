import assert from 'node:assert/strict';
import { WorkoutProgram, WorkoutProgramDay, ProgramExerciseConfig } from '../src/types';
import {
  validateProgramConsistency,
  validateDay,
  dayHasBlockingError,
  programHasBlockingError,
} from '../src/utilsProgramConsistency';

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

function cfg(id: string, exId: string, over: Partial<ProgramExerciseConfig> = {}): ProgramExerciseConfig {
  return {
    id,
    exerciseId: exId,
    exerciseName: `Ex ${exId}`,
    sets: 3,
    reps: 10,
    mode: 'reps',
    targetWeightKg: 0,
    restSec: 90,
    repsPlan: [10, 10, 10],
    ...over,
  };
}

function day(id: string, name: string, opts: Partial<WorkoutProgramDay> = {}): WorkoutProgramDay {
  return {
    id,
    name,
    dayOfWeek: 'Lundi',
    muscleGroups: ['Pectoraux'],
    exerciseIds: [],
    exercises: [cfg('c1', 'ex-a')],
    ...opts,
  };
}

function program(days: WorkoutProgramDay[]): WorkoutProgram {
  return {
    id: 'p1',
    title: 'Programme principal',
    description: 'd',
    daysPerWeek: days.length,
    level: 'Intermédiaire',
    type: 'fixed',
    isActive: true,
    color: '#8b5cf6',
    days,
  };
}

ok('clean program -> no errors, no warnings', () => {
  const r = validateProgramConsistency(program([day('d1', 'Haut du corps')]));
  assert.equal(r.errors.length, 0);
  assert.equal(r.warnings.length, 0);
});

ok('empty day -> error', () => {
  const d = day('d1', 'Jour vide', { exercises: undefined, exerciseIds: undefined });
  const r = validateProgramConsistency(program([d]));
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].code, 'empty-day');
  assert.equal(r.errors[0].dayId, 'd1');
});

ok('empty day still detected with exercises: [] and empty exerciseIds', () => {
  const d = day('d1', 'Jour vide', { exerciseIds: [], exercises: [] });
  const r = validateProgramConsistency(program([d]));
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].code, 'empty-day');
});

ok('duplicate config ids -> error', () => {
  const d = day('d1', 'Jour', { exercises: [cfg('dup', 'ex-a'), cfg('dup', 'ex-b')] });
  const r = validateProgramConsistency(program([d]));
  assert.equal(r.errors.some((e) => e.code === 'duplicate-config-id'), true);
});

ok('unknown exercise in catalog -> error; without catalog -> skipped', () => {
  const d = day('d1', 'Jour', { exercises: [cfg('c1', 'ex-ghost')] });
  const withCatalog = validateProgramConsistency(program([d]), [{ id: 'ex-a' }]);
  assert.equal(withCatalog.errors.some((e) => e.code === 'unknown-exercise'), true);
  const withoutCatalog = validateProgramConsistency(program([d]));
  assert.equal(withoutCatalog.errors.some((e) => e.code === 'unknown-exercise'), false);
});

ok('same exercise twice in one day -> warning', () => {
  const d = day('d1', 'Jour', { exercises: [cfg('c1', 'ex-a'), cfg('c2', 'ex-a')] });
  const r = validateProgramConsistency(program([d]));
  assert.equal(r.errors.length, 0);
  assert.equal(r.warnings.some((w) => w.code === 'duplicate-exercise'), true);
});

ok('invalid sets -> warning', () => {
  const d = day('d1', 'Jour', { exercises: [cfg('c1', 'ex-a', { sets: 0 })] });
  const r = validateProgramConsistency(program([d]));
  assert.equal(r.warnings.some((w) => w.code === 'invalid-sets'), true);
});

ok('invalid rest -> warning', () => {
  const d = day('d1', 'Jour', { exercises: [cfg('c1', 'ex-a', { restSec: -5 })] });
  const r = validateProgramConsistency(program([d]));
  assert.equal(r.warnings.some((w) => w.code === 'invalid-rest'), true);
});

ok('plan length mismatch -> warning', () => {
  const d = day('d1', 'Jour', { exercises: [cfg('c1', 'ex-a', { sets: 4, repsPlan: [10, 10, 10] })] });
  const r = validateProgramConsistency(program([d]));
  assert.equal(r.warnings.some((w) => w.code === 'plan-length-mismatch'), true);
});

ok('no muscle groups -> warning', () => {
  const d = day('d1', 'Jour', { muscleGroups: [] });
  const r = validateProgramConsistency(program([d]));
  assert.equal(r.warnings.some((w) => w.code === 'no-muscle-groups'), true);
});

ok('timer without duration -> warning (never a conversion)', () => {
  const d = day('d1', 'Jour', { exercises: [cfg('c1', 'ex-a', { mode: 'timer', durationSec: 0, reps: 0 })] });
  const r = validateProgramConsistency(program([d]));
  assert.equal(r.warnings.some((w) => w.code === 'timer-without-duration'), true);
});

ok('timer with duration -> no timer warning', () => {
  const d = day('d1', 'Jour', { exercises: [cfg('c1', 'ex-a', { mode: 'timer', durationSec: 30, reps: 0 })] });
  const r = validateProgramConsistency(program([d]));
  assert.equal(r.warnings.some((w) => w.code === 'timer-without-duration'), false);
});

ok('heavy volume (>= 30 sets in one day) -> volume warning', () => {
  const d = day('d1', 'Jour', { exercises: [cfg('c1', 'ex-a'), cfg('c2', 'ex-b')] });
  d.exercises = [cfg('c1', 'ex-a', { sets: 15 }), cfg('c2', 'ex-b', { sets: 15 })];
  const r = validateProgramConsistency(program([d]));
  assert.equal(r.warnings.some((w) => w.code === 'heavy-volume'), true);
});

ok('moderate volume -> no volume warning', () => {
  const d = day('d1', 'Jour', { exercises: [cfg('c1', 'ex-a'), cfg('c2', 'ex-b')] });
  const r = validateProgramConsistency(program([d]));
  assert.equal(r.warnings.some((w) => w.code === 'heavy-volume'), false);
});

ok('program without days -> warning only', () => {
  const r = validateProgramConsistency(program([]));
  assert.equal(r.errors.length, 0);
  assert.equal(r.warnings.some((w) => w.code === 'no-days'), true);
});

ok('validateDay scopes issues to that day', () => {
  const p = program([day('d1', 'Vide', { exercises: undefined, exerciseIds: undefined }), day('d2', 'Bon')]);
  const r1 = validateDay(p, p.days[0]);
  assert.equal(r1.errors.length, 1);
  assert.equal(r1.errors[0].code, 'empty-day');
  const r2 = validateDay(p, p.days[1]);
  assert.equal(r2.errors.length, 0);
});

ok('dayHasBlockingError / programHasBlockingError', () => {
  const p = program([day('d1', 'Vide', { exercises: undefined, exerciseIds: undefined }), day('d2', 'Bon')]);
  assert.equal(dayHasBlockingError(p, p.days[0]), true);
  assert.equal(dayHasBlockingError(p, p.days[1]), false);
  assert.equal(programHasBlockingError(p), true);
});

console.log(`\n${passed} tests PASS, ${failed} FAIL`);
if (failed > 0) process.exitCode = 1;