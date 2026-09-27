// LOT D - build-time service worker precache step.
//
// `public/sw.js` is the SOURCE template: it only precaches the static shell so
// it can never drift from the real hashed build output. This script runs AFTER
// `vite build` and injects the real built assets (hashed JS/CSS + shell files)
// into `dist/sw.js`, stamping the cache name so a new build invalidates the
// previous cache exactly once.
//
// Usage:  node scripts/precache-sw.mjs
// It is deliberately idempotent (re-running on the same build is a no-op) and
// never touches public/sw.js, so the static PWA invariants stay valid.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function fail(message) {
  console.error(`[precache-sw] ERREUR: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(DIST)) {
  fail('dossier dist/ introuvable - lancez `npm run build` avant ce script.');
}

const swPath = path.join(DIST, 'sw.js');
if (!fs.existsSync(swPath)) {
  fail("dist/sw.js introuvable - le build n'a pas copie public/sw.js.");
}

// --- Collect the real built files ------------------------------------------
const ASSET_EXT = new Set(['.js', '.css', '.woff', '.woff2', '.svg', '.png', '.webp', '.ico']);
const SHELL_FILES = ['/', '/index.html', '/manifest.webmanifest', '/favicon.png', '/icon-192.png', '/icon-512.png'];

function listFiles(dir, base = '') {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      found.push(...listFiles(path.join(dir, entry.name), rel));
    } else if (ASSET_EXT.has(path.extname(entry.name).toLowerCase())) {
      found.push(rel);
    }
  }
  return found;
}

const assetsDir = path.join(DIST, 'assets');
const builtAssets = fs.existsSync(assetsDir)
  ? listFiles(assetsDir)
      .map((rel) => `/${rel}`)
      // sw.js itself is never precached (it would fight with skipWaiting).
      .filter((url) => url !== '/sw.js')
      .sort()
  : [];

const presentShell = SHELL_FILES.filter((url) => {
  if (url === '/' || url === '/index.html') return fs.existsSync(path.join(DIST, 'index.html'));
  return fs.existsSync(path.join(DIST, url.replace(/^\//, '')));
});

const precacheList = [...new Set([...presentShell, ...builtAssets])];

// --- Inject into dist/sw.js -------------------------------------------------
let sw = fs.readFileSync(swPath, 'utf8');
const stamp = createHash('sha256').update(precacheList.join('|')).digest('hex').slice(0, 8);
const cacheName = `sporttrack-cache-build-${stamp}`;

// Plain array literal, same shape as the public/sw.js template. Two traps are
// avoided on purpose:
//  1. String#replace expands `$` patterns in its replacement, so a raw `$` in
//     an asset URL would corrupt the file (and the function form is used).
//  2. the list must stay a plain array: a multi-line `join(',\n')` separator
//     would emit a real newline INSIDE a single-quoted JS string and break the
//     whole service worker.
if (precacheList.some((url) => url.includes('$'))) {
  fail('un asset to precache contains a raw $ (incompatible with String#replace).');
}
const listLiteral = `[\n${precacheList.map((url) => `  '${url}'`).join(',\n')}\n]`;

const nextSw = sw
  .replace(/const CACHE_NAME = '[^']*';/, () => `const CACHE_NAME = '${cacheName}';`)
  .replace(/const ASSETS_TO_CACHE = \[[\s\S]*?\];/, () => `const ASSETS_TO_CACHE = ${listLiteral};`);

if (nextSw === sw && !sw.includes(cacheName)) {
  fail('impossible de localiser CACHE_NAME / ASSETS_TO_CACHE dans dist/sw.js.');
}

// Self-check: the generated service worker MUST stay syntactically valid and
// MUST contain every entry, so a broken offline shell can never ship silently.
try {
  new Function(nextSw);
} catch (e) {
  fail(`generated service worker is invalid: ${e.message}`);
}
const missing = precacheList.filter((url) => !nextSw.includes(`'${url}'`));
if (missing.length > 0) {
  fail(`entrees absentes du service worker genere : ${missing.join(', ')}`);
}
if (precacheList.length === 0) {
  fail('aucun fichier a precacher (build incomplet ?).');
}

fs.writeFileSync(swPath, nextSw, 'utf8');

console.log('[precache-sw] dist/sw.js mis a jour (syntaxe validee)');
console.log(`[precache-sw] cache: ${cacheName}`);
console.log(`[precache-sw] ${precacheList.length} entrees precachees (${builtAssets.length} assets build)`);
for (const url of precacheList) console.log(`[precache-sw]   + ${url}`);
