// LOT 13 — Extension massive de la bibliothèque SportTrack
//
// Objectif LOT 13 : ~163 → ~400 exercices (cible 380–430) et
// ~74 → ~125 étirements (cible 115–135), en totalité additifs et
// non destructifs. Ce test verrouille quantité, unicité, couverture,
// qualité des données, absence de conversion reps↔durée et intégrité
// de l'existant (presets, programme v2, favoris, IndexedDB V8, seed).
//
// Exécutable via :  tsx tests/libraryExpansion.test.ts

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
  ALL_STRETCH_PRESETS,
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

const allStretches = [...CORE_STRETCHES, ...LOWER_BODY_STRETCHES, ...UPPER_BODY_STRETCHES, ...ALL_INDIVIDUAL_STRETCHES];

// ---------------------------------------------------------------
// QUANTITÉS
// ---------------------------------------------------------------

ok('1. quantité exercices : entre 380 et 430', () => {
  console.error('       ' + initialExercises.length + ' exercices détectés');
  assert.ok(initialExercises.length >= 380, `attendu ≥ 380, trouvé ${initialExercises.length}`);
  assert.ok(initialExercises.length <= 430, `attendu ≤ 430, trouvé ${initialExercises.length}`);
});

ok('2. quantité étirements (totale) : entre 115 et 135', () => {
  console.error('       ' + allStretches.length + ' étirements détectés');
  assert.ok(allStretches.length >= 115, `attendu ≥ 115, trouvé ${allStretches.length}`);
  assert.ok(allStretches.length <= 135, `attendu ≤ 135, trouvé ${allStretches.length}`);
});

// ---------------------------------------------------------------
// UNICITÉ
// ---------------------------------------------------------------

ok('3. IDs d\'exercices uniques', () => {
  const ids = initialExercises.map((e) => e.id);
  const dupes = ids.filter((x, i) => ids.indexOf(x) !== i);
  assert.deepEqual(dupes, [], 'IDs d\'exercices en double');
});

ok('4. noms d\'exercices uniques (insensible à la casse)', () => {
  const names = initialExercises.map((e) => e.name.trim().toLowerCase());
  const dupes = names.filter((x, i) => names.indexOf(x) !== i);
  assert.deepEqual(dupes, [], 'Noms d\'exercices en double');
});

ok('5. IDs d\'étirements uniques', () => {
  const ids = allStretches.map((s) => s.id);
  const dupes = ids.filter((x, i) => ids.indexOf(x) !== i);
  assert.deepEqual(dupes, [], 'IDs d\'étirements en double');
});

ok('6. noms d\'étirements uniques (insensible à la casse)', () => {
  const names = allStretches.map((s) => s.name.trim().toLowerCase());
  const dupes = names.filter((x, i) => names.indexOf(x) !== i);
  assert.deepEqual(dupes, [], 'Noms d\'étirements en double');
});

// ---------------------------------------------------------------
// INTÉGRITÉ DES RÉFÉRENCES & QUALITÉ
// ---------------------------------------------------------------

ok('7. similarExerciseIds : 100% des références résolues', () => {
  const idSet = new Set(initialExercises.map((e) => e.id));
  const missing: string[] = [];
  for (const ex of initialExercises) {
    for (const ref of ex.similarExerciseIds || []) {
      if (!idSet.has(ref)) missing.push(`${ex.id} → ${ref}`);
    }
  }
  assert.deepEqual(missing, [], 'références orphelines détectées');
});

ok('8. familles musculaires majeures présentes', () => {
  const primaries = new Set(initialExercises.map((e) => e.primaryMuscle));
  const required = [
    'Pectoraux',
    'Dos',
    'Épaules',
    'Biceps',
    'Triceps',
    'Avant-bras',
    'Abdominaux',
    'Quadriceps',
    'Ischio-jambiers',
    'Fessiers',
    'Mollets',
    'Adducteurs',
    'Lombaires',
    'Cou',
    'Poignets',
    'Hanches',
    'Chevilles',
    'Cardio',
    'Jambes',
  ];
  for (const m of required) {
    assert.ok(primaries.has(m), `primaryMuscle "${m}" absent de la bibliothèque`);
  }
  // La famille Full Body reste représentée via muscleGroup (union valide)
  assert.ok(initialExercises.some((e) => e.muscleGroup === 'Full Body'), 'muscleGroup Full Body absent');
});

ok('9. les 13 équipements couverts', () => {
  const given = new Set(initialExercises.map((e) => e.equipment));
  const all = [
    'Poids du corps',
    'Haltères',
    'Barre',
    'Banc',
    'Élastiques',
    'Kettlebell',
    'Machines',
    'Poulie',
    'Barre de traction',
    'Cardio',
    'Mobilité',
    'Étirements',
    'Autre',
  ];
  const missing = all.filter((eq) => !given.has(eq));
  assert.deepEqual(missing, [], 'équipements manquants');
});

ok('10. les 3 niveaux de difficulté représentés et équilibrés', () => {
  const b = initialExercises.filter((e) => e.difficulty === 'Débutant').length;
  const i = initialExercises.filter((e) => e.difficulty === 'Intermédiaire').length;
  const a = initialExercises.filter((e) => e.difficulty === 'Avancé').length;
  assert.ok(b >= 80, `Débutant ≥ 80 attendu, trouvé ${b}`);
  assert.ok(i >= 80, `Intermédiaire ≥ 80 attendu, trouvé ${i}`);
  assert.ok(a >= 20, `Avancé ≥ 20 attendu, trouvé ${a}`);
  console.error(`       Débutant ${b} / Intermédiaire ${i} / Avancé ${a}`);
});

ok('11. modes reps ET timer présents dans la bibliothèque', () => {
  const count = initialExercises.filter((e) => typeof e.defaultReps === 'number').length;
  const timer = initialExercises.filter((e) => parseDefaultReps(e.defaultReps as number | string).kind === 'duration').length;
  assert.ok(count > 0, 'aucun exercice en mode reps');
  assert.ok(timer > 0, 'aucun exercice en mode timer (durée)');
  console.error(`       reps ${count} / timer(durée) ${timer}`);
});

ok('12. aucune conversion reps ↔ durée (formats natifs préservés)', () => {
  for (const e of initialExercises) {
    const parsed = parseDefaultReps(e.defaultReps as number | string);
    assert.ok(parsed.value > 0, `${e.id} defaultReps non positif`);
    if (typeof e.defaultReps === 'number') {
      assert.equal(parsed.kind, 'count', `${e.id} defaultReps numérique doit rester un count`);
    } else {
      const s = e.defaultReps.trim();
      const timerLike = /^\s*\d+(?:\.\d+)?\s*(?:(?:s(?:ec(?:ondes?)?)?|min(?:utes?)?)(?!\p{L}))/iu.test(s);
      if (timerLike) {
        assert.equal(parsed.kind, 'duration', `${e.id} durée "${e.defaultReps}" doit rester une durée`);
      } else {
        assert.equal(parsed.kind, 'count', `${e.id} valeur texte "${e.defaultReps}" doit rester un count (pas de conversion)`);
      }
    }
  }
});

// ---------------------------------------------------------------
// COUVERTURE ÊTR/REPS — champs structurés
// ---------------------------------------------------------------

ok('13. étirements : champs valides (durationSec, hasSides, sideType, instruction)', () => {
  const validSide = new Set(['side', 'leg', 'arm']);
  for (const s of allStretches) {
    assert.ok(Number.isFinite(s.durationSec) && s.durationSec > 0 && s.durationSec <= 120, `${s.id} durationSec invalide`);
    assert.ok(typeof s.hasSides === 'boolean', `${s.id} hasSides non booléen`);
    if (s.hasSides) {
      assert.ok(validSide.has(s.sideType!), `${s.id} sideType "${s.sideType}" invalide`);
    }
    assert.ok(typeof s.instruction === 'string' && s.instruction.length > 10, `${s.id} instruction trop courte`);
  }
});

ok('14. zones couvertes par les étirements (cou, épaules, bras, poignets, dos, pectoraux, hanches, fessiers, quadriceps, ischios, adducteurs, mollets, chevilles)', () => {
  const text = allStretches.map((s) => `${s.name} ${s.targetArea}`.toLowerCase()).join(' ');
  const zones = [
    'cou',
    'épaule',
    'triceps',
    'biceps',
    'poignet',
    'main',
    'dos',
    'pectoraux',
    'hanche',
    'fessier',
    'quadriceps',
    'ischi',
    'adducteur',
    'mollet',
    'cheville',
  ];
  const missing = zones.filter((z) => !text.includes(z));
  assert.deepEqual(missing, [], 'zones d\'étirement non couvertes');
});

// ---------------------------------------------------------------
// PRÉSERVATION DE L'EXISTANT
// ---------------------------------------------------------------

ok('15. presets intacts : CORE=3, LOWER=4, UPPER=5, preset-core/lower/upper présents', () => {
  assert.equal(CORE_STRETCHES.length, 3);
  assert.equal(LOWER_BODY_STRETCHES.length, 4);
  assert.equal(UPPER_BODY_STRETCHES.length, 5);
  const ids = ALL_STRETCH_PRESETS.map((p) => p.id);
  assert.ok(ids.includes('preset-core'), 'preset-core manquant');
  assert.ok(ids.includes('preset-lower'), 'preset-lower manquant');
  assert.ok(ids.includes('preset-upper'), 'preset-upper manquant');
});

ok('16. étirements d\'origine toujours présents (échantillon additif)', () => {
  const idSet = new Set(allStretches.map((s) => s.id));
  const originals = [
    'stretch-hamstring-sitting',
    'stretch-quads-lying',
    'stretch-happy-baby',
    'stretch-butterfly',
    'stretch-glutes-pigeon',
    'stretch-90-90',
    'stretch-neck-side',
    'stretch-chest-doorway',
    'stretch-lat-hang',
    'stretch-shoulder-rear',
    'stretch-triceps-wall',
    'stretch-forearm-flexor',
    'stretch-wrist-rotations',
    'stretch-spinal-rotation-seated',
    'stretch-knees-to-chest',
    'stretch-arm-circles',
    'stretch-leg-swing-side',
    'stretch-butt-kicks',
  ];
  const missing = originals.filter((o) => !idSet.has(o));
  assert.deepEqual(missing, [], 'étirements d\'origine supprimés');
});

ok('17. États uniques : plusieurs étirements individuels ajoutés (> 100)', () => {
  assert.ok(ALL_INDIVIDUAL_STRETCHES.length > 100, `ALL_INDIVIDUAL_STRETCHES = ${ALL_INDIVIDUAL_STRETCHES.length}`);
  const idSet = new Set(allStretches.map((s) => s.id));
  const expected = [
    'stretch-neck-flexion-assisted',
    'stretch-shoulder-hands-behind',
    'stretch-biceps-wall',
    'stretch-chest-corner',
    'stretch-hip-cars',
    'stretch-glute-thread-needle',
    'stretch-hamstring-strap',
    'stretch-calf-straight-lunge',
    'stretch-plantar-arch',
    'stretch-squat-hold',
  ];
  const missing = expected.filter((o) => !idSet.has(o));
  assert.deepEqual(missing, [], 'nouveaux étirements absents');
});

ok('18. programme v2 intact + exercices obliques présents', () => {
  assert.equal(MY_PROGRAM.id, 'prog-my-personal-bodyweight');
  assert.equal(MY_PROGRAM.days.length, 7);
  const dim = MY_PROGRAM.days.find((d) => d.id === 'day-mobility-dimanche');
  assert.ok(dim && Array.isArray(dim.stretches) && dim.stretches.length === 0, 'dimanche mobilité sans preset');
  const idSet = new Set(initialExercises.map((e) => e.id));
  assert.ok(idSet.has('ex-oblique-crunch'), 'ex-oblique-crunch (v2) manquant');
  assert.ok(idSet.has('ex-starfish-crunch'), 'ex-starfish-crunch (v2) manquant');
});

ok('19. favoris d\'origine préservés, nouveaux exercices non favoris', () => {
  const favs = new Map(initialExercises.map((e) => [e.id, !!e.isFavorite]));
  assert.ok(favs.get('ex-hip-thrust'), 'ex-hip-thrust doit rester favori');
  assert.ok(favs.get('ex-romanian-deadlift'), 'ex-romanian-deadlift doit rester favori');
  assert.ok(favs.get('ex-bulgarian-split-squat'), 'ex-bulgarian-split-squat doit rester favori');
  assert.ok(favs.get('ex-worlds-greatest-stretch'), 'ex-worlds-greatest-stretch doit rester favori');
});

ok('20. aucun exercice marqué isCustom', () => {
  const custom = initialExercises.filter((e) => e.isCustom);
  assert.deepEqual(custom, [], 'des exercices sont marqués isCustom (interdit pour la bibliothèque)');
});

// ---------------------------------------------------------------
// SEED & INDEXEDDB
// ---------------------------------------------------------------

ok('21. IndexedDB : DB_VERSION = 8 (pas de V9) + seed additif non destructif', () => {
  const dbSrc = fs.readFileSync(path.join(SRC, 'db', 'indexedDb.ts'), 'utf8');
  assert.ok(dbSrc.includes('const DB_VERSION = 8;'), 'DB_VERSION doit être 8');
  assert.ok(!dbSrc.match(/DB_VERSION\s*=\s*9/), 'DB_VERSION ne doit PAS être 9');
  assert.ok(dbSrc.includes('if (!existingIds.has(initEx.id)) exStore.put(initEx)'),
    'seed additif (ajoute uniquement les IDs manquants) toujours en place');
});

ok('22. seed additif : exercices d\'origine (échantillon) présents, aucun supprimé', () => {
  const idSet = new Set(initialExercises.map((e) => e.id));
  const sample = [
    'ex-bench-press',
    'ex-incline-dumbbell-press',
    'ex-pushups',
    'ex-cable-crossover',
    'ex-dips-chest',
    'ex-deadlift',
    'ex-pullups',
    'ex-barbell-row',
    'ex-lat-pulldown',
    'ex-seated-cable-row',
    'ex-military-press',
    'ex-lateral-raises',
    'ex-face-pull',
    'ex-reverse-fly',
    'ex-biceps-ez-curl',
    'ex-incline-dumbbell-curl',
    'ex-hammer-curl',
    'ex-skull-crushers',
    'ex-triceps-rope-pushdown',
    'ex-farmer-walk',
    'ex-hanging-leg-raise',
    'ex-plank',
    'ex-ab-wheel',
    'ex-barbell-squat',
    'ex-leg-press',
    'ex-bulgarian-split-squat',
    'ex-romanian-deadlift',
    'ex-lying-leg-curl',
    'ex-hip-thrust',
    'ex-jump-rope',
    'ex-rower-hiit',
  ];
  const missing = sample.filter((o) => !idSet.has(o));
  assert.deepEqual(missing, [], 'exercices d\'origine manquants');
});

// ---------------------------------------------------------------
// DIVERSITÉ
// ---------------------------------------------------------------

ok('23. diversité : ≥ 22 primaryMuscles distincts, kettlebell ≥ 5, élastiques ≥ 4', () => {
  const distinct = new Set(initialExercises.map((e) => e.primaryMuscle));
  assert.ok(distinct.size >= 22, `attendu ≥ 22 primaryMuscles, trouvé ${distinct.size}`);
  const kettle = initialExercises.filter((e) => e.equipment === 'Kettlebell').length;
  const bands = initialExercises.filter((e) => e.equipment === 'Élastiques').length;
  assert.ok(kettle >= 5, `kettlebell ≥ 5 attendu, trouvé ${kettle}`);
  assert.ok(bands >= 4, `élastiques ≥ 4 attendu, trouvé ${bands}`);
});

ok('24. pas de doublons artificiels (triplet primaire+équipement+description unique)', () => {
  const keys = initialExercises.map((e) => `${e.primaryMuscle}|${e.equipment}|${e.description.trim().toLowerCase()}`);
  const dupes = keys.filter((x, i) => keys.indexOf(x) !== i);
  assert.deepEqual(dupes, [], 'triplets primaire+équipement+description en double (doublon artificiel)');
});

// ---------------------------------------------------------------
console.log(`\nLIBRARY EXPANSION — ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);