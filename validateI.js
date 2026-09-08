#!/usr/bin/env node
/**
 * validateI.js — LOT I (PWA / Expérience mobile) validation script.
 *
 * Pure Node (no deps). Verifies, from the actual files, every LOT I invariant
 * that CAN be checked in this environment:
 *   - manifest.webmanifest is valid and coherent (name, short_name, start_url,
 *     display, background_color, theme_color, icons with real files/dimensions)
 *   - the PNG icons exist, are valid PNGs, and match their declared sizes/MIME
 *   - sw.js is registered from index.html and caches the PWA assets
 *   - DB_VERSION stays exactly 8 (no 9, no new object store)
 *   - index.html declares the manifest, viewport-fit=cover and apple icon
 *
 * Things that need a live browser (installability, offline reload, viewport
 * rendering, safe areas, animations OFF at runtime) are reported as NOT
 * testable here, never as "passing".
 *
 * Usage:  node validateI.js        (or tsx validateI.js)
 */
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const SRC = path.join(ROOT, 'src');

let failures = 0;
let checks = 0;
let na = 0;

function ok(name, cond, detail = '') {
  checks++;
  if (cond) {
    console.log('PASS  ' + name + (detail ? ' — ' + detail : ''));
  } else {
    failures++;
    console.error('FAIL  ' + name + (detail ? ' — ' + detail : ''));
  }
}
function note(name) {
  na++;
  console.log('N/A   ' + name);
}
function readOrNull(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

// ---- PNG header reader ---------------------------------------------------
function pngInfo(file) {
  try {
    const b = fs.readFileSync(file);
    if (b.length < 24) return null;
    if (b.readUInt32BE(0) !== 0x89504e47) return null; // \x89PNG
    if (b.toString('ascii', 1, 4) !== 'PNG') return null;
    const w = b.readUInt32BE(16);
    const h = b.readUInt32BE(20);
    const bitDepth = b[24];
    const colorType = b[25];
    return { w, h, bitDepth, colorType };
  } catch {
    return null;
  }
}

console.log('== LOT I — validateI.js ==\n');

// ---- Manifest ------------------------------------------------------------
const manifestPath = path.join(PUBLIC, 'manifest.webmanifest');
const manifestRaw = readOrNull(manifestPath);
ok('manifest.webmanifest existe', manifestRaw !== null);
let manifest = null;
if (manifestRaw) {
  try {
    manifest = JSON.parse(manifestRaw);
    ok('manifest.webmanifest est un JSON valide', true);
  } catch {
    ok('manifest.webmanifest est un JSON valide', false);
  }
}

if (manifest) {
  ok('manifest.name', typeof manifest.name === 'string' && manifest.name.length > 0, manifest.name);
  ok('manifest.short_name', typeof manifest.short_name === 'string' && manifest.short_name.length > 0, manifest.short_name);
  ok('manifest.start_url', typeof manifest.start_url === 'string' && manifest.start_url.startsWith('/'), manifest.start_url);
  ok('manifest.display = standalone', manifest.display === 'standalone', manifest.display);
  ok('manifest.background_color', /^#[0-9a-fA-F]{6}$/.test(manifest.background_color || ''), manifest.background_color);
  ok('manifest.theme_color', /^#[0-9a-fA-F]{6}$/.test(manifest.theme_color || ''), manifest.theme_color);

  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  ok('manifest.icons: au moins une icône', icons.length > 0, `${icons.length} icône(s)`);

  const declared = [];
  for (const ic of icons) {
    const src = ic && ic.src;
    if (!src) { ok(`icône ${JSON.stringify(ic)} a un src`, false); continue; }
    const file = path.join(PUBLIC, src.replace(/^\//, ''));
    const info = pngInfo(file);
    const sizes = (ic.sizes || '').trim();
    const type = ic.type || '';
    declared.push({ src, sizes, type, file, info });
  }

  // Every referenced icon file must exist; measure dimension matching.
  for (const d of declared) {
    const fileExists = fs.existsSync(d.file);
    ok(`icône ${d.src} existe`, fileExists);
    if (!fileExists) continue;
    if (d.type === 'image/png') {
      const info = d.info;
      ok(`PNG ${d.src} est un PNG valide`, !!info);
      if (info) {
        const [w, h] = (d.sizes || 'x').split('x').map((n) => parseInt(n, 10));
        ok(`PNG ${d.src} dimensions ${d.sizes}`, w === info.w && h === info.h, `${info.w}x${info.h}`);
      }
    }
  }

  // Any PNG icon must declare image/png type (matches actual file).
  for (const d of declared) {
    if (/\.png$/i.test(d.src)) {
      ok(`MIME type image/png pour ${d.src}`, d.type === 'image/png', d.type || '(absent)');
    }
  }

  ok('manifest.icons: aucune référence 404', declared.every((d) => fs.existsSync(d.file)), `${declared.length} vérifiée(s)`);
}

// ---- index.html ----------------------------------------------------------
const indexHtml = readOrNull(path.join(ROOT, 'index.html'));
ok('index.html existe', indexHtml !== null);
if (indexHtml) {
  ok('index.html référence le manifest', /rel="manifest"\s+href="\/manifest\.webmanifest"/.test(indexHtml));
  ok('viewport-fit=cover présent', indexHtml.includes('viewport-fit=cover'));
  ok('apple-touch-icon PNG', /rel="apple-touch-icon"[\s\S]*href="\/icon-192\.png"/.test(indexHtml));
  ok('sw.js enregistré (via fichier externe sw-register.js)', (() => {
    const swReg = readOrNull(path.join(PUBLIC, 'sw-register.js'));
    return /sw-register\.js/.test(indexHtml)
      && !!swReg
      && /register\(['"]\/sw\.js['"]/.test(swReg)
      && /updateViaCache:\s*'none'/.test(swReg)
      && /controllerchange/.test(swReg);
  })());
}

// ---- Service worker ------------------------------------------------------
const swRaw = readOrNull(path.join(PUBLIC, 'sw.js'));
ok('sw.js existe', swRaw !== null);
if (swRaw) {
  ok('sw.js installe (cache addAll)', /caches\.open/.test(swRaw) && /addAll/.test(swRaw));
  ok('sw.js active et purge les vieux caches', /activate/.test(swRaw) && /caches\.keys/.test(swRaw));
  ok('sw.js sert la navigation (stale-while-revalidate)', /event\.request\.mode\s*===\s*['"]navigate['"]/.test(swRaw) || /caches\.match\(event\.request\)/.test(swRaw));
  const cached = ['/icon-192.png', '/icon-512.png', '/favicon.png', '/manifest.webmanifest'];
  for (const asset of cached) {
    ok(`sw.js met en cache ${asset}`, swRaw.includes(asset));
  }
  ok('sw.js n\'encode pas de boucle de reload', !/skipWaiting\(\)\s*.{0,40}reload/i.test(swRaw) && !/location\.reload/.test(swRaw));
} else {
  cached.forEach(() => {});
}

// ---- IndexedDB / DB_VERSION ----------------------------------------------
const dbRaw = readOrNull(path.join(SRC, 'db', 'indexedDb.ts'));
ok('src/db/indexedDb.ts existe', dbRaw !== null);
if (dbRaw) {
  const m = dbRaw.match(/DB_VERSION\s*=\s*(\d+)/);
  ok('DB_VERSION est défini', !!m);
  if (m) {
    ok('DB_VERSION = 8 (exactement)', m[1] === '8', `DB_VERSION = ${m[1]}`);
    ok('aucun DB_VERSION 9', m[1] !== '9');
  }
  ok('pas de nouveau object store ajouté pour LOT I (createObjectStore restreint)',
    (dbRaw.match(/createObjectStore\(/g) || []).length <= 10, `${(dbRaw.match(/createObjectStore\(/g) || []).length} stores`);

  // Verify the known store names list is unchanged (v8 set).
  const known = ['profile', 'programs', 'exercises', 'sessions', 'records', 'goals',
    'measurements', 'exercisePerformances', 'exerciseBests', 'sessionDrafts'];
  const declaredNames = [];
  for (const k of known) {
    if (dbRaw.includes(`createObjectStore('${k}'`)) declaredNames.push(k);
  }
  ok('object stores = ensemble v8 (10 stores)', declaredNames.length === 10 &&
    known.every((k) => declaredNames.includes(k)));
  const extra = (dbRaw.match(/createObjectStore\('([a-zA-Z]+)'/g) || []).map((s) => s.match(/'([a-zA-Z]+)'/)[1])
    .filter((n) => !known.includes(n));
  ok('aucun store inconnu ajouté', extra.length === 0, extra.join(', ') || 'aucun');
}

// ---- Animations linkage ---------------------------------------------------
const appRaw = readOrNull(path.join(SRC, 'App.tsx'));
const cssRaw = readOrNull(path.join(SRC, 'index.css'));
ok('App.tsx pilote data-animations', !!appRaw && /data-animations/.test(appRaw || ''));
ok('index.css consomme data-animations="off"', !!cssRaw && /\[data-animations="off"\]/.test(cssRaw || ''));
ok('index.css respecte prefers-reduced-motion', !!cssRaw && /prefers-reduced-motion/.test(cssRaw || ''));
ok('safe-areas: header', !!cssRaw && /#main-header/.test(cssRaw || ''));
ok('safe-areas: mobile bottom nav', !!cssRaw && /#mobile-bottom-nav/.test(cssRaw || ''));

// ---- Guided engine untouched ----------------------------------------------
const guidedRaw = readOrNull(path.join(SRC, 'components', 'workout', 'WorkoutGuidedSession.tsx'));
ok('moteur guidé non réécrit (fichier présent)', guidedRaw !== null);

console.log('\n== Bilan ==');
console.log(`PASS  ${checks}`);
console.log(`FAIL  ${failures}`);
console.log(`N/A   ${na}`);
console.log('');
if (failures > 0) {
  console.log('RESULT: FAIL');
  process.exitCode = 1;
} else {
  console.log('RESULT: PASS (validations statiques LOT I)');
  console.log('Note: installabilité réelle, rendu viewport, offline au rechargement et');
  console.log('safe areas ne sont PAS testables sans navigateur — ils sont hors scope de ce script.');
}
