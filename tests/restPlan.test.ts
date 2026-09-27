import assert from 'node:assert/strict';
import {
  buildExerciseSteps,
  estimatedGuidedDurationSec,
  resolveGuidedRestSec,
  resolveSetRestSec,
  resolveTransitionRestSec,
} from '../src/components/workout/workoutGuidedEngine';
import {
  appendSetRestSec,
  estimateDayDurationSec,
  removeSetRestSec,
  updateDayExerciseSetRestSec,
  updateDayExerciseTransitionRestSec,
} from '../src/utilsProgram';
import { ProgramExerciseConfig, SessionExerciseLog, WorkoutProgram, WorkoutProgramDay } from '../src/types';

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

function makeEx(
  id: string,
  name: string,
  setCount: number,
  restPlan?: number[],
  restSec = 30,
  transitionRestSec?: number
): SessionExerciseLog {
  return {
    exerciseId: id,
    exerciseName: name,
    muscleGroup: 'Full Body',
    restSec,
    restPlan,
    transitionRestSec,
    sets: Array.from({ length: setCount }, (_, i) => ({
      setNumber: i + 1,
      weightKg: 0,
      reps: 10,
      mode: 'reps',
      durationSec: 0,
      completed: false,
    })),
  };
}

// --- A. restPlan = [15, 20, 30] -> set 1 = 15, set 2 = 20, set 3 = 30 ---

ok('A1. resolveSetRestSec: restPlan par série [15,20,30] -> 15 / 20 / 30 (repos APRÈS chaque série)', () => {
  const ex = makeEx('ex-a', 'A', 4, [15, 20, 30], 99);
  assert.equal(resolveSetRestSec(ex, 0), 15);
  assert.equal(resolveSetRestSec(ex, 1), 20);
  assert.equal(resolveSetRestSec(ex, 2), 30);
});

ok('A2. restPlan: index au-delà du plan -> fallback restSec legacy (restPlan absent pour cet index)', () => {
  const ex = makeEx('ex-a', 'A', 4, [15, 20, 30], 99);
  assert.equal(resolveSetRestSec(ex, 3), 99);
});

ok('A3. resolveSetRestSec: 0 explicite dans restPlan = AUCUN repos', () => {
  const ex = makeEx('ex-a', 'A', 2, [0], 30);
  assert.equal(resolveSetRestSec(ex, 0), 0);
});

// --- B. modifier seulement l'élément 2 : [10, 25, 47] -> [10, 60, 47] ---

ok('B1. updateDayExerciseSetRestSec: ne modifie QUE restPlan[1] (10/25/47 -> 10/60/47) et complète le plan', () => {
  const program: WorkoutProgram = progWith([cfg('ex-a', 4, [10, 25, 47], 30, 45), cfg('ex-b', 2, undefined, 30)]);
  const updated = updateDayExerciseSetRestSec(program, 'day-1', 'ex-a', 1, 60);
  const a = cfgOf(updated, 'day-1', 'ex-a');
  // Le plan complété couvre les 4 séries (index 3 back-fillé sur le restSec legacy 30).
  assert.deepEqual(a.restPlan, [10, 60, 47, 30]);
  assert.equal(a.transitionRestSec, 45);
  assert.equal(a.restSec, 30);
});

// --- C. un autre exercice n'est pas modifié ---

ok('C1. modifier le restPlan de A ne touche NI B NI les autres champs/jours', () => {
  const program: WorkoutProgram = progWith([cfg('ex-a', 4, [10, 25, 47], 30, 45), cfg('ex-b', 3, [5, 5], 60)]);
  const updated = updateDayExerciseSetRestSec(program, 'day-1', 'ex-a', 1, 60);
  const b = cfgOf(updated, 'day-1', 'ex-b');
  assert.deepEqual(b.restPlan, [5, 5]);
  assert.equal(b.restSec, 60);
  assert.equal(b.sets, 3);
  const a = cfgOf(updated, 'day-1', 'ex-a');
  assert.deepEqual(a.restPlan, [10, 60, 47, 30]);
  assert.equal(a.transitionRestSec, 45);
  assert.equal(a.notes, 'note A');
});

// --- D. ajouter une série -> valeur par défaut 30 ---

ok('D1. appendSetRestSec: [15,20,30] -> [15,20,30,30] (nouvelle série repos 30 s)', () => {
  assert.deepEqual(appendSetRestSec([15, 20, 30]), [15, 20, 30, 30]);
  assert.deepEqual(appendSetRestSec(undefined), [30]);
});

// --- E. supprimer une série -> son repos est supprimé aussi ---

ok('E1. removeSetRestSec: [15,20,30,40] retire la 4e série -> [15,20,30]', () => {
  assert.deepEqual(removeSetRestSec([15, 20, 30, 40], 3), [15, 20, 30]);
});

ok('E2. removeSetRestSec: suppression d\'une série du milieu -> [15,30,40]', () => {
  assert.deepEqual(removeSetRestSec([15, 20, 30, 40], 1), [15, 30, 40]);
  assert.equal(removeSetRestSec(undefined, 0), undefined);
});

// --- F. ancien programme sans restPlan -> restSec legacy = comportement 30 s ---

ok('F1. résolution legacy: restSec=30, 4 séries, pas de restPlan -> 30 s entre chaque série', () => {
  const ex = makeEx('ex-a', 'A', 4, undefined, 30);
  assert.equal(resolveSetRestSec(ex, 0), 30);
  assert.equal(resolveSetRestSec(ex, 1), 30);
  assert.equal(resolveSetRestSec(ex, 2), 30);
});

ok('F2. estimation legacy: 4 séries restSec=30 -> 3 repos de 30 (jamais restSec x 4)', () => {
  const day: WorkoutProgramDay = {
    id: 'd',
    name: 'Test',
    muscleGroups: ['Full Body'],
    exerciseIds: ['a'],
    exercises: [{ id: 'c1', exerciseId: 'a', exerciseName: 'A', sets: 4, reps: 10, mode: 'reps', durationSec: 0, targetWeightKg: 0, restSec: 30, transitionRestSec: 60 }],
  };
  // Exécution 4 x 45 = 180 ; repos entre séries 3 x 30 = 90 ; dernier exercice -> aucun transition => 270
  assert.equal(estimateDayDurationSec(day), 270);
});

// --- G. transition: restPlan [15,20,30] + transitionRestSec 60 -> 15 / 20 / 30 / 60 ---

ok('G1. comportement classique: repos après chaque série, transition après la dernière', () => {
  const ex = makeEx('ex-a', 'A', 4, [15, 20, 30], 30, 60);
  const next = makeEx('ex-b', 'B', 1, undefined, 30);
  const steps = buildExerciseSteps([ex, next]);
  // Série 1 -> 15 ; Série 2 -> 20 ; Série 3 -> 30 (même exercice)
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[1], exercises: [ex, next], fallbackRestSec: 30, exerciseTransitionRestSec: 30 }), 15);
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[2], exercises: [ex, next], fallbackRestSec: 30, exerciseTransitionRestSec: 30 }), 20);
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[3], exercises: [ex, next], fallbackRestSec: 30, exerciseTransitionRestSec: 30 }), 30);
  // Dernière série -> transitionRestSec (60), jamais restPlan[3] (inexistant ici)
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[4], exercises: [ex, next], fallbackRestSec: 30, exerciseTransitionRestSec: 45 }), 60);
  assert.equal(resolveTransitionRestSec(ex, 45), 60);
});

ok('G2. restPlan[3] (45) NON utilisé après la dernière série quand transitionRestSec existe', () => {
  const ex = makeEx('ex-a', 'A', 4, [15, 20, 30, 45], 30, 60);
  const next = makeEx('ex-b', 'B', 1, undefined, 30);
  const steps = buildExerciseSteps([ex, next]);
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[1], exercises: [ex, next], fallbackRestSec: 30, exerciseTransitionRestSec: 30 }), 15);
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[2], exercises: [ex, next], fallbackRestSec: 30, exerciseTransitionRestSec: 30 }), 20);
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[3], exercises: [ex, next], fallbackRestSec: 30, exerciseTransitionRestSec: 30 }), 30);
  // Après la série 4 (avant B) on utilise la transition (60), PAS restPlan[3]=45
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[4], exercises: [ex, next], fallbackRestSec: 30, exerciseTransitionRestSec: 45 }), 60);
});

// --- H. dernier exercice : aucun repos de transition avant les étirements ---

ok('H1. durée estimée guidée + classique: aucun repos après le dernier set du DERNIER exercice', () => {
  // 4 séries reps (45s chacune) restPlan [15,20,30], transitionRestSec 60 (ignorée car dernier exercice)
  const ex = makeEx('ex-a', 'A', 4, [15, 20, 30], 30, 60);
  // guidé: exécution 180 + repos entre séries 15+20+30 = 245 (aucune transition finale)
  assert.equal(estimatedGuidedDurationSec([ex], [], 30, 60), 245);
  // classique: même chose via estimateDayDurationSec
  const day: WorkoutProgramDay = {
    id: 'd',
    name: 'Test',
    muscleGroups: ['Full Body'],
    exerciseIds: ['a'],
    exercises: [{ id: 'c1', exerciseId: 'a', exerciseName: 'A', sets: 4, reps: 10, mode: 'reps', durationSec: 0, targetWeightKg: 0, restSec: 30, restPlan: [15, 20, 30], transitionRestSec: 60 }],
  };
  assert.equal(estimateDayDurationSec(day), 245);
});

ok('H2. estimation (exigence 14): somme(restPlan) entre les séries + transition si exercice non final', () => {
  const day: WorkoutProgramDay = {
    id: 'd',
    name: 'Test',
    muscleGroups: ['Full Body'],
    exerciseIds: ['a', 'b'],
    exercises: [
      { id: 'c1', exerciseId: 'a', exerciseName: 'A', sets: 4, reps: 10, mode: 'reps', durationSec: 0, targetWeightKg: 0, restSec: 30, restPlan: [10, 20, 30], transitionRestSec: 45 },
      { id: 'c2', exerciseId: 'b', exerciseName: 'B', sets: 1, reps: 10, mode: 'reps', durationSec: 0, targetWeightKg: 0, restSec: 30 },
    ],
  };
  // A: exécution 180 + repos entre séries 10+20+30 = 60 + transition 45 ; B: 45 ; total 330
  assert.equal(estimateDayDurationSec(day), 330);
});

// --- I. persistance : [15,20,30] -> modifier #2 (20 -> 55) -> recharger -> [15,55,30] ---

ok('I1. updateDayExerciseSetRestSec + reload: 15/20/30 -> 15/55/30', () => {
  const program: WorkoutProgram = progWith([cfg('ex-a', 4, [15, 20, 30], 30), cfg('ex-b', 2, undefined, 40)]);
  const edited = updateDayExerciseSetRestSec(program, 'day-1', 'ex-a', 1, 55);
  // "Recharger" = relire le programme après édition (persistance via ré-ouverture)
  const a = cfgOf(edited, 'day-1', 'ex-a');
  assert.deepEqual(a.restPlan, [15, 55, 30, 30]);
  assert.equal(resolveSetRestSec({ restPlan: a.restPlan, restSec: a.restSec }, 0), 15);
  assert.equal(resolveSetRestSec({ restPlan: a.restPlan, restSec: a.restSec }, 1), 55);
  assert.equal(resolveSetRestSec({ restPlan: a.restPlan, restSec: a.restSec }, 2), 30);
  const b = cfgOf(edited, 'day-1', 'ex-b');
  assert.equal(b.restSec, 40);
  assert.equal(b.restPlan, undefined);
});

ok('I2. backfill: ancien programme sans restPlan -> l\'édition d\'UNE série crée un plan complet cohérent', () => {
  const program: WorkoutProgram = progWith([cfg('ex-a', 3, undefined, 30)]);
  const edited = updateDayExerciseSetRestSec(program, 'day-1', 'ex-a', 1, 55);
  const a = cfgOf(edited, 'day-1', 'ex-a');
  assert.deepEqual(a.restPlan, [30, 55, 30]);
});

ok('I3. updateDayExerciseTransitionRestSec: met à jour UNIQUEMENT la transition de l\'exercice cible', () => {
  const program: WorkoutProgram = progWith([cfg('ex-a', 4, [15, 20, 30], 30, 60), cfg('ex-b', 2, undefined, 40, 90)]);
  const edited = updateDayExerciseTransitionRestSec(program, 'day-1', 'ex-a', 120);
  const a = cfgOf(edited, 'day-1', 'ex-a');
  assert.equal(a.transitionRestSec, 120);
  assert.deepEqual(a.restPlan, [15, 20, 30]);
  const b = cfgOf(edited, 'day-1', 'ex-b');
  assert.equal(b.transitionRestSec, 90);
});

ok('I4. updateDayExerciseTransitionRestSec: undefined efface la valeur (fallback global)', () => {
  const program: WorkoutProgram = progWith([cfg('ex-a', 4, [15, 20, 30], 30, 60)]);
  const edited = updateDayExerciseTransitionRestSec(program, 'day-1', 'ex-a', undefined);
  const a = cfgOf(edited, 'day-1', 'ex-a');
  assert.equal(a.transitionRestSec, undefined);
  assert.equal(resolveTransitionRestSec((a as unknown) as SessionExerciseLog, 45), 45);
});

function cfg(
  exerciseId: string,
  sets: number,
  restPlan: number[] | undefined,
  restSec = 30,
  transitionRestSec?: number,
  notes = 'note A'
): ProgramExerciseConfig {
  return {
    id: `cfg-${exerciseId}`,
    exerciseId,
    exerciseName: exerciseId,
    sets,
    reps: 10,
    mode: 'reps',
    durationSec: 0,
    targetWeightKg: 0,
    restSec,
    restPlan,
    transitionRestSec,
    notes,
  };
}

function progWith(exercises: ProgramExerciseConfig[]): WorkoutProgram {
  return {
    id: 'p1',
    title: 'Programme A',
    description: '',
    daysPerWeek: 1,
    level: 'Débutant' as any,
    isActive: true,
    color: '#8b5cf6',
    days: [
      {
        id: 'day-1',
        name: 'Jour 1',
        muscleGroups: ['Full Body'],
        exerciseIds: exercises.map((e) => e.exerciseId),
        exercises,
      },
    ],
  };
}

function cfgOf(program: WorkoutProgram, dayId: string, exerciseId: string): ProgramExerciseConfig {
  const day = program.days.find((d) => d.id === dayId)!;
  return day.exercises!.find((c) => c.exerciseId === exerciseId)!;
}

console.log(`\n===== RÉSUMÉ =====`);
console.log(`${passed}/18 PASS`);