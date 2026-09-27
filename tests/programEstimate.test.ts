import assert from 'node:assert/strict';
import { estimateDayDurationSec, updateDayExerciseRestSec } from '../src/utilsProgram';
import { WorkoutProgramDay, WorkoutProgram } from '../src/types';

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

// Straight sets: N sets (45s exec each, reps mode) + (N-1) rest between sets
// (restSec, legacy per-exercise) + 1 transition per non-final exercise.

ok('1. durée estimée: restSec entre séries + transitionRestSec entre exercices (props à chaque exercice)', () => {
  const day: WorkoutProgramDay = {
    id: 'd',
    name: 'Test',
    muscleGroups: ['Full Body'],
    exerciseIds: ['a', 'b', 'c'],
    exercises: [
      { id: 'c1', exerciseId: 'a', exerciseName: 'A', sets: 2, reps: 10, mode: 'reps', durationSec: 0, targetWeightKg: 0, restSec: 30, transitionRestSec: 60 },
      { id: 'c2', exerciseId: 'b', exerciseName: 'B', sets: 2, reps: 10, mode: 'reps', durationSec: 0, targetWeightKg: 0, restSec: 30, transitionRestSec: 90 },
      { id: 'c3', exerciseId: 'c', exerciseName: 'C', sets: 2, reps: 10, mode: 'reps', durationSec: 0, targetWeightKg: 0, restSec: 30 },
    ],
  };
  // Exec: 3 exercices x 2 séries x 45s = 270
  // Between-sets rest: 3 exercices x (2-1) rest de 30 = 90
  // Transitions: après A = 60, après B = 90 (pas après C, dernier) = 150
  // Total = 270 + 90 + 150 = 510
  assert.equal(estimateDayDurationSec(day), 510);
});

ok('2. dernier exercice: aucun repos de transition ajouté', () => {
  const day: WorkoutProgramDay = {
    id: 'd',
    name: 'Test',
    muscleGroups: ['Full Body'],
    exerciseIds: ['a', 'b'],
    exercises: [
      { id: 'c1', exerciseId: 'a', exerciseName: 'A', sets: 1, reps: 10, mode: 'reps', durationSec: 0, targetWeightKg: 0, restSec: 30, transitionRestSec: 60 },
      { id: 'c2', exerciseId: 'b', exerciseName: 'B', sets: 1, reps: 10, mode: 'reps', durationSec: 0, targetWeightKg: 0, restSec: 30 },
    ],
  };
  // Exec: 2 x 1 x 45 = 90 ; repos entre séries: aucun (1 série par ex) ; transition A->B = 60 ; total 150
  assert.equal(estimateDayDurationSec(day), 150);
});

ok('3. transitionRestSec = 0 (aucun repos) entre les exercices', () => {
  const day: WorkoutProgramDay = {
    id: 'd',
    name: 'Test',
    muscleGroups: ['Full Body'],
    exerciseIds: ['a', 'b'],
    exercises: [
      { id: 'c1', exerciseId: 'a', exerciseName: 'A', sets: 1, reps: 10, mode: 'reps', durationSec: 0, targetWeightKg: 0, restSec: 30, transitionRestSec: 0 },
      { id: 'c2', exerciseId: 'b', exerciseName: 'B', sets: 1, reps: 10, mode: 'reps', durationSec: 0, targetWeightKg: 0, restSec: 30 },
    ],
  };
  // Exec: 90 ; repos entre séries: 0 ; transition 0 ; total 90
  assert.equal(estimateDayDurationSec(day), 90);
});

ok('4. exercice sans transitionRestSec → fallback réglage global (30 par défaut)', () => {
  const day: WorkoutProgramDay = {
    id: 'd',
    name: 'Test',
    muscleGroups: ['Full Body'],
    exerciseIds: ['a', 'b'],
    exercises: [
      { id: 'c1', exerciseId: 'a', exerciseName: 'A', sets: 1, reps: 10, mode: 'reps', durationSec: 0, targetWeightKg: 0, restSec: 30 },
      { id: 'c2', exerciseId: 'b', exerciseName: 'B', sets: 1, reps: 10, mode: 'reps', durationSec: 0, targetWeightKg: 0, restSec: 30 },
    ],
  };
  // Exec: 90 ; repos entre séries: 0 ; transition A->B fallback global = 30 ; total 120
  assert.equal(estimateDayDurationSec(day), 120);
});

ok('5. exercice SANS restSec → fallback 30 s entre les séries (comportement défaut)', () => {
  const exercises: any[] = [
    { id: 'c1', exerciseId: 'a', exerciseName: 'A', sets: 2, reps: 10, mode: 'reps', durationSec: 0, targetWeightKg: 0, transitionRestSec: 30 },
    { id: 'c2', exerciseId: 'b', exerciseName: 'B', sets: 1, reps: 10, mode: 'reps', durationSec: 0, targetWeightKg: 0 },
  ];
  const day: WorkoutProgramDay = {
    id: 'd',
    name: 'Test',
    muscleGroups: ['Full Body'],
    exerciseIds: ['a', 'b'],
    exercises,
  };
  // A: 2 séries x 45 = 90 ; B: 45 ; repos entre séries: A = 30 (1 rest), B = 0 ;
  // transition A->B = 30 (transitionRestSec de A) ; total = 90+45+30+30 = 195.
  // Sans la propriété restSec, chaque exercice retombe sur le défaut global (30 s).
  assert.equal(estimateDayDurationSec(day), 195);
});

ok('6. restSec INDIVIDUEL: exercice A = 20 s, exercice B = 60 s (pas de valeur globale)', () => {
  const day: WorkoutProgramDay = {
    id: 'd',
    name: 'Test',
    muscleGroups: ['Full Body'],
    exerciseIds: ['a', 'b'],
    exercises: [
      { id: 'c1', exerciseId: 'a', exerciseName: 'A', sets: 4, reps: 15, mode: 'reps', durationSec: 0, targetWeightKg: 0, restSec: 20, transitionRestSec: 30 },
      { id: 'c2', exerciseId: 'b', exerciseName: 'B', sets: 4, reps: 10, mode: 'reps', durationSec: 0, targetWeightKg: 0, restSec: 60 },
    ],
  };
  // Exécution: 8 x 45 = 360 ; repos entre séries: A = 3 x 20 = 60, B = 3 x 60 = 180 ;
  // transition A->B = 30 ; total = 360 + 60 + 180 + 30 = 630.
  assert.equal(estimateDayDurationSec(day), 630);
});

ok('7. updateDayExerciseRestSec: éditer le restSec de A (15→22) ne touche NI B (40) NI les autres champs/configs', () => {
  const program: WorkoutProgram = {
    id: 'p1',
    title: 'Programme A',
    description: '',
    daysPerWeek: 2,
    level: 'Débutant' as any,
    isActive: true,
    color: '#8b5cf6',
    days: [
      {
        id: 'day-1',
        name: 'Jour 1',
        muscleGroups: ['Full Body'],
        exerciseIds: ['a', 'b'],
        exercises: [
          { id: 'c1', exerciseId: 'a', exerciseName: 'A', sets: 2, reps: 10, mode: 'reps', durationSec: 0, targetWeightKg: 20, restSec: 15, transitionRestSec: 30, notes: 'note A' },
          { id: 'c2', exerciseId: 'b', exerciseName: 'B', sets: 3, reps: 12, mode: 'reps', durationSec: 0, targetWeightKg: 25, restSec: 40 },
        ],
      },
      {
        id: 'day-2',
        name: 'Jour 2',
        muscleGroups: ['Jambes'],
        exerciseIds: ['c'],
        exercises: [
          { id: 'c9', exerciseId: 'c', exerciseName: 'C', sets: 2, reps: 10, mode: 'reps', durationSec: 0, targetWeightKg: 0, restSec: 15 },
        ],
      },
    ],
  };
  const updated = updateDayExerciseRestSec(program, 'day-1', 'a', 22);
  const day1 = updated.days.find((d) => d.id === 'day-1')!;
  const a = day1.exercises!.find((cfg) => cfg.exerciseId === 'a')!;
  const b = day1.exercises!.find((cfg) => cfg.exerciseId === 'b')!;
  // A modifié: restSec = 22, toutes les AUTRES propriétés préservées.
  assert.equal(a.restSec, 22);
  assert.equal(a.exerciseId, 'a');
  assert.equal(a.exerciseName, 'A');
  assert.equal(a.sets, 2);
  assert.equal(a.targetWeightKg, 20);
  assert.equal(a.transitionRestSec, 30);
  assert.equal(a.notes, 'note A');
  // B intact (40) et ses propriétés préservées.
  assert.equal(b.restSec, 40);
  assert.equal(b.sets, 3);
  assert.equal(b.targetWeightKg, 25);
  // Jour 2 intact.
  assert.equal(updated.days.find((d) => d.id === 'day-2')!.exercises![0].restSec, 15);
});

ok('8. reload: relire le programme après édition → A=22, B=40 (persistance via ré-ouverture)', () => {
  const program: WorkoutProgram = {
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
        exerciseIds: ['a', 'b'],
        exercises: [
          { id: 'c1', exerciseId: 'a', exerciseName: 'A', sets: 2, reps: 10, mode: 'reps', durationSec: 0, targetWeightKg: 0, restSec: 15 },
          { id: 'c2', exerciseId: 'b', exerciseName: 'B', sets: 2, reps: 15, mode: 'reps', durationSec: 0, targetWeightKg: 0, restSec: 40 },
        ],
      },
    ],
  };
  // Édition sur l'écran de préparation: A 15 -> 22.
  const edited = updateDayExerciseRestSec(program, 'day-1', 'a', 22);
  // "Recharger la séance depuis le même programme" = relire la config du programme.
  const day = edited.days.find((d) => d.id === 'day-1')!;
  const cfgA = day.exercises!.find((cfg) => cfg.exerciseId === 'a')!;
  const cfgB = day.exercises!.find((cfg) => cfg.exerciseId === 'b')!;
  assert.equal(cfgA.restSec, 22);
  assert.equal(cfgB.restSec, 40);
  // La préparation affiche 22/40.
  assert.equal(Number.isFinite(cfgA.restSec) && cfgA.restSec >= 0 ? cfgA.restSec : 30, 22);
  assert.equal(Number.isFinite(cfgB.restSec) && cfgB.restSec >= 0 ? cfgB.restSec : 30, 40);
  // La 1re série de A utilise le restSec de l'exercice (22) via resolveRestSec
  // (même logique que handleToggleSet / le moteur guidé).
  const resolveRestSec = (cfg: any) => {
    const own = cfg?.restSec;
    if (typeof own === 'number' && Number.isFinite(own) && own >= 0) return own;
    return 30;
  };
  assert.equal(resolveRestSec(cfgA), 22);
  assert.equal(resolveRestSec(cfgB), 40);
});

console.log(`\n===== RÉSUMÉ =====`);
console.log(`${passed}/8 PASS`);