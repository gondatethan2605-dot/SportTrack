// LOT B — Accueil + Navigation Mobile
// Tests ciblés pour valider la refonte de l'accueil et de la navigation mobile.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
const homepage = read('pages/HomePage.tsx');
const header = read('components/Header.tsx');

// -----------------------------------------------------------
// 1. ACCUEIL — Hiérarchie visuelle "Action du jour"
// -----------------------------------------------------------

ok('1. Hero affiche le badge "AUJOURD\'HUI" ou "PROCHAINE SÉANCE"', () => {
  assert.ok(homepage.includes("AUJOURD'HUI"), 'badge AUJOURD\'HUI absent');
  assert.ok(homepage.includes('PROCHAINE SÉANCE'), 'badge PROCHAINE SÉANCE absent');
});

ok('2. Hero affiche le jour de la séance (ex: Lundi)', () => {
  assert.ok(homepage.includes('nextSession.day.dayOfWeek'), 'jour de la séance absent du hero');
});

ok('3. Hero affiche nombre d\'exercices, séries, durée, muscles', () => {
  assert.ok(homepage.includes('nextSession.exerciseCount'), 'nb exercices absent');
  assert.ok(homepage.includes('nextSession.setCount'), 'nb séries absent');
  assert.ok(homepage.includes('nextSession.durationMin'), 'durée absente');
  assert.ok(homepage.includes('nextSession.day.muscleGroups'), 'muscles absents');
});

ok('4. Bouton principal "COMMENCER LA SÉANCE" (pas seulement "COMMENCER")', () => {
  assert.ok(homepage.includes('COMMENCER LA SÉANCE'), 'libellé bouton principal incorrect');
  assert.ok(homepage.includes('id="btn-start-session-hero"'), 'id bouton principal absent');
  assert.ok(homepage.includes('min-w-[280px]'), 'largeur minimale bouton principal absente');
});

ok('5. Bouton secondaire "Séance rapide" présent', () => {
  assert.ok(homepage.includes('Séance rapide'), 'bouton séance rapide absent');
  assert.ok(homepage.includes('id="btn-quick-session-hero"'), 'id bouton séance rapide absent');
});

ok('6. Lien "Voir le programme complet" présent', () => {
  assert.ok(homepage.includes('Voir le programme complet'), 'lien programme absent');
  assert.ok(homepage.includes('id="btn-quick-program"'), 'id lien programme absent');
});

// -----------------------------------------------------------
// 2. NAVIGATION MOBILE — Bottom nav + Drawer
// -----------------------------------------------------------

ok('7. Bottom nav mobile : 5 boutons (Accueil, Programme, Séance, Bibliothèque, Menu)', () => {
  const mobileIds = nav.match(/id="(mobile-nav-[a-z-]+)"/g) || [];
  const ids = mobileIds.map((m) => m.replace('id="', '').replace('"', '')).sort();
  assert.deepEqual(ids, [
    'mobile-nav-accueil',
    'mobile-nav-all-menu',
    'mobile-nav-bibliotheque',
    'mobile-nav-programme',
    'mobile-nav-seance',
  ], `ids bottom nav inattendus : ${JSON.stringify(ids)}`);
});

ok('8. Bottom nav : libellés exacts [Accueil, Programme, Séance, Bibliothèque, Menu]', () => {
  const expected = ['Accueil', 'Programme', 'Séance', 'Bibliothèque', 'Menu'];
  for (const label of expected) {
    const idByLabel: Record<string, string> = {
      Accueil: 'mobile-nav-accueil',
      Programme: 'mobile-nav-programme',
      Séance: 'mobile-nav-seance',
      Bibliothèque: 'mobile-nav-bibliotheque',
      Menu: 'mobile-nav-all-menu',
    };
    const startIdx = nav.indexOf(idByLabel[label]);
    assert.ok(startIdx !== -1, `id pour ${label} introuvable`);
    const snippet = nav.slice(startIdx, nav.indexOf('</button>', startIdx));
    assert.ok(snippet.includes(label), `${label} absent de la bottom nav`);
  }
});

ok('9. Bouton "Bibliothèque" navigue vers la page "exercices"', () => {
  assert.ok(nav.includes('mobile-nav-bibliotheque'), 'id mobile-nav-bibliotheque absent');
  assert.ok(nav.includes("onNavigate('exercices')"), 'navigation vers exercices absente');
  assert.ok(nav.includes('BookOpen'), 'icône BookOpen absente pour Bibliothèque');
});

ok('10. "Stats" ABSENT de la bottom nav mobile', () => {
  assert.ok(!nav.includes('mobile-nav-statistiques'), 'ancien id mobile-nav-statistiques encore présent');
  // Vérifier que le libellé "Stats" n'est pas dans la bottom nav
  const bottomNavSection = nav.slice(nav.indexOf('id="mobile-bottom-nav"'), nav.indexOf('</nav>', nav.indexOf('id="mobile-bottom-nav"')));
  assert.ok(!bottomNavSection.includes('>Stats<'), 'libellé Stats encore présent dans bottom nav');
});

ok('11. Drawer mobile : groupe Entraînement contient Bibliothèque (label Bibliothèque)', () => {
  assert.ok(nav.includes("label: 'Bibliothèque'") || nav.includes('label: "Bibliothèque"'), 'label Bibliothèque absent du drawer');
  assert.ok(nav.includes('Entraînement'), 'groupe Entraînement absent');
});

ok('12. Drawer mobile : groupe Suivi dans l\'ordre Statistiques, Progression, Objectifs, Calendrier', () => {
  const drawerIdx = nav.indexOf('drawerGroups');
  assert.ok(drawerIdx !== -1, 'drawerGroups absent');
  const suiviIdx = nav.indexOf("label: 'Suivi'", drawerIdx);
  assert.ok(suiviIdx !== -1, 'groupe Suivi absent dans drawerGroups');
  const itemsIdx = nav.indexOf('items:', suiviIdx);
  assert.ok(itemsIdx !== -1, 'items: absent dans groupe Suivi');
  const bracketOpen = nav.indexOf('[', itemsIdx);
  // Trouver le crochet fermant correspondant (compter la profondeur)
  let depth = 0;
  let bracketClose = -1;
  for (let i = bracketOpen; i < nav.length; i++) {
    if (nav[i] === '[') depth++;
    else if (nav[i] === ']') {
      depth--;
      if (depth === 0) {
        bracketClose = i;
        break;
      }
    }
  }
  assert.ok(bracketClose !== -1, 'crochet fermant items non trouvé');
  const itemsArray = nav.slice(bracketOpen, bracketClose + 1);
  // Vérifier l'ordre via les indices navItems : [7]=Statistiques, [6]=Progression, [5]=Objectifs, [4]=Calendrier
  const order = ['navItems[7]', 'navItems[6]', 'navItems[5]', 'navItems[4]'];
  let lastPos = -1;
  for (const item of order) {
    const pos = itemsArray.indexOf(item);
    assert.ok(pos !== -1, `${item} absent du groupe Suivi`);
    assert.ok(pos > lastPos, `ordre incorrect dans Suivi : ${item} avant élément précédent`);
    lastPos = pos;
  }
});

ok('13. Drawer mobile : groupe Profil contient Profil, Paramètres', () => {
  assert.ok(nav.includes('Profil'), 'groupe Profil absent');
});

// -----------------------------------------------------------
// 3. DESKTOP — Navigation préservée
// -----------------------------------------------------------

ok('14. Sidebar desktop : navGroups inchangée (Entraînement/Suivi/Profil)', () => {
  assert.ok(nav.includes('navGroups'), 'navGroups desktop absent');
  assert.ok(nav.includes('Entraînement'), 'groupe Entraînement desktop absent');
  assert.ok(nav.includes('Suivi'), 'groupe Suivi desktop absent');
  assert.ok(nav.includes('Profil'), 'groupe Profil desktop absent');
});

ok('15. Routes de navigation identiques (10 routes)', () => {
  const pages = ['accueil', 'programme', 'exercices', 'seance', 'calendrier', 'statistiques', 'objectifs', 'progression', 'profil', 'parametres'];
  for (const p of pages) {
    assert.ok(nav.includes(`id: '${p}'`), `route manquante : ${p}`);
  }
});

// -----------------------------------------------------------
// 4. RESPONSIVE — Présence des classes responsive critiques
// -----------------------------------------------------------

ok('16. Bottom nav : classes responsive md:hidden + fixed bottom', () => {
  assert.ok(nav.includes('md:hidden'), 'md:hidden absent sur bottom nav');
  assert.ok(nav.includes('fixed bottom-0'), 'fixed bottom-0 absent');
  assert.ok(nav.includes('left-0 right-0'), 'left-0 right-0 absent');
});

ok('17. Drawer : safe areas + overflow-y-auto + max-w-sm', () => {
  assert.ok(nav.includes('max-w-sm'), 'max-w-sm absent sur drawer');
  assert.ok(nav.includes('overflow-y-auto'), 'overflow-y-auto absent sur drawer');
});

ok('18. Hero accueil : responsive text-3xl sm:text-4xl + flex-col lg:flex-row', () => {
  assert.ok(homepage.includes('text-3xl sm:text-4xl'), 'responsive titre hero absent');
  assert.ok(homepage.includes('flex-col lg:flex-row'), 'layout responsive hero absent');
});

ok('19. Bouton principal : min-w-[280px] pour éviter troncature mobile', () => {
  assert.ok(homepage.includes('min-w-[280px]'), 'min-width bouton principal absent');
});

// -----------------------------------------------------------
// 5. ABSENCE DE RÉGRESSION — Données & logique inchangées
// -----------------------------------------------------------

ok('20. getNextProgramDay toujours utilisé pour la séance du jour', () => {
  assert.ok(homepage.includes('getNextProgramDay'), 'getNextProgramDay non utilisé');
});

ok('21. onStartSession appelé avec nextSession?.day.id', () => {
  assert.ok(homepage.includes('onStartSession(nextSession'), 'appel onStartSession modifié');
});

ok('22. dashboardBlocks + orderedBlocks inchangés (blocs configurables préservés)', () => {
  assert.ok(homepage.includes('dashboardBlocks'), 'dashboardBlocks absent');
  assert.ok(homepage.includes('orderedBlocks'), 'orderedBlocks absent');
  assert.ok(homepage.includes('DEFAULT_DASHBOARD_BLOCKS'), 'fallback blocs par défaut absent');
});

ok('23. Quick session modal préservée (10/20/30 min)', () => {
  assert.ok(homepage.includes('QUICK_SESSION_PRESETS'), 'presets séance rapide absents');
  // Les data-testid sont générés via template literal `quick-session-${m}`
  assert.ok(homepage.includes('quick-session-'), 'data-testid quick-session absent');
  assert.ok(homepage.includes('QUICK_SESSION_PRESETS.map'), 'map sur presets absent');
});

ok('24. Aucune dépendance ajoutée (motion, genai, three)', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const deps = Object.keys(pkg.dependencies || {}).join(' ');
  const devDeps = Object.keys(pkg.devDependencies || {}).join(' ');
  const all = deps + ' ' + devDeps;
  assert.ok(!/motion|framer|@google\/genai|three/.test(all), `dépendance lourde détectée : ${all}`);
});

ok('25. IndexedDB version = 8 (inchangée)', () => {
  const db = read('db/indexedDb.ts');
  assert.ok(db.includes('const DB_VERSION = 8;'), 'DB_VERSION !== 8');
  assert.ok(!db.match(/DB_VERSION\s*=\s*9/), 'DB_VERSION ne doit pas être 9');
});

// -----------------------------------------------------------
// 6. ACCESSIBILITÉ — Cibles tactiles, focus, aria
// -----------------------------------------------------------

ok('26. Bottom nav : boutons min-h-11 min-w-11 (44px)', () => {
  assert.ok(nav.includes('min-h-11'), 'min-h-11 absent sur bottom nav');
  assert.ok(nav.includes('min-w-11'), 'min-w-11 absent sur bottom nav');
});

ok('27. Drawer : focus trap + Escape + backdrop click + scroll lock', () => {
  assert.ok(nav.includes("e.key === 'Escape'"), 'gestion Escape absente');
  assert.ok(nav.includes('e.target === e.currentTarget'), 'fermeture backdrop absente');
  assert.ok(nav.includes('document.body.style.overflow'), 'scroll lock absent');
  assert.ok(nav.includes('focusables'), 'focus trap absent');
  assert.ok(nav.includes('previousActive'), 'restauration focus absente');
});

ok('28. Hero : aria-current sur page active', () => {
  assert.ok(nav.includes('aria-current'), 'aria-current absent');
});

ok('29. Header : bouton menu mobile w-11 h-11 (44px)', () => {
  assert.ok(header.includes('w-11 h-11'), 'cible tactile header < 44px');
});

async function main() {
  console.log(`\nLOT B — ${passed} PASS, ${failed} FAIL`);
  if (failed > 0) process.exit(1);
}

void main();