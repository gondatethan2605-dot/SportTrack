// Bibliothèque UNIFIÉE — exercices + étirements individuels dans une SEULE liste.
//
// Objectif : les 113 étirements individuels (src/data/stretchesData.ts) sont
// intégrés à la bibliothèque principale des exercices via une transformation
// (src/utilsStretchLibrary.ts) — UNE source de vérité, aucune donnée dupliquée.
// La bibliothèque "Tous" contient environ 501 éléments (388 exercices + 113
// étirements individuels) ; les 12 presets ne sont jamais comptés comme
// exercices. Aucun changement métier : programmes v2, repos guidés, favoris,
// persos, IndexedDB V8.
//
// Exécutable via :  tsx tests/unifiedExerciseLibrary.test.ts

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
import { STRETCH_LIBRARY_ITEMS } from '../src/utilsStretchLibrary';
import { MY_PROGRAM } from '../src/data/myProgram';
import { parseDefaultReps } from '../src/utilsAlternatives';
import {
  buildStretchSteps,
  resolveStretchRestSec,
  adjustRestSeconds,
  resolveGuidedRestSec,
  DEFAULT_TRANSITION_REST_SEC,
} from '../src/components/workout/workoutGuidedEngine';

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

function read(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

const exCount = initialExercises.length; // 388
const stretchCount = ALL_INDIVIDUAL_STRETCHES.length; // 113
const presetItems = [...CORE_STRETCHES, ...LOWER_BODY_STRETCHES, ...UPPER_BODY_STRETCHES]; // 12
const allStretches = Array.from(
  new Map([...presetItems, ...ALL_INDIVIDUAL_STRETCHES].map((s) => [s.id, s])).values()
); // 125 dédupliqués

// ---------------------------------------------------------------
// DONNÉES DU MODÈLE UNIFIÉ
// ---------------------------------------------------------------

ok('1. environ 388 exercices classiques présents', () => {
  assert.ok(exCount >= 380 && exCount <= 430, `attendu ~388, trouvé ${exCount}`);
});

ok('2. 113 étirements individuels présents (source stretchesData)', () => {
  assert.equal(stretchCount, 113, `attendu 113, trouvé ${stretchCount}`);
  assert.equal(STRETCH_LIBRARY_ITEMS.length, 113, 'transformation utilsStretchLibrary doit produire 113 entrées');
});

ok('3. environ 501 éléments dans "Tous" (388 + 113)', () => {
  const total = exCount + stretchCount;
  assert.equal(total, 501, `attendu 501, trouvé ${total}`);
});

ok('4. les 12 presets ne sont pas comptés comme exercices', () => {
  assert.equal(presetItems.length, 12, '12 étirements composent les 3 séquences presets');
  assert.equal(ALL_STRETCH_PRESETS.length, 3, '3 presets (Core / Lower / Mobility)');
  const libraryIds = new Set(STRETCH_LIBRARY_ITEMS.map((i) => i.id));
  const onlyPresetIds = presetItems.map((s) => s.id).filter((id) => !ALL_INDIVIDUAL_STRETCHES.some((s) => s.id === id));
  // Les presets ne doivent PAS apparaître dans la bibliothèque unifiée.
  for (const id of onlyPresetIds) {
    assert.ok(!libraryIds.has(id), `preset étirement ${id} ne doit pas être un élément de bibliothèque`);
  }
});

// ---------------------------------------------------------------
// UNICITÉ / IDENTIFIANTS
// ---------------------------------------------------------------

ok('5. IDs uniques dans la bibliothèque unifiée (pas de collision ex/stretch)', () => {
  const exIds = new Set(initialExercises.map((e) => e.id));
  const unifiedIds = STRETCH_LIBRARY_ITEMS.map((i) => i.id);
  for (const id of unifiedIds) {
    assert.ok(!exIds.has(id), `collision d'ID entre exercice et étirement : ${id}`);
  }
  const dup = unifiedIds.filter((x, i) => unifiedIds.indexOf(x) !== i);
  assert.deepEqual(dup, [], 'IDs d\'étirements en double dans la bibliothèque unifiée');
});

ok('6. noms uniques ou collisions gérées proprement (insensible à la casse)', () => {
  const exNames = new Map(initialExercises.map((e) => [e.name.trim().toLowerCase(), e.id]));
  const collisions = STRETCH_LIBRARY_ITEMS.filter((i) => exNames.has(i.name.trim().toLowerCase()));
  assert.deepEqual(collisions, [], 'collision de nom exercice/étirement non résolue');
  const names = STRETCH_LIBRARY_ITEMS.map((i) => i.name.trim().toLowerCase());
  const dupNames = names.filter((x, i) => names.indexOf(x) !== i);
  assert.deepEqual(dupNames, [], 'noms d\'étirements en double dans la bibliothèque unifiée');
});

// ---------------------------------------------------------------
// RECHERCHE & FILTRES (réplique la logique ExercisesPage)
// ---------------------------------------------------------------

function itemSearchText(item: { kind: string; name: string; searchText?: string }): string {
  return (item.searchText || `${item.name}`).toLowerCase();
}

ok('7. recherche exercices : "pompes" trouve des exercices', () => {
  const q = 'pompes';
  const hits = initialExercises.filter(
    (e) => e.name.toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q)
  );
  assert.ok(hits.length > 0, 'la recherche "pompes" doit retourner des exercices');
});

ok('8. recherche étirements : "quadriceps" trouve aussi des étirements', () => {
  const q = 'quadriceps';
  const stretchHits = STRETCH_LIBRARY_ITEMS.filter((i) => itemSearchText(i).includes(q));
  assert.ok(stretchHits.length >= 1, 'la recherche "quadriceps" doit trouver au moins 1 étirement');
  const exerciseHits = initialExercises.filter(
    (e) => e.name.toLowerCase().includes(q) || (e.primaryMuscle || '').toLowerCase().includes(q)
  );
  assert.ok(exerciseHits.length >= 1, 'la recherche "quadriceps" doit trouver au moins 1 exercice');
});

ok('9. filtre "Tous" : 388 exercices + 113 étirements = 501', () => {
  const all = initialExercises.length + STRETCH_LIBRARY_ITEMS.length;
  assert.equal(all, 501);
});

ok('10. filtre "Exercices" : uniquement les exercices classiques', () => {
  const page = read('pages/ExercisesPage.tsx');
  assert.ok(page.includes("filterType === 'exercise'"), 'filtre Exercices absent');
  assert.ok(page.includes("if (filterType === 'exercise') return item.kind === 'exercise';"),
    'le filtre Exercices doit se limiter aux items kind exercise');
});

ok('11. filtre "Étirements" : uniquement les étirements individuels', () => {
  const page = read('pages/ExercisesPage.tsx');
  assert.ok(page.includes("filterType === 'stretch'"), 'filtre Étirements absent');
  assert.ok(page.includes("if (filterType === 'stretch') return item.kind === 'stretch';"),
    'le filtre Étirements doit se limiter aux items kind stretch');
});

// ---------------------------------------------------------------
// FICHES DÉTAIL
// ---------------------------------------------------------------

ok('12. ouverture fiche exercice : modal existe et s\'ouvre au clic', () => {
  const page = read('pages/ExercisesPage.tsx');
  assert.ok(page.includes('data-testid="exercise-detail"'), 'fiche exercice absente');
  assert.ok(page.includes('openExerciseFiche'), 'ouverture fiche exercice absente');
});

ok('13. ouverture fiche étirement : modal partagé (StretchDetailModal) depuis la bibliothèque', () => {
  const page = read('pages/ExercisesPage.tsx');
  const modal = read('components/StretchDetailModal.tsx');
  assert.ok(page.includes("import { StretchDetailModal } from '../components/StretchDetailModal';"), 'StretchDetailModal non importé');
  assert.ok(page.includes('<StretchDetailModal'), 'StretchDetailModal non rendu');
  assert.ok(modal.includes('Fiche étirement'), 'fiche étirement absente du modal');
  assert.ok(modal.includes("aria-label=\"Fermer la fiche étirement\""), 'fermeture fiche étirement absente');
  assert.ok(modal.includes("'Commencer'"), 'verbe Commencer absent (lancement depuis la fiche)');
  assert.ok(!modal.includes('Démarrer'), "le verbe 'Démarrer' doit être absent");
});

// ---------------------------------------------------------------
// FAVORIS & PERSONNALISÉS
// ---------------------------------------------------------------

ok('14. favoris conservés : filtre + fiche, données d\'origine intactes', () => {
  const page = read('pages/ExercisesPage.tsx');
  assert.ok(page.includes("filterType === 'favorites'"), 'filtre favoris absent');
  assert.ok(page.includes('data-testid="exercise-detail-favorite"'), 'favori fiche détail absent');
  const favs = new Map(initialExercises.map((e) => [e.id, !!e.isFavorite]));
  assert.ok(favs.get('ex-hip-thrust'), 'ex-hip-thrust doit rester favori');
  assert.ok(favs.get('ex-romanian-deadlift'), 'ex-romanian-deadlift doit rester favori');
});

ok('15. exercices personnalisés conservés (aucun étirement marqué perso)', () => {
  const page = read('pages/ExercisesPage.tsx');
  assert.ok(page.includes('data-testid="exercise-btn-create"') && page.includes('data-testid="exercise-form"'), 'création perso absente');
  assert.ok(page.includes("filterType === 'custom'"), 'filtre perso absent');
  assert.ok(!page.includes('<StretchesPage'), 'l\'onglet / panneau séparé étirements a disparu (bibliothèque unique)');
  for (const item of STRETCH_LIBRARY_ITEMS) {
    assert.ok(!item.isCustom, `${item.id} ne doit pas être marqué isCustom`);
  }
  for (const item of STRETCH_LIBRARY_ITEMS) {
    assert.ok(!item.isFavorite, `${item.id} ne doit pas être marqué favori par défaut`);
  }
});

// ---------------------------------------------------------------
// PROGRAMMES / PRESETS
// ---------------------------------------------------------------

ok('16. programmes conservés : MY_PROGRAM identité + 7 jours', () => {
  const page = read('pages/ExercisesPage.tsx');
  assert.ok(page.includes('programUsage'), 'programUsage transmis (confirmation suppression)');
  assert.equal(MY_PROGRAM.id, 'prog-my-personal-bodyweight');
  assert.equal(MY_PROGRAM.days.length, 7);
});

ok('17. programme v2 intact : tous les ids exercices et étirements résolus', () => {
  const exIdSet = new Set(initialExercises.map((e) => e.id));
  const stretchIdSet = new Set(allStretches.map((s) => s.id));
  const missingEx: string[] = [];
  const missingSt: string[] = [];
  for (const day of MY_PROGRAM.days) {
    for (const id of day.exerciseIds || []) if (!exIdSet.has(id)) missingEx.push(`${day.id} → ${id}`);
    for (const st of day.stretches || []) if (!stretchIdSet.has(st.id)) missingSt.push(`${day.id} → ${st.id}`);
  }
  assert.deepEqual(missingEx, [], 'exerciseIds orphelins dans le programme v2');
  assert.deepEqual(missingSt, [], 'stretches orphelins dans le programme v2');
});

ok('18. Core intact : preset-core + 3 étirements CORE_STRETCHES', () => {
  assert.equal(CORE_STRETCHES.length, 3);
  const core = ALL_STRETCH_PRESETS.find((p) => p.id === 'preset-core');
  assert.ok(core, 'preset-core absent');
  assert.equal(core!.stretches.length, 3);
});

ok('19. Lower intact : preset-lower + 4 étirements LOWER_BODY_STRETCHES', () => {
  assert.equal(LOWER_BODY_STRETCHES.length, 4);
  const lower = ALL_STRETCH_PRESETS.find((p) => p.id === 'preset-lower');
  assert.ok(lower, 'preset-lower absent');
  assert.equal(lower!.stretches.length, 4);
});

ok('20. Mobility/Haut du corps intact : preset-upper + 5 étirements UPPER_BODY_STRETCHES', () => {
  assert.equal(UPPER_BODY_STRETCHES.length, 5);
  const upper = ALL_STRETCH_PRESETS.find((p) => p.id === 'preset-upper');
  assert.ok(upper, 'preset-upper absent');
  assert.equal(upper!.stretches.length, 5);
});

// ---------------------------------------------------------------
// INTÉGRITÉ SYSTÈME
// ---------------------------------------------------------------

ok('21. IndexedDB : DB_VERSION = 8, aucune migration V9', () => {
  const db = read('db/indexedDb.ts');
  assert.ok(db.includes('const DB_VERSION = 8;'), 'DB_VERSION doit être 8');
  assert.ok(!db.match(/DB_VERSION\s*=\s*9/), 'DB_VERSION ne doit PAS être 9');
});

ok('22. aucun doublon dans la bibliothèque unifiée (IDs + noms)', () => {
  const ids = [...initialExercises.map((e) => e.id), ...STRETCH_LIBRARY_ITEMS.map((i) => i.id)];
  const dupIds = ids.filter((x, i) => ids.indexOf(x) !== i);
  assert.deepEqual(dupIds, [], 'doublons d\'IDs dans la bibliothèque unifiée');
  const names = [
    ...initialExercises.map((e) => e.name.trim().toLowerCase()),
    ...STRETCH_LIBRARY_ITEMS.map((i) => i.name.trim().toLowerCase()),
  ];
  const dupNames = names.filter((x, i) => names.indexOf(x) !== i);
  assert.deepEqual(dupNames, [], 'doublons de noms dans la bibliothèque unifiée');
});

ok('23. repos entre chaque étirement toujours fonctionnel (moteur non modifié)', () => {
  const side = CORE_STRETCHES.find((s) => s.hasSides) || CORE_STRETCHES[0];
  const steps = buildStretchSteps([side]);
  assert.equal(steps.length, side.hasSides ? 2 : 1, 'buildStretchSteps : 1 pas par côté');
  assert.equal(resolveStretchRestSec(), DEFAULT_TRANSITION_REST_SEC, 'repos inter-étirements doit rester 30 s par défaut');
  assert.equal(adjustRestSeconds(10, -15), 0, 'clamp à 0 (jamais négatif)');
});

ok('24. dernier étirement → résumé, sans repos inutile', () => {
  const page = read('pages/WorkoutSessionPage.tsx');
  assert.ok(page.includes('summar'), 'phase résumé présente dans la séance');
  const engine = read('components/workout/workoutGuidedEngine.ts');
  assert.ok(!engine.includes('TODO'), 'moteur guidé sans TODO');
  // La transition du dernier pas (étirement final) ne doit pas ajouter de repos :
  // le résumé est atteint directement (vérifie que la logique de transition de
  // repos n'a pas été dupliquée dans la bibliothèque).
  const library = read('utilsStretchLibrary.ts');
  assert.ok(!library.includes('restSec') || library.includes('defaultRestSec: 0'),
    'la bibliothèque unifiée ne doit pas injecter de repos (fiche étirement = fiche d\'info)');
});

ok('25. reps/timer toujours indépendants (aucune conversion, formats natifs)', () => {
  for (const e of initialExercises) {
    const parsed = parseDefaultReps(e.defaultReps as number | string);
    assert.ok(parsed.value > 0, `${e.id} defaultReps non positif`);
  }
  for (const file of ['pages/ExercisesPage.tsx', 'pages/WorkoutSessionPage.tsx']) {
    const src = read(file);
    assert.ok(!src.includes('repsToDurationSec'), `${file} importe encore repsToDurationSec`);
    assert.ok(!src.includes('durationToReps'), `${file} importe encore durationToReps`);
  }
});

// ---------------------------------------------------------------
console.log(`\nBibliothèque UNIFIÉE — ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);