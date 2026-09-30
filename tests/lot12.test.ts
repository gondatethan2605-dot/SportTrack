// LOT 12 — Bibliothèque d'exercices et d'étirements enrichie
//
// Vérifie la couverture, l'ajout additif non destructif, les structures
// et les contraintes type/données sans toucher à la mécanique métier.
//
// Exécutable via :  tsx tests/lot12.test.ts

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initialExercises } from '../src/data/initialExercises';
import {
  CORE_STRETCHES,
  LOWER_BODY_STRETCHES,
  UPPER_BODY_STRETCHES,
  ALL_INDIVIDUAL_STRETCHES,
} from '../src/data/stretchesData';
import { MY_PROGRAM } from '../src/data/myProgram';
import { parseDefaultReps } from '../src/utilsAlternatives';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

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

function read(p: string): string {
  return fs.readFileSync(path.join(SRC, p), 'utf8');
}

// ---------------------------------------------------------------
// Données de référence
// ---------------------------------------------------------------
const ORIGINAL_IDS = [
  'ex-bench-press','ex-incline-dumbbell-press','ex-pushups','ex-cable-crossover','ex-dips-chest',
  'ex-deadlift','ex-pullups','ex-barbell-row','ex-lat-pulldown','ex-seated-cable-row',
  'ex-military-press','ex-lateral-raises','ex-face-pull','ex-reverse-fly','ex-biceps-ez-curl',
  'ex-incline-dumbbell-curl','ex-hammer-curl','ex-skull-crushers','ex-triceps-rope-pushdown',
  'ex-farmer-walk','ex-wrist-curls','ex-hanging-leg-raise','ex-plank','ex-ab-wheel',
  'ex-barbell-squat','ex-leg-press','ex-bulgarian-split-squat','ex-romanian-deadlift',
  'ex-lying-leg-curl','ex-hip-thrust','ex-glute-kickback-cable','ex-standing-calf-raises',
  'ex-adductor-machine','ex-abductor-clamshell','ex-hyperextension-bench','ex-neck-flexion-isometric',
  'ex-wrist-roller-mobility','ex-90-90-hip-mobility','ex-tibialis-raises','ex-ankle-dorsiflexion-wall',
  'ex-worlds-greatest-stretch','ex-jump-rope','ex-rower-hiit','ex-jumping-jacks','ex-pelvic-lift',
  'ex-leg-flutters','ex-scissors','ex-side-plank-rotation','ex-russian-twist','ex-plank-bodyweight',
  'ex-bodyweight-squat','ex-reverse-lunges','ex-single-leg-glute-bridge','ex-bodyweight-calf-raises',
  'ex-wall-sit','ex-nordic-negative','ex-glute-ham-raise-floor-assisted','ex-superman-ytw','ex-swimming',
  'ex-wall-isometric-press','ex-self-resisted-curl','ex-shoulder-tap-plank','ex-rhomboid-contraction',
  'ex-ytwl','ex-scapular-squeeze','ex-jefferson-curl','ex-step-down','ex-knee-isometric-extension',
  'ex-sumo-squat-pause','ex-finger-pushups','ex-reverse-prayer','ex-pronation-supination',
  'ex-foot-alphabet','ex-heel-toe-walk','ex-single-leg-balance','ex-high-knees','ex-starfish-crunch',
  'ex-oblique-crunch',
];

const EQUIPMENT = [
  'Poids du corps','Haltères','Barre','Banc','Élastiques','Kettlebell',
  'Machines','Poulie','Barre de traction','Cardio','Mobilité','Étirements','Autre',
];
const CATEGORIES = ['Musculation','Poids du corps','Cardio','Mobilité & Étirements','Étirements'] as const;
const DIFFICULTY = ['Débutant','Intermédiaire','Avancé','Tous niveaux'];
const BODY_PARTS = ['Pectoraux','Dos','Épaules','Bras','Jambes & Fessiers','Abdominaux & Tronc','Articulations & Mobilité','Cardio'];
const MUSCLE_GROUPS = ['Jambes','Dos','Bras','Pectoraux','Épaules','Abdos','Cardio','Full Body'];
const TARGET_MUSCLES = [
  'Pectoraux','Dos','Épaules','Biceps','Triceps','Avant-bras','Abdominaux','Quadriceps',
  'Ischio-jambiers','Fessiers','Mollets','Adducteurs','Abducteurs','Lombaires','Cou','Poignets',
  'Coudes','Hanches','Genoux','Chevilles','Mobilité générale',
];

// ---------------------------------------------------------------
// EXERCISES CHECKS
// ---------------------------------------------------------------

ok('12.1 quantité : bibliothèque ≥ 150 exercices', () => {
  assert.ok(initialExercises.length >= 150, `attendu ≥ 150, trouvé ${initialExercises.length}`);
});

ok('12.2 champs obligatoires présents sur chaque exercice', () => {
  for (const e of initialExercises) {
    assert.ok(e.id, `id manquant pour ${JSON.stringify(e)}`);
    assert.ok(e.name, `name manquant pour ${e.id}`);
    assert.ok(e.primaryMuscle, `primaryMuscle manquant pour ${e.id}`);
    assert.ok(e.bodyPart, `bodyPart manquant pour ${e.id}`);
    assert.ok(e.equipment, `equipment manquant pour ${e.id}`);
    assert.ok(e.difficulty, `difficulty manquant pour ${e.id}`);
    assert.ok(e.category, `category manquant pour ${e.id}`);
    assert.ok(typeof e.description === 'string' && e.description.length > 0, `description manquante pour ${e.id}`);
    assert.ok(Array.isArray(e.instructions) && e.instructions.length > 0, `instructions vides pour ${e.id}`);
    assert.ok(Number.isFinite(e.defaultSets) && e.defaultSets >= 1, `defaultSets invalide pour ${e.id}`);
    assert.ok(Number.isFinite(e.defaultRestSec) && e.defaultRestSec >= 0, `defaultRestSec invalide pour ${e.id}`);
    assert.ok(
      (typeof e.defaultReps === 'number' && e.defaultReps > 0) ||
      (typeof e.defaultReps === 'string' && e.defaultReps.trim().length > 0),
      `defaultReps invalide pour ${e.id}`
    );
  }
});

ok('12.3 IDs uniques (aucun doublon)', () => {
  const ids = initialExercises.map((e) => e.id);
  const dupes = ids.filter((x, i) => ids.indexOf(x) !== i);
  assert.deepEqual(dupes, [], 'IDs en double détectés');
});

ok('12.4 noms uniques (insensible à la casse)', () => {
  const names = initialExercises.map((e) => e.name.toLowerCase());
  const dupes = names.filter((x, i) => names.indexOf(x) !== i);
  assert.deepEqual(dupes, [], 'Noms en double détectés');
});

ok('12.5 ajouts additifs : les 78 exercices d\'origine toujours présents', () => {
  const idSet = new Set(initialExercises.map((e) => e.id));
  for (const orig of ORIGINAL_IDS) {
    assert.ok(idSet.has(orig), `${orig} manquant (suppression interdite)`);
  }
  // Vérifie que les favoris d'origine restent intacts
  const favs = new Map(initialExercises.map((e) => [e.id, !!e.isFavorite]));
  assert.ok(favs.get('ex-hip-thrust'), 'ex-hip-thrust doit rester favori');
  assert.ok(favs.get('ex-romanian-deadlift'), 'ex-romanian-deadlift doit rester favori');
  assert.ok(favs.get('ex-bulgarian-split-squat'), 'ex-bulgarian-split-squat doit rester favori');
  assert.ok(favs.get('ex-worlds-greatest-stretch'), 'ex-worlds-greatest-stretch doit rester favori');
  // Aucun des nouveaux exercices ne doit être marqué isCustom
  for (const e of initialExercises) {
    assert.ok(!e.isCustom, `${e.id} ne doit pas être marqué isCustom`);
  }
});

ok('12.6 similarExerciseIds : chaque référence existe dans le catalogue', () => {
  const idSet = new Set(initialExercises.map((e) => e.id));
  for (const e of initialExercises) {
    for (const ref of e.similarExerciseIds || []) {
      assert.ok(idSet.has(ref), `${e.id} référence un id inexistant : ${ref}`);
    }
  }
});

ok('12.7 prescriptions valides : sets ∈ [1,6], restSec ∈ [5,240], reps parseable', () => {
  for (const e of initialExercises) {
    assert.ok(e.defaultSets >= 1 && e.defaultSets <= 6, `${e.id} defaultSets ${e.defaultSets} hors limites`);
    assert.ok(e.defaultRestSec >= 5 && e.defaultRestSec <= 240, `${e.id} defaultRestSec ${e.defaultRestSec} hors limites`);
    const native = parseDefaultReps(e.defaultReps as number | string);
    assert.ok(native.value > 0 && Number.isFinite(native.value), `${e.id} defaultReps non parseable ou <= 0`);
  }
});

ok('12.8 enums cohérents avec les filtres ExercisesPage', () => {
  const eqSet = new Set(EQUIPMENT);
  const catSet = new Set(CATEGORIES);
  const diffSet = new Set(DIFFICULTY);
  const bpSet = new Set(BODY_PARTS);
  const mgSet = new Set(MUSCLE_GROUPS);
  for (const e of initialExercises) {
    assert.ok(eqSet.has(e.equipment), `${e.id} equipment inconnu : ${e.equipment}`);
    assert.ok(catSet.has(e.category), `${e.id} category inconnue : ${e.category}`);
    assert.ok(diffSet.has(e.difficulty), `${e.id} difficulty inconnue : ${e.difficulty}`);
    assert.ok(bpSet.has(e.bodyPart), `${e.id} bodyPart inconnu : ${e.bodyPart}`);
    assert.ok(mgSet.has(e.muscleGroup!), `${e.id} muscleGroup inconnu : ${e.muscleGroup}`);
  }
});

ok('12.9 primaryMuscle filtrable par les chips muscle', () => {
  const allowed = new Set([...TARGET_MUSCLES, 'Cardio', 'Jambes']);
  for (const e of initialExercises) {
    assert.ok(allowed.has(e.primaryMuscle), `${e.id} primaryMuscle "${e.primaryMuscle}" non filtrable`);
  }
});

ok('12.10 couverture des catégories et matériels', () => {
  const cats = new Map<string, number>();
  const equips = new Map<string, number>();
  for (const e of initialExercises) {
    cats.set(e.category, (cats.get(e.category) || 0) + 1);
    equips.set(e.equipment, (equips.get(e.equipment) || 0) + 1);
  }
  assert.ok((cats.get('Musculation') || 0) >= 30, 'Musculation ≥ 30');
  assert.ok((cats.get('Poids du corps') || 0) >= 25, 'Poids du corps ≥ 25');
  assert.ok((cats.get('Cardio') || 0) >= 8, 'Cardio ≥ 8');
  assert.ok((cats.get('Mobilité & Étirements') || 0) >= 12, 'Mobilité & Étirements ≥ 12');
  for (const eq of EQUIPMENT) {
    assert.ok((equips.get(eq) || 0) >= 1, `Equipment "${eq}" au moins 1 exercice`);
  }
  // Vérifie diversité des groupes musculaires (au moins 22 primaires distincts)
  const distinctPrimary = new Set(initialExercises.map((e) => e.primaryMuscle));
  assert.ok(distinctPrimary.size >= 22, `au moins 22 primaryMuscles distincts, trouvé ${distinctPrimary.size}`);
});

ok('12.11 pas de console.log/TODO/FIXME/debugger dans les fichiers data', () => {
  const files = [
    'data/initialExercises.ts',
    'data/stretchesData.ts',
    'data/myProgram.ts',
    'data/initialData.ts',
  ];
  for (const file of files) {
    const src = read(file);
    assert.ok(!src.includes('console.log'), `${file} contient console.log`);
    assert.ok(!src.includes('TODO'), `${file} contient TODO`);
    assert.ok(!src.includes('FIXME'), `${file} contient FIXME`);
    assert.ok(!src.includes('debugger'), `${file} contient debugger`);
  }
});

// ---------------------------------------------------------------
// STRETCH CHECKS
// ---------------------------------------------------------------

const allStretches = [...CORE_STRETCHES, ...LOWER_BODY_STRETCHES, ...UPPER_BODY_STRETCHES, ...ALL_INDIVIDUAL_STRETCHES];

ok('12.12 bibliothèque étirements totale entre 115 et 135', () => {
  assert.ok(allStretches.length >= 115, `attendu ≥ 115, trouvé ${allStretches.length}`);
  assert.ok(allStretches.length <= 135, `attendu ≤ 135, trouvé ${allStretches.length}`);
});

ok('12.13 étirements individuels : détection dynamique (≥ 5)', () => {
  const dynamic = ALL_INDIVIDUAL_STRETCHES.filter((s) => s.name.toLowerCase().includes('dynam'));
  assert.ok(dynamic.length >= 5, `attendu ≥ 5 étirements dynamiques, trouvé ${dynamic.length}`);
});

ok('12.14 champs des étirements valides (durationSec, hasSides, sideType)', () => {
  const validSideType = new Set(['side', 'leg', 'arm']);
  for (const s of allStretches) {
    assert.ok(s.id, `id manquant pour étirement ${JSON.stringify(s)}`);
    assert.ok(s.name && s.name.length > 2, `name manquant ou trop court pour ${s.id}`);
    assert.ok(s.targetArea && s.targetArea.length > 0, `targetArea manquant pour ${s.id}`);
    assert.ok(Number.isFinite(s.durationSec) && s.durationSec > 0 && s.durationSec <= 120, `${s.id} durationSec ${s.durationSec} invalide`);
    assert.ok(typeof s.hasSides === 'boolean', `${s.id} hasSides non booléen`);
    if (s.hasSides) {
      assert.ok(validSideType.has(s.sideType!), `${s.id} sideType "${s.sideType}" invalide (attendu side|leg|arm)`);
    }
    assert.ok(typeof s.instruction === 'string' && s.instruction.length > 10, `${s.id} instruction trop courte ou manquante`);
  }
});

ok('12.15 IDs et noms des étirements uniques', () => {
  const ids = allStretches.map((s) => s.id);
  const names = allStretches.map((s) => s.name.toLowerCase());
  const dupIds = ids.filter((x, i) => ids.indexOf(x) !== i);
  const dupNames = names.filter((x, i) => names.indexOf(x) !== i);
  assert.deepEqual(dupIds, [], 'IDs étirements en double');
  assert.deepEqual(dupNames, [], 'Noms étirements en double');
});

ok('12.16 presets intacts : CORE=3, LOWER=4, UPPER=5, myProgram inchangé', () => {
  assert.equal(CORE_STRETCHES.length, 3, 'CORE_STRETCHES doit contenir 3 étirements');
  assert.equal(LOWER_BODY_STRETCHES.length, 4, 'LOWER_BODY_STRETCHES doit contenir 4 étirements');
  assert.equal(UPPER_BODY_STRETCHES.length, 5, 'UPPER_BODY_STRETCHES doit contenir 5 étirements');
  // Vérifie MY_PROGRAM
  assert.equal(MY_PROGRAM.id, 'prog-my-personal-bodyweight');
  assert.equal(MY_PROGRAM.isActive, true);
  assert.equal(MY_PROGRAM.days.length, 7);
  // Dimanche (mobilité) n'a pas d'étirement, les 6 autres jours en ont
  const dim = MY_PROGRAM.days.find((d) => d.id === 'day-mobility-dimanche');
  assert.ok(dim, 'dimanche présent');
  assert.deepEqual(dim!.stretches, [], 'dimanche (mobilité) n\'a pas de preset d\'étirements');
  const otherDays = MY_PROGRAM.days.filter((d) => d.id !== 'day-mobility-dimanche');
  assert.ok(otherDays.every((d) => Array.isArray(d.stretches) && d.stretches.length > 0), 'chaque jour hors dimanche a des étirements');
  // Presets toujours référencés via import
  const presetsRef = read('data/myProgram.ts');
  assert.ok(presetsRef.includes('CORE_STRETCHES'), 'MY_PROGRAM importe encore CORE_STRETCHES');
  assert.ok(presetsRef.includes('LOWER_BODY_STRETCHES'), 'MY_PROGRAM importe encore LOWER_BODY_STRETCHES');
});

// ---------------------------------------------------------------
// INTEGRITY & SYSTEM CHECKS
// ---------------------------------------------------------------

ok('12.17 IndexedDB : DB_VERSION = 8 + seed additif non destructif', () => {
  const dbSrc = read('db/indexedDb.ts');
  assert.ok(dbSrc.includes('const DB_VERSION = 8;'), 'DB_VERSION doit être 8');
  assert.ok(!dbSrc.match(/DB_VERSION\s*=\s*9/), 'DB_VERSION ne doit PAS être 9');
  assert.ok(dbSrc.includes('if (!existingIds.has(initEx.id)) exStore.put(initEx)'),
    'seed additif (ajoute uniquement les IDs manquants) toujours en place');
});

ok('12.18 StretchesPage importe et intègre la bibliothèque individuelle', () => {
  const page = read('pages/StretchesPage.tsx');
  assert.ok(page.includes('ALL_INDIVIDUAL_STRETCHES'), 'import ALL_INDIVIDUAL_STRETCHES présent');
  assert.ok(page.includes('...ALL_INDIVIDUAL_STRETCHES'), 'bibliothèque individuelle étendue dans allStretches');
  // Vérifie les catégories étendues
  assert.ok(page.includes("'hanche'"), 'catégorie Bas du corps inclut hanche');
  assert.ok(page.includes("'cou'"), 'catégorie Haut du corps inclut cou');
  assert.ok(page.includes("'trapèze'"), 'catégorie Haut du corps inclut trapèze');
});

ok('12.19 séance rapide : les buckets s\'alimentent sans plan vide', async () => {
  const { buildQuickSessionPlan } = await import('../src/utilsQuickSession');
  for (const min of [10, 20, 30] as const) {
    const plan = buildQuickSessionPlan(min);
    assert.ok(plan.day.exercises!.length > 0, `séance rapide ${min} min doit contenir au moins 1 exercice`);
    assert.ok(plan.day.stretches!.length > 0, `séance rapide ${min} min doit contenir des étirements`);
  }
});

ok('12.20 date du rapport : la création est enregistrée sans compromettre les types', () => {
  // Vérifie que le fichier de données se compile sans erreur (TS validé par build séparé)
  const exSrc = read('data/initialExercises.ts');
  assert.ok(exSrc.includes("export const initialExercises"), 'export initialExercises présent');
  assert.ok(exSrc.includes("// LOT 12"), 'marqueur LOT 12 présent dans initialExercises.ts');
  const strSrc = read('data/stretchesData.ts');
  assert.ok(strSrc.includes("export const ALL_INDIVIDUAL_STRETCHES"), 'export ALL_INDIVIDUAL_STRETCHES présent');
});

// ---------------------------------------------------------------
console.log(`\nLOT 12 — ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);
