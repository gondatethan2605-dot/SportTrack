import assert from 'node:assert/strict';
import { ExercisePerformance, WorkoutProgram } from '../src/types';
import {
  computeProgramRecommendations,
  recommendationForExercise,
  applyProgramTargetSuggestion,
  distributeTargetAcrossSets,
} from '../src/utilsSmartProgram';

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

// ---------------------------------------------------------------- fixtures -----

function perf(exerciseId: string, date: string, opts: { mode?: 'reps' | 'timer'; totalReps?: number; totalDurationSec?: number; weightUsedKg?: number; setsPlanned?: number; setsCompleted?: number; totalVolumeKg?: number }): ExercisePerformance {
  return {
    id: `${date}-${exerciseId}`,
    exerciseId,
    exerciseName: `Exo ${exerciseId}`,
    sessionId: `sess-${date}`,
    sessionTitle: `Séance ${date}`,
    date,
    mode: opts.mode ?? 'reps',
    setsPlanned: opts.setsPlanned ?? 3,
    setsCompleted: opts.setsCompleted ?? 3,
    totalReps: opts.totalReps ?? 0,
    totalDurationSec: opts.totalDurationSec ?? 0,
    totalVolumeKg: opts.totalVolumeKg ?? 0,
    weightUsedKg: opts.weightUsedKg ?? 0,
    sets: [],
    bestSet: null,
  };
}

function program(opts?: {
  exerciseId?: string;
  mode?: 'reps' | 'timer';
  sets?: number;
  reps?: number | string;
  durationSec?: number;
  targetWeightKg?: number;
  repsPlan?: (number | string)[];
  durationPlan?: number[];
}): WorkoutProgram {
  const id = opts?.exerciseId ?? 'e1';
  return {
    id: 'prog1',
    title: 'Programme test',
    description: '',
    daysPerWeek: 3,
    level: 'Débutant',
    isActive: true,
    color: '#7c3aed',
    days: [
      {
        id: 'day1',
        name: 'Jour 1',
        muscleGroups: ['Pectoraux'],
        exerciseIds: [id],
        exercises: [
          {
            id: 'cfg1',
            exerciseId: id,
            exerciseName: `Exo ${id}`,
            sets: opts?.sets ?? 3,
            reps: opts?.reps ?? 8,
            mode: opts?.mode,
            durationSec: opts?.durationSec,
            repsPlan: opts?.repsPlan,
            durationPlan: opts?.durationPlan,
            targetWeightKg: opts?.targetWeightKg ?? 0,
            restSec: 30,
          },
        ],
      },
    ],
  };
}

// ------------------------------------------------------------- DISTRIBUTION -----

ok('distributeTargetAcrossSets: répartition déterministe', () => {
  assert.deepEqual(distributeTargetAcrossSets(10, 3), [4, 3, 3]);
  assert.deepEqual(distributeTargetAcrossSets(12, 3), [4, 4, 4]);
  assert.deepEqual(distributeTargetAcrossSets(14, 2), [7, 7]);
  assert.deepEqual(distributeTargetAcrossSets(0, 3), [0, 0, 0]);
});

ok('distributeTargetAcrossSets: sets <= 0 -> 1 seul set', () => {
  assert.deepEqual(distributeTargetAcrossSets(10, 0), [10]);
  assert.deepEqual(distributeTargetAcrossSets(10, -2), [10]);
});

ok('distributeTargetAcrossSets: résultat toujours positif, somme = total', () => {
  const total = 47;
  const arr = distributeTargetAcrossSets(total, 5);
  assert.equal(arr.reduce((a, b) => a + b, 0), total);
  assert.ok(arr.every((v) => v >= 0));
});

// ------------------------------------------------------------- RECOMMEND -----

ok('programme vide -> aucune recommandation', () => {
  assert.deepEqual(computeProgramRecommendations([], null), []);
  assert.deepEqual(computeProgramRecommendations([], program()), []);
});

ok('exercice dans le programme sans performance -> aucune recommandation', () => {
  assert.deepEqual(computeProgramRecommendations([], program()), []);
});

ok('progression (reps): recommandation produite quand willIncrease', () => {
  const performances = [
    perf('e1', '2026-09-01', { mode: 'reps', totalReps: 10, weightUsedKg: 0 }),
    perf('e1', '2026-09-05', { mode: 'reps', totalReps: 12, weightUsedKg: 0 }),
  ];
  const recs = computeProgramRecommendations(performances, program({ exerciseId: 'e1', sets: 2, reps: 5, targetWeightKg: 0 }));
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.exerciseId, 'e1');
  assert.equal(r.metric, 'reps');
  assert.equal(r.currentTarget, 10); // 5 reps x 2 sets
  assert.equal(r.suggestedTarget, 14); // 12 + 2 (step)
  assert.equal(r.willIncrease, true);
  assert.equal(r.trend, 'progressing');
});

ok('régression (reps): willIncrease false quand last <= target programme', () => {
  const performances = [
    perf('e1', '2026-09-01', { mode: 'reps', totalReps: 12, weightUsedKg: 0 }),
    perf('e1', '2026-09-05', { mode: 'reps', totalReps: 10, weightUsedKg: 0 }),
  ];
  const recs = computeProgramRecommendations(performances, program({ exerciseId: 'e1', sets: 2, reps: 5, targetWeightKg: 0 }));
  assert.equal(recs.length, 1);
  assert.equal(recs[0].trend, 'regressing');
  assert.equal(recs[0].willIncrease, false); // target=last=10, currentTarget=10
});

ok('stagnation (reps): willIncrease true (stagnation monte quand même d’un step)', () => {
  const performances = [
    perf('e1', '2026-09-01', { mode: 'reps', totalReps: 10, weightUsedKg: 0 }),
    perf('e1', '2026-09-05', { mode: 'reps', totalReps: 10, weightUsedKg: 0 }),
  ];
  const recs = computeProgramRecommendations(performances, program({ exerciseId: 'e1', sets: 2, reps: 5, targetWeightKg: 0 }));
  assert.equal(recs[0].trend, 'stagnating');
  assert.equal(recs[0].willIncrease, true); // target=12 > currentTarget=10
});

ok('duration (timer): recommandation produite pour programme timer', () => {
  const performances = [
    perf('e1', '2026-09-01', { mode: 'timer', totalDurationSec: 30, totalReps: 0, weightUsedKg: 0 }),
    perf('e1', '2026-09-05', { mode: 'timer', totalDurationSec: 40, totalReps: 0, weightUsedKg: 0 }),
  ];
  const recs = computeProgramRecommendations(performances, program({ exerciseId: 'e1', mode: 'timer', durationSec: 20, sets: 2, targetWeightKg: 0 }));
  assert.equal(recs.length, 1);
  assert.equal(recs[0].metric, 'duration');
  assert.equal(recs[0].currentTarget, 40); // 20 x 2
  assert.equal(recs[0].suggestedTarget, 45); // 40 + 5
  assert.equal(recs[0].willIncrease, true);
});

ok('weight: recommandation produite avec targetWeightKg > 0', () => {
  const performances = [
    perf('e1', '2026-09-01', { mode: 'reps', weightUsedKg: 50, totalReps: 10 }),
    perf('e1', '2026-09-05', { mode: 'reps', weightUsedKg: 55, totalReps: 10 }),
  ];
  const recs = computeProgramRecommendations(performances, program({ exerciseId: 'e1', sets: 3, reps: 8, targetWeightKg: 50 }));
  assert.equal(recs.length, 1);
  assert.equal(recs[0].metric, 'weight');
  assert.equal(recs[0].currentTarget, 50);
  assert.equal(recs[0].suggestedTarget, 57.5); // 55 + 2.5
  assert.equal(recs[0].willIncrease, true);
});

ok('mode mismatch: reps historique + programme timer -> aucune recommandation', () => {
  const performances = [
    perf('e1', '2026-09-01', { mode: 'reps', totalReps: 10, weightUsedKg: 0 }),
    perf('e1', '2026-09-05', { mode: 'reps', totalReps: 12, weightUsedKg: 0 }),
  ];
  const recs = computeProgramRecommendations(performances, program({ exerciseId: 'e1', mode: 'timer', durationSec: 20, sets: 2, targetWeightKg: 0 }));
  assert.equal(recs.length, 0);
});

ok('mode mismatch: duration historique + programme reps -> aucune recommandation', () => {
  const performances = [
    perf('e1', '2026-09-01', { mode: 'timer', totalDurationSec: 30, totalReps: 0, weightUsedKg: 0 }),
    perf('e1', '2026-09-05', { mode: 'timer', totalDurationSec: 40, totalReps: 0, weightUsedKg: 0 }),
  ];
  const recs = computeProgramRecommendations(performances, program({ exerciseId: 'e1', sets: 2, reps: 5, targetWeightKg: 0 }));
  assert.equal(recs.length, 0);
});

ok('targetWeightKg = 0 -> pas de recommandation metric weight', () => {
  const performances = [
    perf('e1', '2026-09-01', { mode: 'reps', weightUsedKg: 50, totalReps: 10 }),
    perf('e1', '2026-09-05', { mode: 'reps', weightUsedKg: 55, totalReps: 10 }),
  ];
  const recs = computeProgramRecommendations(performances, program({ exerciseId: 'e1', targetWeightKg: 0 }));
  assert.equal(recs.length, 0);
});

ok('repsPlan fourni: currentTarget = somme du plan', () => {
  const performances = [
    perf('e1', '2026-09-01', { mode: 'reps', totalReps: 10, weightUsedKg: 0 }),
    perf('e1', '2026-09-05', { mode: 'reps', totalReps: 12, weightUsedKg: 0 }),
  ];
  const recs = computeProgramRecommendations(performances, program({ exerciseId: 'e1', sets: 2, reps: 5, repsPlan: [6, 7], targetWeightKg: 0 }));
  assert.equal(recs[0].currentTarget, 13); // 6 + 7
  assert.equal(recs[0].willIncrease, true); // 14 > 13
});

ok('durationPlan fourni: currentTarget = somme du plan', () => {
  const performances = [
    perf('e1', '2026-09-01', { mode: 'timer', totalDurationSec: 30, totalReps: 0, weightUsedKg: 0 }),
    perf('e1', '2026-09-05', { mode: 'timer', totalDurationSec: 40, totalReps: 0, weightUsedKg: 0 }),
  ];
  const recs = computeProgramRecommendations(performances, program({ exerciseId: 'e1', mode: 'timer', durationSec: 20, durationPlan: [25, 30], sets: 2, targetWeightKg: 0 }));
  assert.equal(recs[0].currentTarget, 55); // 25+30
  assert.equal(recs[0].willIncrease, false); // 45 < 55
});

ok('recommendationForExercise trouve le bon exercice', () => {
  const performances = [
    perf('e1', '2026-09-01', { totalReps: 10, weightUsedKg: 0 }),
    perf('e1', '2026-09-05', { totalReps: 12, weightUsedKg: 0 }),
    perf('e2', '2026-09-01', { totalReps: 20, weightUsedKg: 0 }),
    perf('e2', '2026-09-05', { totalReps: 22, weightUsedKg: 0 }),
  ];
  const p = program({ exerciseId: 'e1', sets: 2, reps: 5, targetWeightKg: 0 });
  // Ajouter e2 au programme
  p.days[0].exercises!.push({
    id: 'cfg2', exerciseId: 'e2', exerciseName: 'Exo e2', sets: 2, reps: 10,
    targetWeightKg: 0, restSec: 30,
  });
  p.days[0].exerciseIds.push('e2');
  const recs = computeProgramRecommendations(performances, p);
  const r1 = recommendationForExercise(recs, 'e1');
  const r2 = recommendationForExercise(recs, 'e2');
  assert.ok(r1);
  assert.ok(r2);
  assert.equal(r1!.exerciseId, 'e1');
  assert.equal(r2!.exerciseId, 'e2');
  assert.equal(recommendationForExercise(recs, 'e3'), null);
});

ok('durée insuffisante (< 2 séances) pas de recommandation (insufficient trend)', () => {
  const performances = [perf('e1', '2026-09-01', { totalReps: 10, weightUsedKg: 0 })];
  const recs = computeProgramRecommendations(performances, program({ exerciseId: 'e1', sets: 2, reps: 5, targetWeightKg: 0 }));
  assert.equal(recs.length, 0);
});

// ------------------------------------------------------------- APPLY -----

ok('apply: reps distribue la cible proposée sur les séries et met à jour le fallback', () => {
  const p = program({ exerciseId: 'e1', sets: 2, reps: 5, repsPlan: [5, 5], targetWeightKg: 0 });
  const updated = applyProgramTargetSuggestion(p, 'e1', 'reps', 14);
  assert.notEqual(updated, p);
  const config = updated.days[0].exercises![0];
  assert.deepEqual(config.repsPlan, [7, 7]);
  assert.equal(config.reps, 7);
});

ok('apply: duration distribue la cible sur les séries et met à jour le fallback', () => {
  const p = program({ exerciseId: 'e1', mode: 'timer', durationSec: 20, sets: 2, durationPlan: [20, 20], targetWeightKg: 0 });
  const updated = applyProgramTargetSuggestion(p, 'e1', 'duration', 45);
  const config = updated.days[0].exercises![0];
  assert.deepEqual(config.durationPlan, [23, 22]);
  assert.equal(config.durationSec, 23);
});

ok('apply: weight met à jour uniquement targetWeightKg', () => {
  const p = program({ exerciseId: 'e1', sets: 3, reps: 8, targetWeightKg: 50 });
  const updated = applyProgramTargetSuggestion(p, 'e1', 'weight', 52.5);
  const config = updated.days[0].exercises![0];
  assert.equal(config.targetWeightKg, 52.5);
  assert.equal(config.reps, 8);
  assert.equal(config.sets, 3);
});

ok('apply: ne modifie pas les champs séries/repos/mode/notes/id/exerciseId', () => {
  const p = program({ exerciseId: 'e1', mode: 'timer', sets: 3, reps: 8, durationSec: 20, targetWeightKg: 10 });
  p.days[0].exercises![0].notes = 'ne pas toucher';
  const updated = applyProgramTargetSuggestion(p, 'e1', 'duration', 70);
  const orig = p.days[0].exercises![0];
  const next = updated.days[0].exercises![0];
  assert.equal(next.id, orig.id);
  assert.equal(next.exerciseId, orig.exerciseId);
  assert.equal(next.mode, orig.mode);
  assert.equal(next.sets, orig.sets);
  assert.equal(next.reps, orig.reps);
  assert.equal(next.restSec, orig.restSec);
  assert.equal(next.notes, 'ne pas toucher');
});

ok('apply: retourne le même objet si la cible ne monte pas', () => {
  const p = program({ exerciseId: 'e1', sets: 2, reps: 5, targetWeightKg: 0 });
  const updated = applyProgramTargetSuggestion(p, 'e1', 'reps', 10); // 10 == currentTarget
  assert.equal(updated, p);
});

ok('apply: retourne le même objet si la cible proposée est 0 ou négative', () => {
  const p = program({ exerciseId: 'e1', sets: 2, reps: 5, targetWeightKg: 50 });
  assert.equal(applyProgramTargetSuggestion(p, 'e1', 'weight', 0), p);
  assert.equal(applyProgramTargetSuggestion(p, 'e1', 'weight', -10), p);
});

ok('apply: retourne le même objet si l’exercice n’est pas dans le programme', () => {
  const p = program({ exerciseId: 'e1', sets: 2, reps: 5, targetWeightKg: 0 });
  assert.equal(applyProgramTargetSuggestion(p, 'e99', 'reps', 20), p);
});

ok('apply: renvoie un nouvel objet (immutabilité programme)', () => {
  const p = program({ exerciseId: 'e1', sets: 2, reps: 5, targetWeightKg: 0 });
  const updated = applyProgramTargetSuggestion(p, 'e1', 'reps', 14);
  assert.notEqual(updated, p);
  assert.notEqual(updated.days, p.days);
  assert.notEqual(updated.days[0], p.days[0]);
  assert.notEqual(updated.days[0].exercises, p.days[0].exercises);
  assert.notEqual(updated.days[0].exercises![0], p.days[0].exercises![0]);
});

ok('apply: les autres exercices du jour ne sont pas modifiés', () => {
  const p = program({ exerciseId: 'e1', sets: 2, reps: 5, targetWeightKg: 0 });
  const extra = { id: 'cfg2', exerciseId: 'e2', exerciseName: 'E2', sets: 3, reps: 10, targetWeightKg: 0, restSec: 30 };
  p.days[0].exercises!.push(extra as any);
  const updated = applyProgramTargetSuggestion(p, 'e1', 'reps', 14);
  assert.equal(updated.days[0].exercises![1], extra);
});

console.log(`\n${passed} passed, ${failed} failed`);