// LOT 8 — Polish final : tests d'invariants statiques des corrections apportées.
//
// Vérifie, depuis les FICHIERS réels du projet (aucun navigateur requis) :
//   S1 — lazy loading des pages + précache PWA des chunks hashed ;
//   S2 — plus aucune clé de jour calendaire construite en UTC ;
//   S3 — la métrique XP d'objectif reste dérivée du total cumulé (voir goals.test) ;
//   S4 — backup/import : négatifs finis tolérés, corruption toujours refusée (backup.test) ;
//   S5 — écran de séance : aucun stepper/état regressions, moteur guidé intact ;
//   S7 — accessibilité : focus visible, aria-current, dialog ARIA ;
//   S8 — PWA : safe areas / manifest / icônes inchangés (pwa.test) ;
//   DB — toujours V8 (aucune V9).
//
// Exécutable via :  tsx tests/fixLOT8.test.ts

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
function na(name: string) {
  console.log(`N/A   ${name}`);
}

function read(p: string): string {
  return fs.readFileSync(p, 'utf8');
}
function fileExists(p: string): boolean {
  return fs.existsSync(p);
}

const appRaw = read(path.join(SRC, 'App.tsx'));

// ---- S1 — performance : lazy loading -----------------------------------------
ok('S1 App.tsx : React.lazy utilisé', () => {
  assert.match(appRaw, /React\.lazy\(\(\) => import\('\.\/pages\//);
});
ok('S1 App.tsx : Suspense enveloppe les pages', () => {
  assert.match(appRaw, /Suspense/);
  assert.ok(appRaw.includes('<Suspense') && appRaw.includes('</Suspense>'));
});
ok('S1 App.tsx : HomePage reste importée statiquement (page d\'atterrissage)', () => {
  assert.match(appRaw, /import \{ HomePage \} from '\.\/pages\/HomePage'/);
});
ok('S1 App.tsx : les 9 autres pages sont lazy (aucune import statique restante)', () => {
  const pages = ['ProgramsPage', 'ExercisesPage', 'StretchesPage', 'WorkoutSessionPage',
    'CalendarPage', 'StatsPage', 'GoalsPage', 'ProgressPage', 'SocialPage', 'SettingsPage'];
  for (const p of pages) {
    assert.ok(!new RegExp(`import \\{ ${p} \\} from '\\.\\/pages\\/`).test(appRaw), `${p} encore importée statiquement`);
    assert.ok(new RegExp(`const ${p} = React\\.lazy`).test(appRaw), `${p} non lazy`);
  }
});
ok('S1 scripts/precache-sw.mjs existe (précache PWA des chunks)', () => {
  assert.ok(fileExists(path.join(ROOT, 'scripts', 'precache-sw.mjs')));
});
ok('S1 package.json : build chaîne vite build + precache-sw', () => {
  const pkg = JSON.parse(read(path.join(ROOT, 'package.json')));
  assert.equal(pkg.scripts.build, 'vite build && node scripts/precache-sw.mjs');
});
ok('S1 public/sw.js : marqueur de précache + cache v7', () => {
  const sw = read(path.join(ROOT, 'public', 'sw.js'));
  assert.ok(sw.includes('/*__PRECACHE_ASSETS__*/'));
  assert.ok(sw.includes("'sporttrack-cache-v7'"));
});
if (fileExists(path.join(ROOT, 'dist', 'sw.js'))) {
  ok('S1 dist/sw.js : chunks hashed précachés après build', () => {
    const builtSw = read(path.join(ROOT, 'dist', 'sw.js'));
    // Assets are precached RELATIVE to the SW scope (sub-path compatible).
    assert.match(builtSw, /'assets\/[^']+\.(js|css)'/);
  });
} else {
  na('S1 dist/sw.js absent (build non exécuté) — test différé au build');
}

// ---- S2 — dates locales ------------------------------------------------------
const workspaceRaw = read(path.join(SRC, 'pages', 'WorkoutSessionPage.tsx'));
ok('S2 WorkoutSessionPage : la date de séance est locale (toLocalDateKey)', () => {
  assert.ok(workspaceRaw.includes('date: toLocalDateKey(new Date())'), 'date de séance encore en UTC');
});
ok('S2 WorkoutSessionPage : plus de date UTC .toISOString().split(\'T\')[0]', () => {
  assert.ok(!/date:\s*new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]/.test(workspaceRaw));
});
ok('S2 initialData : joinedDate est une date locale', () => {
  const initRaw = read(path.join(SRC, 'data', 'initialData.ts'));
  assert.ok(initRaw.includes("joinedDate: toLocalDateKey(new Date())"));
  assert.ok(!/joinedDate:\s*new Date\(\)\.toISOString/.test(initRaw));
});
{
  // Seule occurrence d'une clé de jour via UTC autorisée à rester :
  // le nom de fichier du backup téléchargé (cosmétique, SettingsPage).
  const allowedFile = path.join(SRC, 'pages', 'SettingsPage.tsx');
  const allowed = read(allowedFile).includes("new Date().toISOString().split('T')[0]");
  let occurrences = 0;
  for (const f of fs.readdirSync(path.join(SRC, 'pages'))) {
    if (!f.endsWith('.tsx') && !f.endsWith('.ts')) continue;
    const c = read(path.join(SRC, 'pages', f));
    const matches = c.match(/new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]/g);
    if (matches) occurrences += matches.length;
  }
  ok('S2 pages/ : exactement 1 clé de jour UTC restante, cosmétique (nom de fichier backup)', () => {
    assert.equal(occurrences, 1, `occurrences trouvées: ${occurrences}`);
    assert.ok(allowed, 'l’occurrence résiduelle n’est pas celle autorisée');
  });
}

// ---- S3 — objectif XP (invariant de câblage) --------------------------------
ok('S3 utilsGoals : métrique xp dérivée du total cumulé (totalXpFromProfile)', () => {
  const goalsRaw = read(path.join(SRC, 'utilsGoals.ts'));
  assert.ok(goalsRaw.includes('totalXpFromProfile'));
  assert.match(goalsRaw, /case 'xp':/);
});
ok('S3 utilsLevels : formules inchangées (500 / 1.35)', () => {
  const lvlRaw = read(path.join(SRC, 'utilsLevels.ts'));
  assert.ok(lvlRaw.includes('LEVEL_BASE_XP = 500') && lvlRaw.includes('LEVEL_GROWTH = 1.35'));
});
ok('S3 utilsXp : formule XP unique inchangée (250 + 20n + 25s)', () => {
  const xpRaw = read(path.join(SRC, 'utilsXp.ts'));
  assert.match(xpRaw, /250 \+ exerciseCount \* 20 \+ completedStretchesCount \* 25/);
});

// ---- S4 — backup --------------------------------------------------------------
ok('S4 backup.ts : stocke la validation des nombres finis + limites', () => {
  const bRaw = read(path.join(SRC, 'db', 'backup.ts'));
  assert.ok(bRaw.includes('NON_FINITE_NUMBER'));
  assert.ok(bRaw.includes('MAX_STORE_RECORDS') && bRaw.includes('MAX_BACKUP_BYTES'));
});

// ---- S5 — écran de séance (aucune régression cosmétique/technique) ----------
ok('S5 WorkoutSessionPage : steppers timer ≥ 36px conservés (w-9 h-9)', () => {
  assert.ok(workspaceRaw.includes('w-9 h-9 rounded-lg'));
});
ok('S5 moteur guidé : import repsToDurationSec/durationToReps (cadence, jamais persisté)', () => {
  assert.ok(workspaceRaw.includes('repsToDurationSec, durationToReps'));
});
ok('S5 moteur guidé : fichier moteur intact', () => {
  assert.ok(fileExists(path.join(SRC, 'components', 'workout', 'workoutGuidedEngine.ts')));
});

// ---- S7 — accessibilité ------------------------------------------------------
ok('S7 index.css : focus visible sur .glass-input (outline retiré du :focus)', () => {
  const css = read(path.join(SRC, 'index.css'));
  const block = css.slice(css.indexOf('.glass-input:focus'));
  assert.ok(block.includes('outline: 2px solid'), 'pas de focus ring visible');
});
ok('S7 Navigation : aria-current="page" sur les liens actifs', () => {
  const nav = read(path.join(SRC, 'components', 'Navigation.tsx'));
  const hits = (nav.match(/aria-current=\{isActive \? 'page' : undefined\}/g) || []).length;
  assert.equal(hits, 2, 'desktop + drawer');
});
ok('S7 Navigation : tiroir mobile rôle dialog / aria-modal / aria-labelledby', () => {
  const nav = read(path.join(SRC, 'components', 'Navigation.tsx'));
  assert.ok(nav.includes('role="dialog"') && nav.includes('aria-modal="true"') && nav.includes('id="mobile-drawer-title"'));
});

// ---- DB : V8 ----------------------------------------------------------------
ok('DB : DB_VERSION = 8 (exactement, pas de 9)', () => {
  const dbRaw = read(path.join(SRC, 'db', 'indexedDb.ts'));
  assert.match(dbRaw, /const DB_VERSION = 8/);
  assert.ok(!/DB_VERSION = 9|VERSION = 9/.test(dbRaw));
});

console.log(`\n===== RÉSUMÉ LOT 8 =====`);
console.log(`${passed}/${passed + failed} PASS`);