import assert from 'node:assert/strict';
import {
  buildExerciseSwapSuggestions,
  getExerciseDefaultTarget,
  getExerciseNaturalMode,
  moveProgramExerciseToDay,
  renameProgramDay,
  replaceProgramExercise,
  validateProgramData,
} from '../src/utilsProgramSwap';
import { MY_PROGRAM } from '../src/data/myProgram';
import { Exercise, ProgramExerciseConfig, WorkoutProgram } from '../src/types';

let passed = 0;
let total = 0;
function ok(name: string, fn: () => void) {
  total++;
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

// ---------------------------------------------------------------------------
// Helpers / fixtures
// ---------------------------------------------------------------------------

function ex(over: Partial<Exercise> & { id: string; name: string }): Exercise {
  return {
    primaryMuscle: 'Pectoraux',
    bodyPart: 'Torse',
    equipment: 'Poids du corps',
    difficulty: 'Débutant',
    category: 'Musculation',
    description: '',
    defaultSets: 4,
    defaultReps: 12,
    defaultRestSec: 60,
    ...over,
  } as Exercise;
}

function cfg(over: Partial<ProgramExerciseConfig> & { id: string; exerciseId: string }): ProgramExerciseConfig {
  return {
    exerciseName: over.exerciseId,
    sets: 4,
    reps: 12,
    mode: 'reps',
    durationSec: 0,
    repsPlan: [12, 12, 12, 12],
    durationPlan: [0, 0, 0, 0],
    targetWeightKg: 0,
    restSec: 45,
    ...over,
  } as ProgramExerciseConfig;
}

function program(days: WorkoutProgram['days']): WorkoutProgram {
  return {
    id: 'prog-test',
    title: 'Programme test',
    description: '',
    daysPerWeek: days.length,
    level: 'Intermédiaire',
    isActive: true,
    color: '#8b5cf6',
    days,
  };
}

// ---------------------------------------------------------------------------
// 1. Mode naturel déduit des métadonnées existantes
// ---------------------------------------------------------------------------

ok('1. mode naturel: defaultReps numérique ou texte = répétitions', () => {
  assert.equal(getExerciseNaturalMode(ex({ id: 'a', name: 'A', defaultReps: 12 })), 'reps');
  assert.equal(getExerciseNaturalMode(ex({ id: 'b', name: 'B', defaultReps: '20 reps (10/jambe)' })), 'reps');
  assert.equal(getExerciseNaturalMode(ex({ id: 'c', name: 'C', defaultReps: '10 reps / côté' })), 'reps');
  assert.equal(getExerciseNaturalMode(ex({ id: 'd', name: 'D', defaultReps: '20 rotations' })), 'reps');
  assert.equal(getExerciseNaturalMode(ex({ id: 'e', name: 'E', defaultReps: '1 fois par pied' })), 'reps');
});

ok('2. mode naturel: unité de durée dans defaultReps = minuteur', () => {
  assert.equal(getExerciseNaturalMode(ex({ id: 'a', name: 'A', defaultReps: '45 sec' })), 'timer');
  assert.equal(getExerciseNaturalMode(ex({ id: 'b', name: 'B', defaultReps: '20 sec/jambe' })), 'timer');
  assert.equal(getExerciseNaturalMode(ex({ id: 'c', name: 'C', defaultReps: '8 sec / direction' })), 'timer');
  assert.equal(getExerciseNaturalMode(ex({ id: 'd', name: 'D', defaultReps: '2 minutes' })), 'timer');
});

ok('3. cible par défaut: lue dans les métadonnées de l exercice, jamais convertie', () => {
  assert.equal(getExerciseDefaultTarget(ex({ id: 'a', name: 'A', defaultReps: 15 }), 'reps'), 15);
  assert.equal(getExerciseDefaultTarget(ex({ id: 'b', name: 'B', defaultReps: '45 sec' }), 'timer'), 45);
  assert.equal(getExerciseDefaultTarget(ex({ id: 'c', name: 'C', defaultReps: '2 minutes' }), 'timer'), 120);
  // 12 reps en mode minuteur: aucune valeur de reps n'est réinventée en secondes.
  assert.equal(getExerciseDefaultTarget(ex({ id: 'd', name: 'D', defaultReps: 12 }), 'timer'), 30);
  // Distance: pas de durée disponible, cible neutre (pas de conversion，距离 -> sec).
  assert.equal(getExerciseDefaultTarget(ex({ id: 'e', name: 'E', defaultReps: '500 mètres' }), 'timer'), 30);
});

// ---------------------------------------------------------------------------
// 2. Suggestions intelligentes à partir des métadonnées
// ---------------------------------------------------------------------------

ok('4. suggestions: même muscle principal en tête, exercice courant exclu', () => {
  const current = ex({ id: 'squat', name: 'Squats', primaryMuscle: 'Jambes', muscleGroup: 'Jambes' });
  const library = [
    current,
    ex({ id: 'far', name: 'Pompes', primaryMuscle: 'Pectoraux' }),
    ex({ id: 'lunge', name: 'Fentes', primaryMuscle: 'Jambes' }),
    ex({ id: 'chair', name: 'La chaise', primaryMuscle: 'Jambes' }),
  ];
  const suggestions = buildExerciseSwapSuggestions(current, cfg({ id: 'c1', exerciseId: 'squat' }), library, {
    limit: 5,
  });
  assert.equal(suggestions[0].exercise.id, 'lunge');
  assert.ok(!suggestions.some((s) => s.exercise.id === 'squat'), 'le courant ne doit jamais être proposé');
  assert.ok(suggestions.every((s) => s.score > 0));
  assert.ok(suggestions[0].reasons.some((r) => r.includes('Jambes')));
});

ok('5. suggestions: exercice similaire et matériel/difficulté pondérés, limite respectée', () => {
  const current = ex({
    id: 'squat',
    name: 'Squats',
    primaryMuscle: 'Jambes',
    equipment: 'Poids du corps',
    difficulty: 'Débutant',
    similarExerciseIds: ['chair'],
  });
  const library = [
    current,
    ex({ id: 'chair', name: 'La chaise', primaryMuscle: 'Abdos', equipment: 'Machines', difficulty: 'Avancé' }),
    ex({ id: 'b', name: 'B', primaryMuscle: 'Dos' }),
    ex({ id: 'c', name: 'C', primaryMuscle: 'Bras' }),
  ];
  const suggestions = buildExerciseSwapSuggestions(current, cfg({ id: 'c1', exerciseId: 'squat' }), library, {
    limit: 2,
  });
  assert.equal(suggestions.length, 2);
  assert.equal(suggestions[0].exercise.id, 'chair', 'similarExerciseIds doit primer');
  assert.ok(suggestions[0].reasons.some((r) => r.includes('similaire')));
});

ok('6. suggestions: exercice déjà présent dans la séance reste visible mais dépriorisé', () => {
  const current = ex({ id: 'squat', name: 'Squats', primaryMuscle: 'Jambes' });
  const library = [
    current,
    ex({ id: 'dup', name: 'Fentes', primaryMuscle: 'Jambes' }),
    ex({ id: 'fresh', name: 'Chaise murale', primaryMuscle: 'Jambes' }),
  ];
  const suggestions = buildExerciseSwapSuggestions(current, cfg({ id: 'c1', exerciseId: 'squat' }), library, {
    dayExerciseIds: ['dup'],
  });
  const dup = suggestions.find((s) => s.exercise.id === 'dup')!;
  const fresh = suggestions.find((s) => s.exercise.id === 'fresh')!;
  assert.ok(dup && fresh);
  assert.equal(dup.alreadyInDay, true);
  assert.equal(fresh.alreadyInDay, false);
  assert.ok(fresh.score >= dup.score);
  assert.ok(
    suggestions.indexOf(fresh) < suggestions.indexOf(dup),
    'un exercice déjà présent ne doit pas arriver avant un vrai candidat'
  );
});

ok('7. suggestions: indicateur de mode compatible aligné sur le mode de la configuration', () => {
  const current = ex({ id: 'squat', name: 'Squats', primaryMuscle: 'Jambes' });
  const library = [
    current,
    ex({ id: 'timer-ex', name: 'Gainage', primaryMuscle: 'Jambes', defaultReps: '45 sec' }),
  ];
  const repsConfig = cfg({ id: 'c1', exerciseId: 'squat', mode: 'reps' });
  const timerConfig = cfg({ id: 'c2', exerciseId: 'squat', mode: 'timer' });
  const inReps = buildExerciseSwapSuggestions(current, repsConfig, library, { limit: 3 });
  const inTimer = buildExerciseSwapSuggestions(current, timerConfig, library, { limit: 3 });
  assert.equal(inReps.find((s) => s.exercise.id === 'timer-ex')!.sameMode, false);
  assert.equal(inTimer.find((s) => s.exercise.id === 'timer-ex')!.sameMode, true);
});

// ---------------------------------------------------------------------------
// 3. Remplacement réel — configuration conservée quand le mode reste compatible
// ---------------------------------------------------------------------------

ok('8. remplacement même mode: configuration intégralement conservée', () => {
  const original = cfg({
    id: 'cfg-1',
    exerciseId: 'squat',
    exerciseName: 'Squats',
    sets: 5,
    reps: 20,
    repsPlan: [20, 20, 18, 18, 15],
    durationPlan: [30, 30, 30, 30, 30],
    mode: 'reps',
    durationSec: 30,
    targetWeightKg: 42.5,
    restSec: 60,
    restPlan: [60, 60, 45, 45, 30],
    transitionRestSec: 90,
    notes: 'Tempo lent',
  });
  const before = JSON.parse(JSON.stringify(original));
  const p = program([
    { id: 'd1', name: 'J1', muscleGroups: ['Jambes'], exerciseIds: ['squat', 'other'], exercises: [original, cfg({ id: 'cfg-2', exerciseId: 'other' })] },
    { id: 'd2', name: 'J2', muscleGroups: ['Dos'], exerciseIds: ['back'], exercises: [cfg({ id: 'cfg-3', exerciseId: 'back' })] },
  ]);
  const snapshot = JSON.parse(JSON.stringify(p));
  const next = ex({ id: 'chaise', name: 'La chaise', primaryMuscle: 'Jambes', defaultReps: 12 });

  const result = replaceProgramExercise(p, 'd1', 'cfg-1', next, 'keep');
  assert.ok(result.outcome, 'le remplacement doit aboutir');
  const day = result.program.days.find((d) => d.id === 'd1')!;
  const replaced = day.exercises![0];

  // Identité du créneau + position conservés (remplacement, pas suppression/ajout).
  assert.equal(replaced.id, 'cfg-1');
  assert.equal(day.exercises!.length, 2);
  assert.equal(day.exercises![1].id, 'cfg-2');
  assert.equal(replaced.exerciseId, 'chaise');
  assert.equal(replaced.exerciseName, 'La chaise');
  // TOUT le reste strictement identique.
  for (const key of Object.keys(before) as (keyof ProgramExerciseConfig)[]) {
    if (key === 'exerciseId' || key === 'exerciseName') continue;
    assert.deepEqual(replaced[key], before[key], `champ altéré: ${key}`);
  }
  assert.equal(result.outcome!.modeChanged, false);
  assert.equal(result.outcome!.requiresExplicitModeChoice, false);
  assert.equal(result.outcome!.activeTarget, 20);
  // exerciseIds resynchronisé, autre séance intacte, entrée d'origine non mutée.
  assert.deepEqual(day.exerciseIds, ['chaise', 'other']);
  assert.deepEqual(result.program.days[1], snapshot.days[1]);
  assert.deepEqual(p, snapshot, 'le programme reçu ne doit jamais être muté');
});

ok('9. remplacement: position et exerciseIds d une séance multi-exercices', () => {
  const p = program([
    {
      id: 'd1',
      name: 'J1',
      muscleGroups: ['Jambes'],
      exerciseIds: ['a', 'b', 'c'],
      exercises: [
        cfg({ id: 'c1', exerciseId: 'a', exerciseName: 'A' }),
        cfg({ id: 'c2', exerciseId: 'b', exerciseName: 'B' }),
        cfg({ id: 'c3', exerciseId: 'c', exerciseName: 'C' }),
      ],
    },
  ]);
  const result = replaceProgramExercise(
    p,
    'd1',
    'c2',
    ex({ id: 'z', name: 'Z', primaryMuscle: 'Jambes' }),
    'keep'
  );
  const day = result.program.days[0];
  assert.deepEqual(day.exercises!.map((c) => c.exerciseId), ['a', 'z', 'c']);
  assert.deepEqual(day.exerciseIds, ['a', 'z', 'c']);
  assert.deepEqual(day.exercises!.map((c) => c.id), ['c1', 'c2', 'c3']);
});

// ---------------------------------------------------------------------------
// 4. REPS <-> TIMER : gestion explicite, aucune conversion automatique
// ---------------------------------------------------------------------------

ok('10. mode incompatible + "keep": aucun changement, conversion interdite', () => {
  const timerCfgSrc = cfg({
    id: 'cfg-1',
    exerciseId: 'plank',
    exerciseName: 'Planche',
    sets: 4,
    mode: 'timer',
    durationPlan: [45, 45, 60, 60],
    durationSec: 45,
    repsPlan: [10, 10, 10, 10],
    reps: 10,
  });
  const p = program([{ id: 'd1', name: 'J1', muscleGroups: ['Abdos'], exerciseIds: ['plank'], exercises: [timerCfgSrc] }]);
  const next = ex({ id: 'squat', name: 'Squats', primaryMuscle: 'Jambes', defaultReps: 20 });

  const result = replaceProgramExercise(p, 'd1', 'cfg-1', next, 'keep');
  const replaced = result.program.days[0].exercises![0];
  assert.equal(result.outcome!.requiresExplicitModeChoice, true, 'le changement de mode doit être signalé');
  assert.equal(result.outcome!.modeChanged, false);
  assert.equal(replaced.mode, 'timer');
  // Aucune conversion: le plan de durées ET celui de répétitions sont intacts.
  assert.deepEqual(replaced.durationPlan, [45, 45, 60, 60]);
  assert.deepEqual(replaced.repsPlan, [10, 10, 10, 10]);
  assert.equal(replaced.durationSec, 45);
  assert.equal(replaced.exerciseId, 'squat');
});

ok('11. mode incompatible + "adopt": cible = défaut du nouvel exercice, pas l ancien plan', () => {
  const timerCfgSrc = cfg({
    id: 'cfg-1',
    exerciseId: 'plank',
    exerciseName: 'Planche',
    sets: 3,
    mode: 'timer',
    durationPlan: [45, 45, 45],
    durationSec: 45,
    repsPlan: [12, 12, 12],
    reps: 12,
    restPlan: [30, 30, 30],
    notes: 'respirer',
  });
  const p = program([{ id: 'd1', name: 'J1', muscleGroups: ['Abdos'], exerciseIds: ['plank'], exercises: [timerCfgSrc] }]);
  const next = ex({ id: 'squat', name: 'Squats', primaryMuscle: 'Jambes', defaultReps: 20 });

  const result = replaceProgramExercise(p, 'd1', 'cfg-1', next, 'adopt');
  const replaced = result.program.days[0].exercises![0];
  assert.equal(result.outcome!.modeChanged, true);
  assert.equal(result.outcome!.modeAfter, 'reps');
  assert.equal(replaced.mode, 'reps');
  // 20 = defaultReps du nouvel exercice; 45 (l ancien timer) n'est PAS réutilisé.
  assert.deepEqual(replaced.repsPlan, [20, 20, 20]);
  assert.equal(replaced.reps, 20);
  // Le plan de durées reste celui de l'utilisateur: pas de conversion.
  assert.deepEqual(replaced.durationPlan, [45, 45, 45]);
  assert.equal(replaced.durationSec, 45);
  // Structure et repos conservés.
  assert.equal(replaced.sets, 3);
  assert.deepEqual(replaced.restPlan, [30, 30, 30]);
  assert.equal(replaced.restSec, 45);
  assert.equal(replaced.notes, 'respirer');
  assert.equal(replaced.transitionRestSec, undefined);
  assert.equal(result.outcome!.activeTarget, 20);
});

ok('12. "adopt" vers le minuteur: durées issues du nouvel exercice, reps non converties', () => {
  const repsCfgSrc = cfg({
    id: 'cfg-1',
    exerciseId: 'squat',
    exerciseName: 'Squats',
    sets: 2,
    mode: 'reps',
    repsPlan: [20, 20],
    reps: 20,
    durationPlan: [0, 0],
  });
  const p = program([{ id: 'd1', name: 'J1', muscleGroups: ['Jambes'], exerciseIds: ['squat'], exercises: [repsCfgSrc] }]);
  const next = ex({ id: 'chair', name: 'La chaise', primaryMuscle: 'Jambes', defaultReps: '45 sec' });

  const result = replaceProgramExercise(p, 'd1', 'cfg-1', next, 'adopt');
  const replaced = result.program.days[0].exercises![0];
  assert.equal(replaced.mode, 'timer');
  assert.deepEqual(replaced.durationPlan, [45, 45]);
  assert.equal(replaced.durationSec, 45);
  // Les répétitions ne sont pas réécrites en secondes.
  assert.deepEqual(replaced.repsPlan, [20, 20]);
  assert.equal(replaced.reps, 20);
});

ok('13. remplacement: cibles inconnues gérées sans erreur ni écriture', () => {
  const p = program([{ id: 'd1', name: 'J1', muscleGroups: ['Jambes'], exerciseIds: ['a'], exercises: [cfg({ id: 'c1', exerciseId: 'a' })] }]);
  const snapshot = JSON.parse(JSON.stringify(p));
  const next = ex({ id: 'z', name: 'Z' });
  assert.equal(replaceProgramExercise(p, 'unknown-day', 'c1', next, 'keep').outcome, null);
  assert.equal(replaceProgramExercise(p, 'd1', 'unknown-cfg', next, 'keep').outcome, null);
  assert.equal(replaceProgramExercise(p, 'd1', 'c1', next, 'keep').program === p, false);
  assert.deepEqual(p, snapshot);
});

// ---------------------------------------------------------------------------
// 5. Renommage de séance
// ---------------------------------------------------------------------------

ok('14. renommage: seul le nom change, contenu intact, nom nettoyé', () => {
  const p = program([
    {
      id: 'd1',
      name: 'Ancien nom',
      dayOfWeek: 'Mardi',
      scheduledTime: '18:00',
      muscleGroups: ['Jambes'],
      exerciseIds: ['a'],
      exercises: [cfg({ id: 'c1', exerciseId: 'a' })],
      stretches: [{ id: 's1', name: 'Chat', targetArea: 'Dos', durationSec: 30, instruction: '' }],
      notes: 'notes',
    },
  ]);
  const snapshot = JSON.parse(JSON.stringify(p));
  const result = renameProgramDay(p, 'd1', '  Bas   du corps   v2  ');
  assert.equal(result.changed, true);
  assert.equal(result.name, 'Bas du corps v2');
  const day = result.program.days[0];
  assert.equal(day.name, 'Bas du corps v2');
  assert.equal(day.dayOfWeek, 'Mardi');
  assert.equal(day.scheduledTime, '18:00');
  assert.deepEqual(day.muscleGroups, ['Jambes']);
  assert.deepEqual(day.exercises, snapshot.days[0].exercises);
  assert.deepEqual(day.stretches, snapshot.days[0].stretches);
  assert.equal(day.notes, 'notes');
  assert.equal(day.id, 'd1');
  assert.deepEqual(p, snapshot, 'le programme reçu ne doit jamais être muté');
});

ok('15. renommage: nom vide refusé, séance inconnue refusée, longueur bornée', () => {
  const p = program([{ id: 'd1', name: 'J1', muscleGroups: ['Dos'], exerciseIds: [], exercises: [] }]);
  assert.equal(renameProgramDay(p, 'd1', '   ').changed, false);
  assert.ok(renameProgramDay(p, 'd1', '   ').error);
  assert.equal(renameProgramDay(p, 'missing', 'X').changed, false);
  const long = renameProgramDay(p, 'd1', 'a'.repeat(120));
  assert.equal(long.name.length, 60);
  assert.equal(long.program.days[0].name.length, 60);
});

// ---------------------------------------------------------------------------
// 6. Conservation des données lors des déplacements entre séances
// ---------------------------------------------------------------------------

ok('16. déplacement: configuration complète conservée et exerciseIds resynchronisés', () => {
  const rich = cfg({
    id: 'c1',
    exerciseId: 'squat',
    sets: 5,
    repsPlan: [20, 20, 20, 20, 20],
    restPlan: [30, 30, 30, 30, 30],
    targetWeightKg: 40,
    restSec: 30,
    transitionRestSec: 60,
    notes: 'gouttière',
    mode: 'reps',
  });
  const p = program([
    { id: 'd1', name: 'J1', muscleGroups: ['Jambes'], exerciseIds: ['squat', 'lunge'], exercises: [rich, cfg({ id: 'c2', exerciseId: 'lunge' })] },
    { id: 'd2', name: 'J2', muscleGroups: ['Dos'], exerciseIds: ['pull'], exercises: [cfg({ id: 'c3', exerciseId: 'pull' })] },
    { id: 'd3', name: 'J3', muscleGroups: ['Abdos'], exerciseIds: ['plank'], exercises: [cfg({ id: 'c4', exerciseId: 'plank' })] },
  ]);
  const snapshot = JSON.parse(JSON.stringify(p));
  const result = moveProgramExerciseToDay(p, 'd1', 'd2', 'c1');
  assert.equal(result.changed, true);
  const from = result.program.days[0];
  const to = result.program.days[1];
  assert.deepEqual(from.exercises!.map((c) => c.id), ['c2']);
  assert.deepEqual(from.exerciseIds, ['lunge']);
  assert.deepEqual(to.exercises!.map((c) => c.id), ['c3', 'c1'], 'ajouté en fin de séance');
  assert.deepEqual(to.exerciseIds, ['pull', 'squat']);
  // La configuration déplacée est identique au bit près.
  assert.deepEqual(to.exercises![1], snapshot.days[0].exercises[0]);
  // La troisième séance n'est pas touchée.
  assert.deepEqual(result.program.days[2], snapshot.days[2]);
  assert.deepEqual(p, snapshot);
});

ok('17. déplacement vers une séance au format ancien: aucun identifiant perdu', () => {
  const rich = cfg({ id: 'c1', exerciseId: 'squat', sets: 4, repsPlan: [15, 15, 15, 15] });
  const p = program([
    { id: 'd1', name: 'J1', muscleGroups: ['Jambes'], exerciseIds: ['squat'], exercises: [rich] },
    // séance legacy: exerciseIds seuls, pas de exercises[]
    { id: 'd2', name: 'J2', muscleGroups: ['Dos'], exerciseIds: ['pull-up', 'row'] },
  ]);
  const result = moveProgramExerciseToDay(
    p,
    'd1',
    'd2',
    'c1',
    [ex({ id: 'pull-up', name: 'Tractions', defaultSets: 3, defaultReps: 6, defaultRestSec: 120 })]
  );
  assert.equal(result.changed, true);
  const to = result.program.days[1];
  assert.deepEqual(to.exerciseIds, ['pull-up', 'row', 'squat'], 'les ids legacy doivent survivre');
  assert.equal(to.exercises!.length, 3);
  assert.equal(to.exercises![0].exerciseName, 'Tractions');
  assert.deepEqual(to.exercises![2], rich);
});

ok('18. déplacement: cas limites (même séance, config inconnue) sans écriture', () => {
  const p = program([
    { id: 'd1', name: 'J1', muscleGroups: ['Jambes'], exerciseIds: ['squat'], exercises: [cfg({ id: 'c1', exerciseId: 'squat' })] },
    { id: 'd2', name: 'J2', muscleGroups: ['Dos'], exerciseIds: ['pull'], exercises: [cfg({ id: 'c2', exerciseId: 'pull' })] },
  ]);
  const snapshot = JSON.parse(JSON.stringify(p));
  assert.equal(moveProgramExerciseToDay(p, 'd1', 'd1', 'c1').changed, false);
  assert.equal(moveProgramExerciseToDay(p, 'd1', 'd2', 'nope').changed, false);
  assert.equal(moveProgramExerciseToDay(p, 'd1', 'missing', 'c1').changed, false);
  assert.deepEqual(p, snapshot);
});

// ---------------------------------------------------------------------------
// 7. Contrôles de cohérence (advisory)
// ---------------------------------------------------------------------------

ok('19. contrôles: programme cohérent = aucun signalement', () => {
  const p = program([
    { id: 'd1', name: 'J1', muscleGroups: ['Jambes'], exerciseIds: ['a'], exercises: [cfg({ id: 'c1', exerciseId: 'a' })] },
  ]);
  assert.deepEqual(validateProgramData(p, [ex({ id: 'a', name: 'A' })]), []);
});

ok('20. contrôles: exerciseIds désynchronisés et plan incohérent signalés', () => {
  const p = program([
    {
      id: 'd1',
      name: 'J1',
      muscleGroups: ['Jambes'],
      exerciseIds: ['a', 'ghost'],
      exercises: [cfg({ id: 'c1', exerciseId: 'a', sets: 4, repsPlan: [12, 12] })],
    },
  ]);
  const codes = validateProgramData(p, [ex({ id: 'a', name: 'A' })]).map((i) => i.code);
  assert.ok(codes.includes('day-ids-out-of-sync'));
  assert.ok(codes.includes('config-plan-length'));
});

ok('21. contrôles: exercice inconnu, doublon, minuteur vide, nom vide', () => {
  const p = program([
    {
      id: 'd1',
      name: '   ',
      muscleGroups: ['Jambes'],
      exerciseIds: ['a', 'a', 'ghost'],
      exercises: [
        cfg({ id: 'c1', exerciseId: 'a' }),
        cfg({ id: 'c2', exerciseId: 'a' }),
        cfg({ id: 'c3', exerciseId: 'ghost', mode: 'timer', durationPlan: [0, 0, 0, 0], durationSec: 0 }),
      ],
    },
  ]);
  const codes = validateProgramData(p, [ex({ id: 'a', name: 'A' })]).map((i) => i.code);
  assert.ok(codes.includes('day-name-empty'));
  assert.ok(codes.includes('config-duplicate-exercise'));
  assert.ok(codes.includes('config-unknown-exercise'));
  assert.ok(codes.includes('config-timer-empty'));
});

ok('22. contrôles: séance vide et séance legacy détectées sans erreur', () => {
  const p = program([
    { id: 'd1', name: 'Vide', muscleGroups: ['Dos'], exerciseIds: [], exercises: [] },
    { id: 'd2', name: 'Legacy', muscleGroups: ['Dos'], exerciseIds: ['a'] },
  ]);
  const codes = validateProgramData(p, []).map((i) => i.code);
  assert.ok(codes.includes('day-empty'));
  assert.ok(codes.includes('day-not-migrated'));
});

// ---------------------------------------------------------------------------
// 8. Cas réel: le programme utilisateur livré (MY_PROGRAM)
// ---------------------------------------------------------------------------

ok('23. MY_PROGRAM: remplacement réel sur une séance Lower sans perte de données', () => {
  const before = JSON.parse(JSON.stringify(MY_PROGRAM));
  const dayId = 'day-lower-mardi';
  const squat = MY_PROGRAM.days.find((d) => d.id === dayId)!.exercises!.find((c) => c.exerciseId === 'ex-bodyweight-squat')!;
  const result = replaceProgramExercise(
    MY_PROGRAM,
    dayId,
    squat.id,
    ex({ id: 'ex-bulgarian', name: 'Squat bulgare', primaryMuscle: 'Jambes', defaultReps: 10, defaultSets: 4 }),
    'keep'
  );
  assert.ok(result.outcome);
  const day = result.program.days.find((d) => d.id === dayId)!;
  const replaced = day.exercises!.find((c) => c.id === squat.id)!;
  assert.equal(replaced.exerciseId, 'ex-bulgarian');
  assert.equal(replaced.exerciseName, 'Squat bulgare');
  assert.equal(replaced.sets, 5);
  assert.deepEqual(replaced.repsPlan, squat.repsPlan);
  assert.equal(replaced.restSec, squat.restSec);
  assert.equal(replaced.transitionRestSec, squat.transitionRestSec);
  assert.equal(replaced.notes, squat.notes, 'les notes de coaching suivent la configuration');
  assert.equal(replaced.restPlan, squat.restPlan);
  assert.equal(day.exercises!.length, before.days.find((d: { id: string }) => d.id === dayId)!.exercises!.length);
  assert.deepEqual(day.exerciseIds, day.exercises!.map((c) => c.exerciseId));
  // Les autres jours du programme sont intacts.
  assert.deepEqual(result.program.days.find((d) => d.id === 'day-lower-jeudi'), before.days.find((d: { id: string }) => d.id === 'day-lower-jeudi'));
  assert.deepEqual(MY_PROGRAM, before, 'MY_PROGRAM ne doit jamais être muté');
});

ok('24. MY_PROGRAM: les séances réelles ne contiennent aucun signalement de cohérence', () => {
  assert.deepEqual(validateProgramData(MY_PROGRAM, []), []);
});

console.log(`\n===== RÉSUMÉ LOT D =====`);
console.log(`${passed}/${total} PASS`);
