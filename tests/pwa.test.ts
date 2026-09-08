// LOT I — PWA / Expérience mobile : tests statiques et d'invariants.
//
// Ce fichier vérifie, à partir des FICHIERS réels du projet, les invariants
// que l'on peut contrôler sans navigateur : manifest, icônes PNG (dimensions,
// MIME), service worker, DB_VERSION=8 sans migration ni nouveau store, safe
// areas, liaison animations OFF, touch targets, etc.
//
// Exécutable via :  tsx tests/pwa.test.ts
//
// Ce qui nécessite un vrai navigateur (installabilité, offline au rechargement,
// rendu viewport/safe-areas, navigation) est signalé comme N/A, jamais passé.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
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
function pngInfo(file: string): { w: number; h: number; bitDepth: number; colorType: number } | null {
  try {
    const b = fs.readFileSync(file);
    if (b.readUInt32BE(0) !== 0x89504e47) return null;
    return {
      w: b.readUInt32BE(16),
      h: b.readUInt32BE(20),
      bitDepth: b[24],
      colorType: b[25],
    };
  } catch {
    return null;
  }
}

// ---- Manifest ------------------------------------------------------------
ok('manifest.webmanifest existe', () => {
  assert.ok(fileExists(path.join(PUBLIC, 'manifest.webmanifest')));
});

const manifest = JSON.parse(read(path.join(PUBLIC, 'manifest.webmanifest')));
ok('manifest est un JSON valide', () => {
  assert.ok(manifest && typeof manifest === 'object');
});
ok('manifest.name / short_name', () => {
  assert.equal(typeof manifest.name, 'string');
  assert.equal(typeof manifest.short_name, 'string');
  assert.ok(manifest.name.length > 0 && manifest.short_name.length > 0);
});
ok('start_url est résolu via marqueur de base (sub-path compatible)', () => {
  assert.ok(typeof manifest.start_url === 'string');
  // Either a plain '/' (root deploy) or the MARKER left for the build step
  // (sub-path deploy). Never a literal account/repo hard-coded in source.
  assert.ok(
    manifest.start_url === '/' ||
      manifest.start_url.includes('__BASE_APP__'),
    `start_url inattendu: ${manifest.start_url}`
  );
});
ok('display = standalone', () => {
  assert.equal(manifest.display, 'standalone');
});
ok('background_color / theme_color hex valides', () => {
  assert.ok(/^#[0-9a-fA-F]{6}$/.test(manifest.background_color));
  assert.ok(/^#[0-9a-fA-F]{6}$/.test(manifest.theme_color));
});
ok('icons: au moins une icône', () => {
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0);
});

for (const ic of manifest.icons) {
  const rel = ic.src.replace(/^\//, '').replace(/^__BASE_APP__\//, '');
  const file = path.join(PUBLIC, rel);
  ok(`icône ${ic.src} existe`, () => {
    assert.ok(fileExists(file), `fichier absent: ${file}`);
  });
  if (/image\/png/.test(ic.type || '') || /\.png$/i.test(ic.src)) {
    const info = pngInfo(file);
    ok(`icône PNG ${ic.src} est un PNG valide`, () => {
      assert.ok(info, `${ic.src} n'est pas un PNG lisible`);
    });
    if (info) {
      const [w, h] = (ic.sizes || 'x').split('x').map((n) => parseInt(n, 10));
      ok(`icône ${ic.src} dimensions ${ic.sizes}`, () => {
        assert.equal(info.w, w, 'largeur PNG');
        assert.equal(info.h, h, 'hauteur PNG');
      });
      ok(`icône ${ic.src} déclare type image/png`, () => {
        assert.equal(ic.type, 'image/png');
      });
    }
  }
}
ok('icônes manifest: aucune référence 404', () => {
  for (const ic of manifest.icons) {
    const rel = ic.src.replace(/^\//, '').replace(/^__BASE_APP__\//, '');
    assert.ok(fileExists(path.join(PUBLIC, rel)), ic.src);
  }
});

// ---- index.html ----------------------------------------------------------
const indexHtml = read(path.join(ROOT, 'index.html'));
ok('index.html: manifest référencé', () => {
  assert.match(indexHtml, /rel="manifest"\s+href="\/manifest\.webmanifest"/);
});
ok('index.html: viewport-fit=cover', () => {
  assert.ok(indexHtml.includes('viewport-fit=cover'));
});
ok('index.html: apple-touch-icon = PNG', () => {
  assert.match(indexHtml, /rel="apple-touch-icon"[\s\S]*\/icon-192\.png/);
});
ok('index.html: Content-Security-Policy présente', () => {
  assert.match(indexHtml, /http-equiv="Content-Security-Policy"/);
  assert.match(indexHtml, /script-src 'self'/);
  assert.match(indexHtml, /object-src 'none'/);
  assert.match(indexHtml, /frame-ancestors 'none'/);
});
ok('index.html: service worker enregistré via fichier externe', () => {
  assert.match(indexHtml, /sw-register\.js/);
  const swReg = read(path.join(PUBLIC, 'sw-register.js'));
  // Base-aware registration (works at domain root AND under a GitHub Pages
  // sub-path without hard-coding the account/repo).
  assert.match(swReg, /register\(/);
  assert.match(swReg, /getBaseURL\(\)\s*\+\s*'sw\.js'/);
  assert.match(swReg, /updateViaCache:\s*'none'/);
  assert.match(swReg, /controllerchange/);
  assert.match(swReg, /location\.reload/);
});

// ---- Service worker ------------------------------------------------------
const swRaw = read(path.join(PUBLIC, 'sw.js'));
ok('sw.js existe', () => {
  assert.ok(fileExists(path.join(PUBLIC, 'sw.js')));
});
ok('sw.js: installation (cache addAll)', () => {
  assert.match(swRaw, /caches\.open/);
  assert.match(swRaw, /addAll/);
});
ok('sw.js: activation purge vieux caches', () => {
  assert.match(swRaw, /activate/);
  assert.match(swRaw, /caches\.keys/);
});
ok('sw.js: navigation stale-while-revalidate / fallback offline', () => {
  assert.match(swRaw, /caches\.match\(event\.request\)/);
  assert.match(swRaw, /index\.html/);
});
ok('sw.js : assets en cache résolus via la base (sub-path compatible)', () => {
  for (const asset of ['icon-192.png', 'icon-512.png', 'favicon.png', 'manifest.webmanifest', 'index.html']) {
    assert.ok(swRaw.includes('${BASE}' + asset), `${{ raw: '${BASE}' + asset }.raw} absent du cache`);
  }
});
ok('sw.js: navigation fallback hors ligne résolu via la base', () => {
  assert.match(swRaw, /\`\$\{BASE\}index\.html\`/);
});
ok('sw.js: base dérivée du scope, jamais de compte/repo codé en dur', () => {
  assert.match(swRaw, /self\.registration\??\.scope/);
  assert.ok(!/github\.io\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/.test(swRaw), 'URL de compte codée en dur dans le SW');
  assert.ok(!/githubusercontent/.test(swRaw));
});
ok('sw.js: aucun reload en boucle', () => {
  assert.ok(!/location\.reload/.test(swRaw));
});

// ---- IndexedDB / DB_VERSION ----------------------------------------------
const dbRaw = read(path.join(SRC, 'db', 'indexedDb.ts'));
const versionMatch = dbRaw.match(/DB_VERSION\s*=\s*(\d+)/);
ok('DB_VERSION défini', () => {
  assert.ok(versionMatch);
});
ok('DB_VERSION = 8 (exactement, pas de 9)', () => {
  assert.equal(versionMatch![1], '8', `trouvé ${versionMatch![1]}`);
});
ok('object stores = ensemble v8 (10 stores, aucun nouveau)', () => {
  const known = ['profile', 'programs', 'exercises', 'sessions', 'records', 'goals',
    'measurements', 'exercisePerformances', 'exerciseBests', 'sessionDrafts'];
  const declared: string[] = [];
  for (const k of known) if (dbRaw.includes(`createObjectStore('${k}'`)) declared.push(k);
  assert.equal(declared.length, 10, `stores déclarés: ${declared.length}`);
  for (const k of known) assert.ok(declared.includes(k), `store manquant: ${k}`);
  const all = (dbRaw.match(/createObjectStore\('([a-zA-Z]+)'/g) || []).map((s) => s.match(/'([a-zA-Z]+)'/)![1]);
  const extra = all.filter((n) => !known.includes(n));
  assert.deepEqual(extra, []);
});
ok('aucune suppression/migration de données LOT I (seedOrSync inchangé)', () => {
  assert.ok(dbRaw.includes('seedOrSyncInitial'));
});

// ---- Animations-----------------------------------------------------------
const appRaw = read(path.join(SRC, 'App.tsx'));
const cssRaw = read(path.join(SRC, 'index.css'));
ok('App.tsx : pilote data-animations sur le document', () => {
  assert.match(appRaw, /data-animations/);
});
ok('App.tsx : lit animationsEnabled depuis les réglages', () => {
  assert.match(appRaw, /getWorkoutSettings/);
  assert.match(appRaw, /animationsEnabled/);
});
ok('index.css : [data-animations="off"] réduit les animations', () => {
  assert.match(cssRaw, /\[data-animations="off"\]/);
});
ok('index.css : respecte prefers-reduced-motion', () => {
  assert.match(cssRaw, /prefers-reduced-motion/);
});

// ---- Safe areas ----------------------------------------------------------
ok('safe-areas: header respecte safe-area-inset-top', () => {
  assert.match(cssRaw, /#main-header/);
  assert.match(cssRaw, /safe-area-inset-top/);
});
ok('safe-areas: mobile bottom nav respecte safe-area-inset-bottom', () => {
  assert.match(cssRaw, /#mobile-bottom-nav/);
  assert.match(cssRaw, /safe-area-inset-bottom/);
});

// ---- Touch targets (régression) ------------------------------------------
const wsp = read(path.join(SRC, 'pages', 'WorkoutSessionPage.tsx'));
ok('touch targets: steppers timer séance ≥ 36px (w-9)', () => {
  assert.ok(wsp.includes('w-9 h-9 rounded-lg'), 'stepper timer');
  assert.ok(!wsp.includes('"w-7 h-7'), 'plus aucun stepper 28px');
});

// ---- Non-régression : moteur guidé intact ---------------------------------
ok('moteur guidé : WorkoutGuidedSession.tsx présent', () => {
  assert.ok(fileExists(path.join(SRC, 'components', 'workout', 'WorkoutGuidedSession.tsx')));
});
ok('moteur guidé : fichiers audio/voix/vibration présents', () => {
  assert.ok(fileExists(path.join(SRC, 'components', 'workout', 'workoutAudio.ts')));
  assert.ok(fileExists(path.join(SRC, 'components', 'workout', 'workoutSpeech.ts')));
  assert.ok(fileExists(path.join(SRC, 'components', 'workout', 'workoutVibration.ts')));
});

// ---- Non testable sans navigateur -----------------------------------------
na('installabilité réelle (beforeinstallprompt)');
na('offline au rechargement réel');
na('rendu viewport 320-430px / overflow réel');
na('safe areas rendues à l\'écran');
na('navigation mobile interactive');

console.log(`\n===== RÉSUMÉ =====`);
console.log(`${passed}/${passed + failed} PASS`);
