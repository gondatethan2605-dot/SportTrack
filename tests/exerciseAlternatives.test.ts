import assert from 'node:assert/strict';
import { Exercise, ProgramExerciseConfig } from '../src/types';
import {
  getExerciseAlternatives,
  buildAlternativeConfig,
  parseDefaultReps,
} from '../src/utilsAlternatives';

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

function ex(
  id: string,
  over: Partial<Exercise> = {}
): Exercise {
  return {
    id,
    name: `Exercice ${id}`,
    primaryMuscle: 'Pectoraux',
    secondaryMuscles: ['Épaules', 'Triceps'],
    bodyPart: 'Pectoraux',
    equipment: 'Haltères',
    difficulty: 'Intermédiaire',
    category: 'Musculation',
    muscleGroup: 'Pectoraux',
    description: 'd',
    instructions: ['i'],
    tips: ['t'],
    variants: ['v'],
    similarExerciseIds: [],
    defaultSets: 3,
    defaultReps: 10,
    defaultRestSec: 90,
    isFavorite: false,
    ...over,
  };
}

const DIP = () => ex('ex-dips', { name: 'Dips' });
const INCLINE = () => ex('ex-incline', { name: 'Développé incliné' });
const PUSHUP = () => ex('ex-pushups', { name: 'Pompes', equipment: 'Poids du corps' });
const SQUAT = () => ex('ex-squat', { name: 'Squat', primaryMuscle: 'Quadriceps', muscleGroup: 'Jambes', similarExerciseIds: ['ex-pushups'] });

function cfg(over: Partial<ProgramExerciseConfig> = {}): ProgramExerciseConfig {
  return {
    id: 'cfg-old',
    exerciseId: 'ex-bench',
    exerciseName: 'Développé couché',
    sets: 3,
    reps: 8,
    mode: 'reps',
    durationSec: 0,
    targetWeightKg: 60,
    restSec: 90,
    repsPlan: [8, 8, 8],
    durationPlan: [0, 0, 0],
    ...over,
  };
}

ok('parseDefaultReps: numeric count', () => {
  assert.deepEqual(parseDefaultReps(12), { kind: 'count', value: 12 });
  assert.deepEqual(parseDefaultReps('12'), { kind: 'count', value: 12 });
});

ok('parseDefaultReps: duration strings', () => {
  assert.deepEqual(parseDefaultReps('45 sec'), { kind: 'duration', value: 45 });
  assert.deepEqual(parseDefaultReps('45s'), { kind: 'duration', value: 45 });
  assert.deepEqual(parseDefaultReps('1 min'), { kind: 'duration', value: 60 });
  assert.deepEqual(parseDefaultReps('1.5 min'), { kind: 'duration', value: 90 });
});

ok('parseDefaultReps: ambiguous text falls back to count', () => {
  assert.deepEqual(parseDefaultReps('10 reps x 5 sec'), { kind: 'count', value: 10 });
  assert.deepEqual(parseDefaultReps('abc'), { kind: 'count', value: 10 });
});

ok('getExerciseAlternatives: similar ids ranked first, in order', () => {
  const base = ex('ex-bench', { similarExerciseIds: ['ex-incline', 'ex-dips'] });
  const list = [INCLINE(), DIP(), PUSHUP()];
  const alts = getExerciseAlternatives(base, list, 5);
  assert.equal(alts.length, 3);
  assert.equal(alts[0].exercise.id, 'ex-incline');
  assert.equal(alts[0].rank, 1);
  assert.equal(alts[1].exercise.id, 'ex-dips');
  assert.equal(alts[1].rank, 1);
  // pushup falls back to the same primary-muscle rule
  assert.equal(alts[2].exercise.id, 'ex-pushups');
  assert.equal(alts[2].rank, 2);
});

ok('getExerciseAlternatives: never includes the exercise itself', () => {
  const base = ex('ex-bench');
  const list = [base, INCLINE()];
  const alts = getExerciseAlternatives(base, list, 5);
  assert.equal(alts.some((a) => a.exercise.id === 'ex-bench'), false);
});

ok('getExerciseAlternatives: primary-muscle fallback', () => {
  const base = ex('ex-bench2', { similarExerciseIds: ['ex-ghost'] });
  const incl = INCLINE();
  const alts = getExerciseAlternatives(base, [incl], 5);
  // {'ex-ghost'} not present -> same muscle ranks
  assert.equal(alts[0].rank, 2);
  assert.equal(alts[0].exercise.id, 'ex-incline');
});

ok('getExerciseAlternatives: equipment fallback, no duplicates', () => {
  const base = ex('ex-bench3', {
    similarExerciseIds: ['ex-incline', 'ex-pushups'],
    equipment: 'Haltères',
  });
  const list = [INCLINE(), PUSHUP(), ex('ex-other-haltere', { equipment: 'Haltères' })];
  const alts = getExerciseAlternatives(base, list, 5);
  const ids = alts.map((a) => a.exercise.id);
  assert.equal(new Set(ids).size, ids.length, 'no duplicates');
  // incliné (rank1 via similar) + pushups (rank1 via similar) = 2
  assert.equal(alts.some((a) => a.exercise.id === 'ex-incline' && a.rank === 1), true);
});

ok('getExerciseAlternatives: limit respected', () => {
  const base = ex('ex-bench4');
  const list = [INCLINE(), DIP(), PUSHUP(), ex('e4'), ex('e5'), ex('e6')];
  const alts = getExerciseAlternatives(base, list, 3);
  assert.ok(alts.length <= 3);
});

ok('getExerciseAlternatives: null/empty safe', () => {
  assert.deepEqual(getExerciseAlternatives(null, []), []);
  assert.deepEqual(getExerciseAlternatives(ex('x'), []), []);
});

ok('buildAlternativeConfig: preserves reps mode with count default', () => {
  const alt = ex('ex-alt', { defaultSets: 4, defaultReps: 12, defaultRestSec: 75 });
  const res = buildAlternativeConfig(cfg(), alt);
  assert.equal(res.modePreserved, true);
  assert.equal(res.config.mode, 'reps');
  assert.equal(res.config.sets, 4);
  assert.equal(res.config.restSec, 75);
  assert.deepEqual(res.config.repsPlan, [12, 12, 12, 12]);
  assert.equal(res.config.targetWeightKg, 60);
  assert.equal(res.config.exerciseId, 'ex-alt');
  assert.ok(res.config.id !== 'cfg-old');
});

ok('buildAlternativeConfig: preserves timer mode with duration default', () => {
  const alt = ex('ex-plank2', { defaultSets: 3, defaultReps: '45 sec', defaultRestSec: 30 });
  const res = buildAlternativeConfig(cfg({ mode: 'timer', durationSec: 45 }), alt);
  assert.equal(res.modePreserved, true);
  assert.equal(res.config.mode, 'timer');
  assert.deepEqual(res.config.durationPlan, [45, 45, 45]);
  assert.equal(res.config.reps, 0);
});

ok('buildAlternativeConfig: switches mode (flagged) when dimensions mismatch — NO conversion', () => {
  // existing reps config replaced by a timer-native exercise
  const alt = ex('ex-plank3', { defaultReps: '45 sec' });
  const res = buildAlternativeConfig(cfg(), alt);
  assert.equal(res.modePreserved, false);
  assert.equal(res.config.mode, 'timer');
  assert.deepEqual(res.config.durationPlan, [45, 45, 45]);

  // existing timer config replaced by a rep-native exercise
  const alt2 = ex('ex-squat2', { defaultReps: 15 });
  const res2 = buildAlternativeConfig(cfg({ mode: 'timer', durationSec: 45 }), alt2);
  assert.equal(res2.modePreserved, false);
  assert.equal(res2.config.mode, 'reps');
  assert.deepEqual(res2.config.repsPlan, [15, 15, 15]);
  assert.equal(res2.config.durationSec, 0);
});

ok('buildAlternativeConfig: plans always length = sets, no NaN', () => {
  const alt = ex('ex-z', { defaultSets: 5, defaultReps: '2 min' });
  const res = buildAlternativeConfig(cfg(), alt);
  assert.equal(res.config.mode, 'timer');
  assert.equal(res.config.durationPlan!.length, 5);
  assert.equal(res.config.durationPlan!.every((v) => Number.isFinite(v) && v === 120), true);
  assert.equal(res.config.durationSec, 120);
});

ok('buildAlternativeConfig: safe with missing defaults', () => {
  const alt = ex('ex-missing', { defaultSets: undefined as any, defaultReps: undefined as any, defaultRestSec: undefined as any });
  const res = buildAlternativeConfig(cfg(), alt);
  assert.equal(res.config.sets, 3);
  assert.ok(res.config.repsPlan && res.config.repsPlan.length === 3);
  assert.ok(Number.isFinite(res.config.restSec) && res.config.restSec >= 0);
});

console.log(`\n${passed} tests PASS, ${failed} FAIL`);
if (failed > 0) process.exitCode = 1;