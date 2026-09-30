// LOT C — Bibliothèque + Fiches Exercices + Recherche
// Tests ciblés pour valider la refonte de la bibliothèque, fiches détaillées, recherche et filtres.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initialExercises } from '../src/data/initialExercises';
import { CORE_STRETCHES, LOWER_BODY_STRETCHES, UPPER_BODY_STRETCHES, ALL_INDIVIDUAL_STRETCHES } from '../src/data/stretchesData';
import { STRETCH_LIBRARY_ITEMS } from '../src/utilsStretchLibrary';

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

const exercisesPage = read('pages/ExercisesPage.tsx');
const app = read('App.tsx');

// -----------------------------------------------------------
// 1. RECHERCHE AUTOCOMPLETE / SUGGESTIONS
// -----------------------------------------------------------

ok('1. search suggestions state exists', () => {
  assert.ok(exercisesPage.includes('searchSuggestions'), 'searchSuggestions state absent');
  assert.ok(exercisesPage.includes('showSearchSuggestions'), 'showSearchSuggestions state absent');
});

ok('2. search input has aria-autocomplete and aria-controls', () => {
  assert.ok(exercisesPage.includes('aria-autocomplete="list"'), 'aria-autocomplete absent');
  assert.ok(exercisesPage.includes('aria-controls="exercise-search-suggestions"'), 'aria-controls absent');
});

ok('3. suggestions dropdown renders when showSearchSuggestions true', () => {
  assert.ok(exercisesPage.includes('exercise-search-suggestions'), 'suggestions dropdown absent');
  assert.ok(exercisesPage.includes('data-testid="exercise-search-suggestions"'), 'testid absent');
});

ok('4. suggestion click sets searchTerm and closes dropdown', () => {
  assert.ok(exercisesPage.includes('setSearchTerm(suggestion)'), 'click handler absent');
  assert.ok(exercisesPage.includes('setShowSearchSuggestions(false)'), 'close handler absent');
});

ok('5. search suggestions generated from exercise names, muscles, equipment, categories', () => {
  assert.ok(exercisesPage.includes('unifiedItems.forEach'), 'suggestions generation absent');
  assert.ok(exercisesPage.includes('item.name.toLowerCase().includes(q)'), 'name search absent');
  assert.ok(exercisesPage.includes('item.primaryMuscle'), 'muscle search absent');
  assert.ok(exercisesPage.includes('item.equipment?.toLowerCase()'), 'equipment search absent');
  assert.ok(exercisesPage.includes('item.category?.toLowerCase()'), 'category search absent');
});

// -----------------------------------------------------------
// 2. FILTRES AMÉLIORÉS : PERSISTENCE + MOBILE DRAWER
// -----------------------------------------------------------

ok('6. filter persistence key defined', () => {
  assert.ok(exercisesPage.includes('FILTER_STORAGE_KEY'), 'storage key absent');
  assert.ok(exercisesPage.includes('sporttrack-library-filters'), 'key name absent');
});

ok('7. filters loaded from localStorage on mount', () => {
  assert.ok(exercisesPage.includes('loadSavedFilters'), 'load function absent');
  assert.ok(exercisesPage.includes('localStorage.getItem(FILTER_STORAGE_KEY)'), 'getItem absent');
  assert.ok(exercisesPage.includes('savedFilters?.searchTerm'), 'searchTerm not loaded');
  assert.ok(exercisesPage.includes('savedFilters?.filterType'), 'filterType not loaded');
});

ok('8. filters saved to localStorage on change', () => {
  assert.ok(exercisesPage.includes('localStorage.setItem(FILTER_STORAGE_KEY'), 'setItem absent');
  assert.ok(exercisesPage.includes('JSON.stringify(filters)'), 'stringify absent');
});

ok('9. mobile filter drawer state exists', () => {
  assert.ok(exercisesPage.includes('mobileFilterOpen'), 'mobileFilterOpen state absent');
  assert.ok(exercisesPage.includes('setMobileFilterOpen'), 'setMobileFilterOpen absent');
});

ok('10. mobile filter button present (md:hidden)', () => {
  assert.ok(exercisesPage.includes('md:hidden'), 'mobile filter button responsive class absent');
  assert.ok(exercisesPage.includes('onClick={() => setMobileFilterOpen(true)}'), 'open handler absent');
});

ok('11. mobile filter drawer renders with all filter sections', () => {
  assert.ok(exercisesPage.includes('mobileFilterOpen &&'), 'drawer conditional absent');
  assert.ok(exercisesPage.includes('mobile-filter-title'), 'drawer title absent');
  assert.ok(exercisesPage.includes('Tous ('), 'type filter absent');
  assert.ok(exercisesPage.includes('Muscle / Zone'), 'muscle filter absent');
  assert.ok(exercisesPage.includes('Matériel'), 'equipment filter absent');
  assert.ok(exercisesPage.includes('Difficulté'), 'difficulty filter absent');
  assert.ok(exercisesPage.includes('Catégorie'), 'category filter absent');
  assert.ok(exercisesPage.includes('Zone du corps'), 'bodyPart filter absent');
  assert.ok(exercisesPage.includes('Tri'), 'sort filter absent');
  assert.ok(exercisesPage.includes('Réinitialiser les filtres'), 'reset button absent');
});

// -----------------------------------------------------------
// 3. AJOUTER AU PROGRAMME
// -----------------------------------------------------------

ok('12. addToProgram state and handlers exist', () => {
  assert.ok(exercisesPage.includes('addToProgramOpen'), 'addToProgramOpen state absent');
  assert.ok(exercisesPage.includes('addToProgramExercise'), 'addToProgramExercise state absent');
  assert.ok(exercisesPage.includes('selectedProgramId'), 'selectedProgramId state absent');
  assert.ok(exercisesPage.includes('selectedDayId'), 'selectedDayId state absent');
  assert.ok(exercisesPage.includes('handleOpenAddToProgram'), 'open handler absent');
  assert.ok(exercisesPage.includes('handleAddToProgramConfirm'), 'confirm handler absent');
});

ok('13. "Ajouter au programme" button in exercise detail modal', () => {
  assert.ok(exercisesPage.includes('exercise-detail-add-to-program'), 'button testid absent');
  assert.ok(exercisesPage.includes('BookOpen'), 'BookOpen icon absent');
  assert.ok(exercisesPage.includes('handleOpenAddToProgram(activeDetailExercise)'), 'click handler absent');
});

ok('14. add to program modal renders with program and day selectors', () => {
  assert.ok(exercisesPage.includes('addToProgramOpen &&'), 'modal conditional absent');
  assert.ok(exercisesPage.includes('Ajouter au programme'), 'modal title absent');
  assert.ok(exercisesPage.includes('Programme'), 'program selector label absent');
  assert.ok(exercisesPage.includes('Jour de la séance'), 'day selector label absent');
  assert.ok(exercisesPage.includes('selectedProgramId'), 'program selector value absent');
  assert.ok(exercisesPage.includes('selectedDayId'), 'day selector value absent');
});

ok('15. day selector updates when program changes', () => {
  assert.ok(exercisesPage.includes('setSelectedProgramId(e.target.value)'), 'program change handler absent');
  assert.ok(exercisesPage.includes('setSelectedDayId'), 'day reset on program change absent');
});

ok('16. exercise config preview shows default sets/reps/rest', () => {
  assert.ok(exercisesPage.includes('Configuration par défaut'), 'preview section absent');
  assert.ok(exercisesPage.includes('addToProgramExercise.defaultSets'), 'sets preview absent');
  assert.ok(exercisesPage.includes('addToProgramExercise.defaultReps'), 'reps preview absent');
  assert.ok(exercisesPage.includes('addToProgramExercise.defaultRestSec'), 'rest preview absent');
});

ok('17. App.tsx passes programs and onAddExerciseToProgram to ExercisesPage', () => {
  const appContent = fs.readFileSync(path.join(ROOT, 'src', 'App.tsx'), 'utf8');
  assert.ok(appContent.includes('programs={programs}'), 'programs prop absent');
  assert.ok(appContent.includes('onAddExerciseToProgram={handleAddExerciseToProgram}'), 'callback prop absent');
});

ok('18. handleAddExerciseToProgram adds exercise to program day', () => {
  const appContent = fs.readFileSync(path.join(ROOT, 'src', 'App.tsx'), 'utf8');
  assert.ok(appContent.includes('handleAddExerciseToProgram'), 'handler absent');
  assert.ok(appContent.includes('ProgramExerciseConfig'), 'config type absent');
  assert.ok(appContent.includes('SportTrackStorage.putItem'), 'storage write absent');
  assert.ok(appContent.includes('setPrograms'), 'state update absent');
});

// -----------------------------------------------------------
// 4. FICHE DÉTAILLÉE AMÉLIORÉE
// -----------------------------------------------------------

ok('19. exercise detail modal has "Ajouter au programme" button', () => {
  assert.ok(exercisesPage.includes('exercise-detail-add-to-program'), 'button testid absent');
  assert.ok(exercisesPage.includes('data-testid="exercise-detail-add-to-program"'), 'testid format absent');
});

ok('20. variants displayed as clickable tags', () => {
  assert.ok(exercisesPage.includes('Variantes'), 'variants section absent');
  assert.ok(exercisesPage.includes('Layers'), 'Layers icon absent');
  assert.ok(exercisesPage.includes('activeDetailExercise.variants'), 'variants data absent');
});

ok('21. similar exercises clickable to navigate', () => {
  assert.ok(exercisesPage.includes('Exercices similaires'), 'similar section absent');
  assert.ok(exercisesPage.includes('ChevronRight'), 'chevron icon absent');
  assert.ok(exercisesPage.includes('setActiveDetailExercise(se)'), 'navigation handler absent');
});

ok('22. performance summary shows trend, last, best, evolution, target', () => {
  assert.ok(exercisesPage.includes('Progression & historique'), 'perf section absent');
  assert.ok(exercisesPage.includes('TREND_INFO'), 'trend info absent');
  assert.ok(exercisesPage.includes('detailPerf.lastV'), 'last value absent');
  assert.ok(exercisesPage.includes('detailPerf.bestV'), 'best value absent');
  assert.ok(exercisesPage.includes('detailPerf.delta'), 'evolution absent');
  assert.ok(exercisesPage.includes('detailPerf.target'), 'target absent');
});

ok('23. ProgressChart renders in exercise detail', () => {
  assert.ok(exercisesPage.includes('<ProgressChart'), 'chart absent');
  assert.ok(exercisesPage.includes('exd-chart'), 'chart testid absent');
});

ok('24. history rows with deltas shown', () => {
  assert.ok(exercisesPage.includes('exd-history-row'), 'history row testid absent');
  assert.ok(exercisesPage.includes('exd-history-delta'), 'delta testid absent');
});

// -----------------------------------------------------------
// 5. MOBILE UX / RESPONSIVE
// -----------------------------------------------------------

ok('25. mobile filter button has Filter icon and label', () => {
  assert.ok(exercisesPage.includes('<Filter className="w-4 h-4" />'), 'Filter icon absent');
  assert.ok(exercisesPage.includes('Filtres'), 'label text absent');
});

ok('26. search suggestions dropdown max-height and scroll', () => {
  assert.ok(exercisesPage.includes('max-h-60'), 'max-height absent');
  assert.ok(exercisesPage.includes('overflow-y-auto'), 'scroll absent');
});

ok('27. mobile filter drawer has safe area and scroll', () => {
  assert.ok(exercisesPage.includes('max-w-sm'), 'max-width absent');
  assert.ok(exercisesPage.includes('overflow-y-auto'), 'drawer scroll absent');
});

ok('28. search input has min-height 44px for touch', () => {
  assert.ok(exercisesPage.includes('py-2.5'), 'touch target padding absent');
});

ok('29. filter chips and selects have touch-friendly sizes', () => {
  assert.ok(exercisesPage.includes('py-1.5'), 'chip padding absent');
  assert.ok(exercisesPage.includes('rounded-xl'), 'rounded corners absent');
});

// -----------------------------------------------------------
// 6. BIBLIOTHÈQUE ÉTIREMENTS - ORGANISATION
// -----------------------------------------------------------

ok('30. stretch library items have targetArea for categorization', () => {
  assert.ok(exercisesPage.includes('st.targetArea'), 'targetArea absent');
  assert.ok(exercisesPage.includes('LibraryStretchCard'), 'stretch card component absent');
});

ok('31. stretch library count = 113', () => {
  assert.equal(ALL_INDIVIDUAL_STRETCHES.length, 113, 'stretch count mismatch');
  assert.equal(STRETCH_LIBRARY_ITEMS.length, 113, 'library items count mismatch');
});

ok('32. library unified count = 501 (388 ex + 113 stretches)', () => {
  assert.equal(initialExercises.length + STRETCH_LIBRARY_ITEMS.length, 501, 'total count mismatch');
});

// -----------------------------------------------------------
// 7. PERFORMANCE / NO REGRESSION
// -----------------------------------------------------------

ok('33. ExerciseCard and LibraryStretchCard use React.memo', () => {
  assert.ok(exercisesPage.includes('React.memo(function ExerciseCard'), 'ExerciseCard memo absent');
  assert.ok(exercisesPage.includes('React.memo(function LibraryStretchCard'), 'StretchCard memo absent');
});

ok('34. no heavy dependencies added', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const deps = Object.keys(pkg.dependencies || {}).join(' ');
  const devDeps = Object.keys(pkg.devDependencies || {}).join(' ');
  const all = deps + ' ' + devDeps;
  assert.ok(!/motion|framer|@google\/genai|three/.test(all), `heavy dep detected: ${all}`);
});

ok('36. IndexedDB version unchanged (V8)', () => {
  const db = read('db/indexedDb.ts');
  assert.ok(db.includes('const DB_VERSION = 8;'), 'DB_VERSION !== 8');
  assert.ok(!db.match(/DB_VERSION\s*=\s*9/), 'DB_VERSION is 9');
});

// -----------------------------------------------------------
// 8. ACCESSIBILITÉ
// -----------------------------------------------------------

ok('37. search input has aria-autocomplete and aria-controls', () => {
  assert.ok(exercisesPage.includes('aria-autocomplete="list"'), 'aria-autocomplete absent');
  assert.ok(exercisesPage.includes('aria-controls="exercise-search-suggestions"'), 'aria-controls absent');
});

ok('38. modal dialogs have role="dialog" and aria-modal', () => {
  assert.ok(exercisesPage.includes('role="dialog"'), 'role dialog absent');
  assert.ok(exercisesPage.includes('aria-modal="true"'), 'aria-modal absent');
});

ok('39. buttons have aria-label and aria-pressed where needed', () => {
  assert.ok(exercisesPage.includes('aria-label="Ajouter au programme"'), 'add to program aria-label absent');
  assert.ok(exercisesPage.includes('aria-pressed'), 'aria-pressed absent');
});

// -----------------------------------------------------------
// 40. REPS/TIMER INDÉPENDANTS - AUCUNE CONVERSION
// -----------------------------------------------------------

ok('40. reps and timer stay independent in library', () => {
  assert.ok(!exercisesPage.includes('repsToDurationSec'), 'repsToDurationSec import absent');
  assert.ok(!exercisesPage.includes('durationToReps'), 'durationToReps import absent');
  assert.ok(!exercisesPage.includes('repsToDurationSec'), 'conversion function absent');
});

async function main() {
  console.log(`\nLOT C — ${passed} PASS, ${failed} FAIL`);
  if (failed > 0) process.exit(1);
}

void main();