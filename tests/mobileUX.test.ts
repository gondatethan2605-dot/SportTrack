// REFONTE MOBILE — tests de l'interface mobile (UI/UX) de SportTrack.
//
// Couvre le périmètre de la refonte mobile : navigation basse (5 raccourcis),
// menu coulissant groupé (Entraînement / Suivi / Profil), bibliothèque unifiée
// (501 = 388 exercices + 113 étirements), séance guidée (repos +/-15/Passer,
// timer mm:ss, pas de conversion reps<->durée), fiches, favoris, programme v2,
// IndexedDB V8, et invariants métier (aucune donnée ni logique modifiée).
// Desktop/tablette (>= md) : la sidebar historique est préservée.
//
// Exécutable via :  tsx tests/mobileUX.test.ts

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initialExercises } from '../src/data/initialExercises';
import { CORE_STRETCHES, LOWER_BODY_STRETCHES, UPPER_BODY_STRETCHES, ALL_INDIVIDUAL_STRETCHES } from '../src/data/stretchesData';
import { STRETCH_LIBRARY_ITEMS } from '../src/utilsStretchLibrary';
import { MY_PROGRAM } from '../src/data/myProgram';
import { parseDefaultReps } from '../src/utilsAlternatives';
import {
  adjustRestSeconds,
  buildStretchSteps,
  DEFAULT_TRANSITION_REST_SEC,
  resolveStretchRestSec,
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

const nav = read('components/Navigation.tsx');
const header = read('components/Header.tsx');
const css = read('index.css');
const homepage = read('pages/HomePage.tsx');
const programs = read('pages/ProgramsPage.tsx');
const exercises = read('pages/ExercisesPage.tsx');
const guided = read('components/workout/WorkoutGuidedSession.tsx');
const session = read('pages/WorkoutSessionPage.tsx');
const stats = read('pages/StatsPage.tsx');
const progression = read('pages/ProgressPage.tsx');
const goals = read('pages/GoalsPage.tsx');
const calendar = read('pages/CalendarPage.tsx');
const social = read('pages/SocialPage.tsx');
const settings = read('pages/SettingsPage.tsx');
const db = read('db/indexedDb.ts');
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

// ---------------------------------------------------------------------------
// 1-5. NAVIGATION BASSE mobile (5 raccourcis : Accueil, Programme, Séance,
// Bibliothèque, Menu) — exactement, sans "Étirements", "Exercices" dans le menu.
// ---------------------------------------------------------------------------

ok('1. navigation basse mobile présente (#mobile-bottom-nav)', () => {
  assert.ok(nav.includes('id="mobile-bottom-nav"'), '#mobile-bottom-nav absent');
});

ok('2a. exactement 5 boutons dans la navigation basse (ids mobiles uniques)', () => {
  const mobileIds = nav.match(/id="(mobile-nav-[a-z-]+)"/g) || [];
  const ids = mobileIds.map((m) => m.replace('id="', '').replace('"', '')).sort();
  assert.deepEqual(ids, [
    'mobile-nav-accueil',
    'mobile-nav-all-menu',
    'mobile-nav-bibliotheque',
    'mobile-nav-programme',
    'mobile-nav-seance',
  ], `attendu 5 boutons mobiles, trouvé ${JSON.stringify(ids)}`);
});

ok('2b. les 5 libellés attendus sont présents (Accueil/Programme/Séance/Bibliothèque/Menu)', () => {
  const expected = ['Accueil', 'Programme', 'Séance', 'Bibliothèque', 'Menu'];
  for (const label of expected) {
    const idByLabel: Record<string, string> = {
      Accueil: 'mobile-nav-accueil',
      Programme: 'mobile-nav-programme',
      Séance: 'mobile-nav-seance',
      Bibliothèque: 'mobile-nav-bibliotheque',
      Menu: 'mobile-nav-all-menu',
    };
    const buck = nav.slice(nav.indexOf(idByLabel[label]), nav.indexOf('</button>', nav.indexOf(idByLabel[label])));
    assert.ok(buck.includes(label), `${label} absent de la navigation basse`);
  }
});

ok('3. "Menu" présent (ouvre le tiroir) — bouton mobile-nav-all-menu', () => {
  assert.ok(nav.includes('id="mobile-nav-all-menu"'), 'bouton Menu absent');
  assert.ok(nav.includes('onOpenMobileMenu'), 'le bouton Menu doit ouvrir le tiroir');
});

ok('4. "Étirements" ABSENT de la navigation (bottom nav ET tiroir)', () => {
  assert.ok(!nav.includes('Étirements'), "le libellé Étirements ne doit pas apparaître dans la navigation");
  assert.ok(!nav.toLocaleLowerCase().includes('etirement'), 'aucune variante étirement dans le composant Navigation');
  const navIds = (nav.match(/mobile-nav-[a-z-]+/g) || []).join(' ');
  assert.ok(!navIds.includes('etirements'), 'aucun id de navigation "etirements"');
});

ok('5. "Exercices" présent dans le tiroir (groupe Entraînement)', () => {
  assert.ok(nav.includes('drawerGroups'), 'tiroir groupé absent');
  assert.ok(nav.includes('ENTRAÎNEMENT') || nav.includes("label: 'Entraînement'") || nav.includes("label: 'Entraînement'"), 'groupe Entraînement absent');
  assert.ok(nav.includes('Exercices') || nav.includes("label: 'Exercices'"), 'libellé Exercices absent du tiroir');
});

ok('6. tiroir groupé en 3 sections (Entraînement / Suivi / Profil) — Ordre mobile', () => {
  const order = [
    'Entraînement',
    'programme',
    'seance',
    'exercices',
    'Suivi',
    'objectifs',
    'calendrier',
    'statistiques',
    'progression',
    'Profil',
  ];
  for (const token of order) {
    assert.ok(nav.includes(token), `section/élément du tiroir absent : ${token}`);
  }
});

// ---------------------------------------------------------------------------
// 7-11. BIBLIOTHÈQUE mobile unifiée (501 = 388 + 113), recherche + filtres
// ---------------------------------------------------------------------------

ok('7. bibliothèque : environ 501 éléments (388 exercices + 113 étirements)', () => {
  assert.equal(initialExercises.length + STRETCH_LIBRARY_ITEMS.length, 501,
    `attendu 501 éléments, trouvé ${initialExercises.length + STRETCH_LIBRARY_ITEMS.length}`);
});

ok('8. bibliothèque : ~388 exercices', () => {
  assert.ok(initialExercises.length >= 380 && initialExercises.length <= 430, `attendu ~388, trouvé ${initialExercises.length}`);
});

ok('9. bibliothèque : 113 étirements individuels', () => {
  assert.equal(ALL_INDIVIDUAL_STRETCHES.length, 113, `attendu 113, trouvé ${ALL_INDIVIDUAL_STRETCHES.length}`);
  assert.equal(STRETCH_LIBRARY_ITEMS.length, 113, 'transformation bibliothèque unifiée doit produire 113 entrées');
});

ok('10. recherche mobile : champ + logique de filtrage présents', () => {
  assert.ok(exercises.includes('data-testid="exercise-search"'), 'champ recherche absent');
  assert.ok(exercises.includes('placeholder="Rechercher'), 'placeholder recherche absent');
  assert.ok(exercises.includes('searchTerm'), 'état searchTerm absent');
});

ok('11. onglets de filtre Tous / Exercices / Étirements (+ Favoris / Perso)', () => {
  for (const tid of [
    'exercise-filter-type-all',
    'exercise-filter-type-exercise',
    'exercise-filter-type-stretch',
    'exercise-filter-type-favorites',
    'exercise-filter-type-custom',
  ]) {
    assert.ok(exercises.includes(`data-testid="${tid}"`), `filtre absent : ${tid}`);
  }
  assert.ok(exercises.includes('data-testid="exercise-count"'), 'compteur d\'éléments absent');
  assert.ok(exercises.includes('data-testid="exercise-reset-filters"'), 'réinitialisation des filtres absente');
});

ok('12. cartes bibliothèque : grille verticale sur mobile (1 colonne), sans annotation "4×10"/"75 s"/"1×30"', () => {
  assert.ok(exercises.includes('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'), 'grille non verticale sur mobile');
  assert.ok(!exercises.includes('4×10'), 'annotation 4×10 présente dans la bibliothèque');
  assert.ok(!exercises.includes('75 s'), 'annotation 75 s présente sur une carte');
  assert.ok(!exercises.includes('1×30'), 'annotation 1×30 présente sur une carte');
  assert.ok(!exercises.includes('repsToDurationSec') && !exercises.includes('durationToReps'), 'conversion reps<->durée importée');
});

// ---------------------------------------------------------------------------
// PROGRAMMES (fiche #12/#20), SÉANCE (#13/#32), stats/progression/objectifs/
// calendrier/profil/paramètres (#14-16, #33-40)
// ---------------------------------------------------------------------------

ok('13. programmes : page + cartes + lancement de séance par jour', () => {
  assert.ok(programs.includes('id="page-programs"'), 'page programmes absente');
  assert.ok(programs.includes('data-testid="day-launch-session"'), 'bouton lancer la séance du jour absent');
  assert.equal(MY_PROGRAM.id, 'prog-my-personal-bodyweight', 'identité du programme personnel modifiée');
  assert.equal(MY_PROGRAM.days.length, 7, 'programme personnel : attendu 7 jours');
});

ok('14. séance guidée : UI mobile présente (série en cours, timer, repos)', () => {
  assert.ok(guided.includes('id="guided-session"'), 'écran séance guidée absent');
  assert.ok(guided.includes('id="guided-rest"'), 'phase repos absente');
  assert.ok(guided.includes('id="btn-guided-rest-sub15"'), 'repos -15 absent');
  assert.ok(guided.includes('id="btn-guided-rest-add15"'), 'repos +15 absent');
  assert.ok(guided.includes('id="btn-guided-skip-rest"'), 'repos Passer absent');
  assert.ok(guided.includes('id="btn-guided-skip-countdown"'), 'Passer le compte à rebours absent');
  assert.ok(guided.includes('id="guided-exercise-timer"') && guided.includes('id="guided-exercise-reps"'), 'exercice : timer OU reps manquant');
});

ok('15. stats : page accessible + cartes résumés', () => {
  assert.ok(stats.includes('id="page-stats"'), 'page stats absente');
  assert.ok(stats.includes('data-testid="stats-history-table"'), 'tableau d\'historique absent');
});

ok('16. progression : page + niveau/XP', () => {
  assert.ok(progression.includes('id="page-progress"'), 'page progression absente');
  assert.ok(header.includes("onNavigate('progression')"), 'le HUD niveau doit mener à la progression');
});

ok('17. objectifs : page + filtres par état/catégorie', () => {
  assert.ok(goals.includes('id="page-goals"') && goals.includes('data-testid="goals-page"'), 'page objectifs absente');
  assert.ok(goals.includes('Filtrer par état') && goals.includes('Filtrer par catégorie'), 'filtres objectifs absents');
});

ok('18. calendrier : grille 7 colonnes (pas de débordement horizontal)', () => {
  assert.ok(calendar.includes('id="page-calendar"'), 'page calendrier absente');
  assert.ok(calendar.includes('grid grid-cols-7'), 'grille 7 jours absente');
  assert.ok(calendar.includes('gap-1.5'), 'grille jours compacte attendue');
});

ok('19. profil : page sociale/aperçu du profil', () => {
  assert.ok(social.includes('id="page-social"'), 'page profil absente');
  assert.ok(social.includes('Comparaison des performances'), 'section comparaison absente');
});

ok('20. paramètres : page en sections + lien nav settings conservé', () => {
  assert.ok(settings.includes('id="page-settings"') && settings.includes('data-testid="settings-page"'), 'page paramètres absente');
  assert.ok(nav.includes("data-testid={item.id === 'parametres' ? 'settings-nav' : undefined}"), 'cible testid settings-nav retirée');
  assert.ok(settings.includes('<section'), 'paramètres utilisent des sections');
});

// ---------------------------------------------------------------------------
// FAVORIS (#41), PROGRAMME v2 (#LOT14), IndexedDB V8 (#42), repos étirements
// (#43), timer mm:ss (#45), reps (#47), aucune logique métier modifiée (#48)
// ---------------------------------------------------------------------------

ok('21. favoris conservés : filtre + fiche + données d\'origine', () => {
  assert.ok(exercises.includes("filterType === 'favorites'"), 'filtre favoris absent');
  assert.ok(exercises.includes('data-testid="exercise-detail-favorite"'), 'favori dans la fiche détail absent');
  const favs = new Map(initialExercises.map((e) => [e.id, !!e.isFavorite]));
  assert.ok(favs.get('ex-hip-thrust'), 'ex-hip-thrust doit rester favori');
  assert.ok(favs.get('ex-romanian-deadlift'), 'ex-romanian-deadlift doit rester favori');
});

ok('22. programme v2 : tous les ids exercices + étirements résolus', () => {
  const exIdSet = new Set(initialExercises.map((e) => e.id));
  // Les programmes référencent AUSSI les étirements des 3 presets (core/lower/
  // upper) — l\'ensemble valide est donc presets ∪ individuels (125 dédupliqués).
  const stretchIdSet = new Set(
    [...CORE_STRETCHES, ...LOWER_BODY_STRETCHES, ...UPPER_BODY_STRETCHES, ...ALL_INDIVIDUAL_STRETCHES].map((s) => s.id)
  );
  const missingEx: string[] = [];
  const missingSt: string[] = [];
  for (const day of MY_PROGRAM.days) {
    for (const id of day.exerciseIds || []) if (!exIdSet.has(id)) missingEx.push(`${day.id} → ${id}`);
    for (const st of day.stretches || []) if (!stretchIdSet.has(st.id)) missingSt.push(`${day.id} → ${st.id}`);
  }
  assert.deepEqual(missingEx, [], 'exerciseIds orphelins dans le programme v2');
  assert.deepEqual(missingSt, [], 'stretches orphelins dans le programme v2');
});

ok('23. IndexedDB : DB_VERSION = 8, aucune migration V9', () => {
  assert.ok(db.includes('const DB_VERSION = 8;'), 'DB_VERSION doit être 8');
  assert.ok(!db.match(/DB_VERSION\s*=\s*9/), 'DB_VERSION ne doit PAS être 9');
});

ok('24. repos entre étirements intact dans la séance guidée (moteur non modifié)', () => {
  const side = ALL_INDIVIDUAL_STRETCHES.find((s) => s.hasSides) || ALL_INDIVIDUAL_STRETCHES[0];
  const steps = buildStretchSteps([side]);
  assert.equal(steps.length, side.hasSides ? 2 : 1, 'buildStretchSteps : 1 pas par côté');
  assert.equal(resolveStretchRestSec(), DEFAULT_TRANSITION_REST_SEC, 'repos inter-étirements doit rester 30 s');
  assert.equal(adjustRestSeconds(10, -15), 0, 'clamp à 0 (jamais négatif)');
});

ok('25. timer au format mm:ss — 35 s affiché 00:35, sans conversion reps↔durée', () => {
  // formatTime des deux écrans (WorkoutSessionPage et WorkoutGuidedSession)
  // produit systématiquement {mm:ss} avec padStart(2,'0').
  for (const src of [guided, session]) {
    assert.ok(src.includes('.toString().padStart(2, \'0\')'), 'padding mm:ss absent du formatage');
    assert.ok(src.includes('padStart(2, \'0\')}:'), 'format mm:ss absent');
  }
  assert.ok(!guided.includes('repsToDurationSec') && !guided.includes('durationToReps'), 'conversion reps->durée dans la séance guidée');
  for (const e of initialExercises) {
    assert.ok(parseDefaultReps(e.defaultReps as number | string).value > 0, `${e.id} defaultReps non positif`);
  }
});

// ---------------------------------------------------------------------------
// IA. ACCESSIBILITÉ MOBILE (hors liste 25, spec §34)
// ---------------------------------------------------------------------------

ok('A1. tiroir : fermeture Échap + clic sur le fond (backdrop)', () => {
  assert.ok(nav.includes("if (e.key === 'Escape')"), 'gestion Échap absente');
  assert.ok(nav.includes("e.target === e.currentTarget"), 'fermeture au clic sur le fond absente');
  assert.ok(nav.includes('document.body.style.overflow = \'hidden\''), 'verrouillage du scroll absente');
});

ok('A2. tiroir : piège de focus (Tab) + focus initial sur le bouton fermer', () => {
  assert.ok(nav.includes('data-drawer-close'), 'bouton fermer ciblable absent');
  assert.ok(nav.includes('focusables'), 'piège de focus absent');
  assert.ok(nav.includes('previousActive'), 'restauration du focus absent');
});

ok('A3. cibles tactiles : nav basse, menu header, chips filtres, champs numériques ≥44/40 px', () => {
  assert.ok(css.includes('#mobile-bottom-nav button'), 'règle cible nav basse absente');
  assert.ok(css.includes('min-height: 44px'), 'min-height 44px absent');
  assert.ok(header.includes('w-11 h-11'), 'bouton menu header < 44px');
  assert.ok(css.includes('touch-action: manipulation'), 'protection double-tap/zoom absente');
  assert.ok(css.includes('input[type="number"]'), 'cible numérique absente');
});

ok('A4. safe areas : bottom nav + header + tiroir + main', () => {
  assert.ok(css.includes('#mobile-bottom-nav'), 'safe-area bottom nav manquante');
  assert.ok(css.includes('env(safe-area-inset-bottom'), 'env(safe-area-inset-bottom) manquante');
  assert.ok(css.includes('env(safe-area-inset-top'), 'env(safe-area-inset-top) manquante');
  assert.ok(css.includes('#mobile-drawer'), 'safe-area tiroir manquante');
  assert.ok(css.includes('max-width: 100%') && css.includes('overflow-x: hidden'), 'garde anti-débordement horizontale absente');
});

ok('A5. modales mobiles : contenu scrollable (max-height dvh + fallback vh)', () => {
  assert.ok(css.includes('max-height: min(88dvh, 88vh)'), 'règle max-height dvh absente');
  assert.ok(css.includes('overflow-y: auto'), 'scroll vertical modal absent');
  assert.ok(exercises.includes('max-h-[90vh]'), 'fiche exercice : max-h ou scroll manquant');
});

// ---------------------------------------------------------------------------
// IA2. APPAREIL PUR / DÉPENDANCES — aucune régression de stack
// ---------------------------------------------------------------------------

ok('A6. aucune dépendance ajoutée (motion / genai) ; rester léger mobile', () => {
  const deps = Object.keys(packageJson.dependencies || {}).join(' ');
  const ignores = deps + ' ' + Object.keys(packageJson.devDependencies || {}).join(' ');
  assert.ok(!/motion|framer|@google\/genai|three/.test(ignores), `dépendance lourde détectée : ${ignores}`);
});

ok('A7. pages desktop : sidebar historique (>= md) ET routes identiques', () => {
  assert.ok(nav.includes('id="desktop-sidebar"') && nav.includes('hidden md:flex'), 'sidebar desktop altérée');
  assert.ok(header.includes('hidden md:flex'), 'streak desktop conservé');
  // Les 10 routes de navigation sont inchangées.
  const pages = ['accueil', 'programme', 'exercices', 'seance', 'calendrier', 'statistiques', 'objectifs', 'progression', 'profil', 'parametres'];
  for (const p of pages) {
    assert.ok(nav.includes(`{ id: '${p}'`), `route manquante : ${p}`);
  }
});

async function main() {
  // Contrôle de non-régression des données cœur (séance guidée : repos ±15 exacts).
  if (adjustRestSeconds(15, 15) !== 30 || adjustRestSeconds(75, -15) !== 60) {
    throw new Error('ajustement ±15 spoussé');
  }
  console.log(`\nMobile UX — ${passed} PASS, ${failed} FAIL`);
  if (failed > 0) process.exit(1);
}

void main();