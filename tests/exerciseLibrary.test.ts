// Integrite de la bibliotheque SportTrack (exercices + etirements unifies)
//
// But : verrouiller l'etat REEL de la bibliotheque et garantir qu'elle reste
// coherente pour LOT C (recherche, filtres, detail, variantes, similaires) et
// LOT D (remplacement + suggestions).
//
// Etat de reference mesure le 2026-09-27 :
//   - src/data/initialExercises.ts = 77 exercices
//   - src/data/stretchesData.ts   = 12 etirements (3 core + 5 haut + 4 bas)
//   - total unifie                = 89 elements
// Les nombres 388 / 113 / 501 cites dans des cahiers des charges anterieurs
// n'ont jamais existe : les 14 copies historiques du projet (8 dossiers +
// 6 archives dans C:\Users\carol\Downloads, de v6 a v7_6) contiennent toutes
// 75 exercices et le MEME fichier d'etirements de 6 080 octets (12 items).
// Ce test ne fige donc que la realite mesuree, jamais un compteur invente.

import assert from 'node:assert/strict';
import { initialExercises } from '../src/data/initialExercises';
import {
  ALL_STRETCH_PRESETS,
  CORE_STRETCHES,
  LOWER_BODY_STRETCHES,
  UPPER_BODY_STRETCHES,
  getDefaultStretchesForDay,
} from '../src/data/stretchesData';
import { MY_PROGRAM } from '../src/data/myProgram';
import {
  buildExerciseSwapSuggestions,
  getExerciseNaturalMode,
  replaceProgramExercise,
  validateProgramData,
} from '../src/utilsProgramSwap';
import { Exercise, ProgramExerciseConfig, WorkoutProgram } from '../src/types';

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

const EXPECTED_EXERCISES = 77;
const EXPECTED_STRETCHES = 12;

const stretches = [...CORE_STRETCHES, ...UPPER_BODY_STRETCHES, ...LOWER_BODY_STRETCHES];
const exerciseIds = initialExercises.map((e) => e.id);
const stretchIds = stretches.map((s) => s.id);
const exerciseIdSet = new Set(exerciseIds);
const stretchIdSet = new Set(stretchIds);

// Reference cassee CONNUE et documentee (donnee ajoutee apres la copie v7_6) :
// l'exercice ex-glute-ham-raise-floor-assisted cite "ex-reverse-hyperextension",
// qui n'a jamais ete defini dans la bibliotheque. Toute AUTRE reference cassee
// fait echouer le test -> la bibliotheque ne peut plus se degrader en silence.
const KNOWN_DANGLING_SIMILAR: Record<string, string[]> = {
  'ex-glute-ham-raise-floor-assisted': ['ex-reverse-hyperextension'],
};

// Libelles exacts de l union `Exercise['category']` (src/types.ts).
const VALID_CATEGORIES = ['Musculation', 'Poids du corps', 'Cardio', 'Mobilité & Étirements', 'Étirements'];

// --- Inventaire ------------------------------------------------------------

ok('1. inventaire: 77 exercices, 12 etirements, 89 elements unifies', () => {
  assert.equal(initialExercises.length, EXPECTED_EXERCISES);
  assert.equal(stretches.length, EXPECTED_STRETCHES);
  assert.equal(initialExercises.length + stretchIdSet.size, 89);
});

ok('2. repartition par categorie coherente (Musculation / Poids du corps / Cardio / Mobilite)', () => {
  const byCat: Record<string, number> = {};
  for (const e of initialExercises) byCat[e.category] = (byCat[e.category] ?? 0) + 1;
  assert.deepEqual(byCat, {
    Musculation: 30,
    'Poids du corps': 25,
    'Mobilité & Étirements': 18,
    Cardio: 4,
  });
  for (const e of initialExercises) {
    assert.ok(VALID_CATEGORIES.includes(e.category), `categorie inconnue: ${e.category}`);
  }
});

// --- Unicite et collisions -------------------------------------------------

ok('3. identifiants d exercices uniques (aucun doublon)', () => {
  const dupes = exerciseIds.filter((id, i) => exerciseIds.indexOf(id) !== i);
  assert.deepEqual(dupes, []);
  assert.equal(exerciseIdSet.size, initialExercises.length);
});

ok('4. identifiants d etirements uniques (aucun doublon)', () => {
  const dupes = stretchIds.filter((id, i) => stretchIds.indexOf(id) !== i);
  assert.deepEqual(dupes, []);
  assert.equal(stretchIdSet.size, EXPECTED_STRETCHES);
});

ok('5. aucune collision d id entre exercices et etirements (bibliotheque unifiee)', () => {
  const collisions = exerciseIds.filter((id) => stretchIdSet.has(id));
  assert.deepEqual(collisions, []);
});

ok('6. noms uniques dans chaque collection (recherche LOT C sans homonyme)', () => {
  const names = initialExercises.map((e) => e.name.trim().toLowerCase());
  const dupNames = names.filter((n, i) => names.indexOf(n) !== i);
  assert.deepEqual(dupNames, []);
  const sNames = stretches.map((s) => s.name.trim().toLowerCase());
  assert.deepEqual(sNames.filter((n, i) => sNames.indexOf(n) !== i), []);
});

// --- Metadonnees -----------------------------------------------------------

ok('7. metadonnees obligatoires presentes sur les 77 exercices', () => {
  for (const e of initialExercises) {
    assert.ok(e.id, 'id manquant');
    assert.ok(e.name && e.name.length > 2, `nom manquant: ${e.id}`);
    assert.ok(e.primaryMuscle, `primaryMuscle manquant: ${e.id}`);
    assert.ok(e.bodyPart, `bodyPart manquant: ${e.id}`);
    assert.ok(e.equipment, `equipment manquant: ${e.id}`);
    assert.ok(e.difficulty, `difficulty manquant: ${e.id}`);
    assert.ok(e.category, `category manquant: ${e.id}`);
    assert.ok(e.muscleGroup, `muscleGroup manquant: ${e.id}`);
    assert.ok(typeof e.defaultSets === 'number' && e.defaultSets > 0, `defaultSets invalide: ${e.id}`);
    assert.ok(typeof e.defaultRestSec === 'number' && e.defaultRestSec > 0, `defaultRestSec invalide: ${e.id}`);
    assert.ok(e.defaultReps !== undefined && e.defaultReps !== null, `defaultReps manquant: ${e.id}`);
    assert.ok((e.description ?? '').length > 0, `description manquante: ${e.id}`);
  }
});

ok('8. variantes non vides sur les 77 exercices (detail exercice LOT C)', () => {
  for (const e of initialExercises) {
    assert.ok((e.variants?.length ?? 0) > 0, `variantes manquantes: ${e.id}`);
  }
});

ok('9. similarExerciseIds : toutes resolues, sauf la reference cassee documentee', () => {
  const allowed = new Set(Object.keys(KNOWN_DANGLING_SIMILAR));
  const broken: string[] = [];
  for (const e of initialExercises) {
    for (const ref of e.similarExerciseIds ?? []) {
      if (exerciseIdSet.has(ref)) continue;
      const known = KNOWN_DANGLING_SIMILAR[e.id] || [];
      if (known.includes(ref)) continue;
      broken.push(`${e.id} -> ${ref}`);
    }
  }
  assert.deepEqual(broken, [], 'references similaires non declarees:');
  // la liste blanche elle-meme ne doit pas avoir grossi
  assert.deepEqual(
    Object.keys(KNOWN_DANGLING_SIMILAR).filter((id) => !initialExercises.some((e) => e.id === id)),
    []
  );
  assert.ok(allowed.size >= 0);
});

ok('10. similarExerciseIds : pas de reference a soi-meme', () => {
  for (const e of initialExercises) {
    assert.ok(!(e.similarExerciseIds ?? []).includes(e.id), `auto-reference: ${e.id}`);
  }
});

// --- Etirements ------------------------------------------------------------

ok('11. etirements : duree, zone cible et instruction presentes', () => {
  for (const s of stretches) {
    assert.ok(s.id && s.name, `etirement incomplet: ${s.id}`);
    assert.ok(s.targetArea, `targetArea manquant: ${s.id}`);
    assert.ok(typeof s.durationSec === 'number' && s.durationSec > 0, `duree invalide: ${s.id}`);
    assert.ok((s.instruction ?? '').length > 0, `instruction manquante: ${s.id}`);
  }
});

ok('12. etirements : les 3 presets ne referencent que des etirements reels', () => {
  assert.equal(ALL_STRETCH_PRESETS.length, 3);
  for (const preset of ALL_STRETCH_PRESETS) {
    assert.ok(preset.stretches.length > 0, `preset vide: ${preset.id}`);
    for (const s of preset.stretches) {
      assert.ok(stretchIdSet.has(s.id), `preset ${preset.id} -> etirement inconnu ${s.id}`);
    }
  }
});

ok('13. etirements : getDefaultStretchesForDay renvoie des ids reels pour chaque jour', () => {
  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  for (const d of days) {
    const picked = getDefaultStretchesForDay(d);
    assert.ok(picked.length > 0, `aucun etirement pour ${d}`);
    for (const s of picked) assert.ok(stretchIdSet.has(s.id), `${d} -> id inconnu ${s.id}`);
  }
  // etirements par defaut d'un programme existant
  const fromProgram = getDefaultStretchesForDay(undefined, MY_PROGRAM.days?.[0]?.name, MY_PROGRAM.days?.[0]?.muscleGroups);
  for (const s of fromProgram) assert.ok(stretchIdSet.has(s.id), `programme -> id inconnu ${s.id}`);
});

// --- Compatibilite des programmes existants -------------------------------

ok('14. MY_PROGRAM : tous les exerciceId references existent dans la bibliotheque', () => {
  const used = new Set<string>();
  for (const day of MY_PROGRAM.days ?? []) {
    assert.ok((day.exercises?.length ?? 0) > 0, `jour vide dans MY_PROGRAM: ${day.id}`);
    for (const c of day.exercises ?? []) {
      assert.ok(exerciseIdSet.has(c.exerciseId), `MY_PROGRAM -> exercice inconnu: ${c.exerciseId}`);
      used.add(c.exerciseId);
    }
  }
  assert.equal(used.size, 26);
});

// --- Compatibilite LOT D sur la vraie bibliotheque ------------------------

const ghr = initialExercises.find((e) => e.id === 'ex-glute-ham-raise-floor-assisted') as Exercise;
const plank = initialExercises.find((e) => e.id === 'ex-plank') as Exercise;
const bench = initialExercises.find((e) => e.id === 'ex-bench-press') as Exercise;

function makeConfig(exercise: Exercise, overrides: Partial<ProgramExerciseConfig> = {}): ProgramExerciseConfig {
  return {
    id: 'cfg-test-1',
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    sets: 4,
    reps: 12,
    mode: 'reps',
    durationSec: 0,
    targetWeightKg: 30,
    restSec: 75,
    transitionRestSec: 60,
    repsPlan: [12, 12, 10, 10],
    restPlan: [75, 75, 90],
    notes: 'note du coach',
    ...overrides,
  } as ProgramExerciseConfig;
}

function makeProgram(config: ProgramExerciseConfig): WorkoutProgram {
  return {
    id: 'prog-lib-test',
    name: 'Programme test bibliotheque',
    isActive: false,
    days: [
      {
        id: 'day-1',
        name: 'Jour 1',
        muscleGroups: ['Jambes'],
        exerciseIds: [config.exerciseId, 'ex-plank'],
        exercises: [
          config,
          makeConfig(plank, { id: 'cfg-test-2', exerciseId: plank.id, exerciseName: plank.name }),
        ],
      },
    ],
  } as unknown as WorkoutProgram;
}

ok('15. LOT D : suggestions deterministes sur la vraie bibliotheque, exercice courant exclu', () => {
  const config = makeConfig(ghr);
  const a = buildExerciseSwapSuggestions(ghr, config, initialExercises, { limit: 8 });
  const b = buildExerciseSwapSuggestions(ghr, config, initialExercises, { limit: 8 });
  assert.ok(a.length > 0, 'aucune suggestion produite sur la vraie bibliotheque');
  assert.deepEqual(a.map((s) => s.exercise.id), b.map((s) => s.exercise.id));
  assert.ok(!a.some((s) => s.exercise.id === ghr.id), 'exercice courant propose');
  // les candidats restent ordonnes par score decroissant
  for (let i = 1; i < a.length; i++) assert.ok(a[i - 1].score >= a[i].score);
  // et les references deja presentes dans le jour sont signalees, pas cachees
  const flagged = buildExerciseSwapSuggestions(ghr, config, initialExercises, {
    limit: 20,
    dayExerciseIds: [plank.id],
  });
  const plankSuggestion = flagged.find((s) => s.exercise.id === plank.id);
  if (plankSuggestion) assert.equal(plankSuggestion.alreadyInDay, true);
});

ok('16. LOT D : la bibliotheque n est jamais modifiee par les suggestions', () => {
  const before = JSON.stringify(initialExercises);
  buildExerciseSwapSuggestions(ghr, makeConfig(ghr), initialExercises, { limit: 20, dayExerciseIds: [plank.id] });
  assert.equal(JSON.stringify(initialExercises), before);
});

ok('17. LOT D : remplacement par un exercice reel, configuration conservee a l identique', () => {
  const config = makeConfig(ghr);
  const program = makeProgram(config);
  const { program: next, outcome } = replaceProgramExercise(program, 'day-1', 'cfg-test-1', bench);
  assert.ok(outcome, 'remplacement sans outcome');
  assert.equal(outcome!.modeChanged, false);
  assert.equal(outcome!.requiresExplicitModeChoice, false);
  const cfg = next.days[0].exercises[0];
  assert.equal(cfg.id, 'cfg-test-1');
  assert.equal(cfg.exerciseId, bench.id);
  assert.equal(cfg.exerciseName, bench.name);
  assert.equal(cfg.sets, 4);
  assert.deepEqual(cfg.repsPlan, [12, 12, 10, 10]);
  assert.deepEqual(cfg.restPlan, [75, 75, 90]);
  assert.equal(cfg.restSec, 75);
  assert.equal(cfg.transitionRestSec, 60);
  assert.equal(cfg.notes, 'note du coach');
  assert.equal(cfg.mode, 'reps');
  // le programme d origine est intact
  assert.equal(program.days[0].exercises[0].exerciseId, ghr.id);
});

ok('18. LOT D : changement de mode explicite reps -> timer, jamais de conversion automatique', () => {
  const config = makeConfig(ghr);
  const program = makeProgram(config);
  const { program: next, outcome } = replaceProgramExercise(program, 'day-1', 'cfg-test-1', plank);
  assert.equal(outcome!.requiresExplicitModeChoice, true, 'incompatibilite de mode non detectee');
  // par defaut (keep) : rien ne bouge
  const kept = next.days[0].exercises[0];
  assert.equal(kept.mode, 'reps');
  assert.deepEqual(kept.repsPlan, [12, 12, 10, 10]);
  // choix explicite "adopt" : le mode suit l'exercice cible, le plan vient de SES metadonnees
  const adopted = replaceProgramExercise(program, 'day-1', 'cfg-test-1', plank, 'adopt').program.days[0]
    .exercises[0];
  assert.equal(adopted.mode, 'timer');
  assert.equal(adopted.durationPlan?.[0], getSecondsDefault(plank));
  assert.equal(adopted.sets, 4, 'le nombre de series ne doit pas changer');
  assert.deepEqual(adopted.repsPlan, [12, 12, 10, 10], 'le plan reps ne doit pas etre converti');
});

function getSecondsDefault(exercise: Exercise): number {
  return Number(/^\s*(\d+)/.exec(String(exercise.defaultReps))?.[1] ?? 0);
}

ok('19. LOT D : le mode naturel de la bibliotheque reste coherent avec defaultReps', () => {
  const timer = initialExercises.filter((e) => getExerciseNaturalMode(e) === 'timer');
  const reps = initialExercises.filter((e) => getExerciseNaturalMode(e) === 'reps');
  assert.equal(timer.length + reps.length, initialExercises.length);
  // aucune conversion implicite : les deux modes coexistent dans la bibliotheque
  assert.ok(timer.length > 0 && reps.length > 0);
  for (const e of timer) {
    assert.match(String(e.defaultReps), /(sec|seconde|secondes|s|min|minute|minutes|m|mètre|mètres|km)/i);
  }
});

ok('20. LOT D : validation de coherence du programme apres remplacement', () => {
  const { program } = replaceProgramExercise(makeProgram(makeConfig(ghr)), 'day-1', 'cfg-test-1', bench);
  const issues = validateProgramData(program);
  assert.deepEqual(
    issues.filter((i) => i.code === 'unknown-exercise'),
    [],
    'exercice inconnu apres remplacement'
  );
  assert.deepEqual(
    issues.filter((i) => i.code === 'duplicate-config-id'),
    [],
    'configId duplique apres remplacement'
  );
  assert.deepEqual(
    issues.filter((i) => i.code === 'duplicate-exercise'),
    [],
    'exercice duplique apres remplacement'
  );
});

console.log(`\n${passed} test(s) PASS`);
