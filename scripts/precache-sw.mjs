// LOT 8 — S1 (performance / PWA offline safety) + LOT 10 (GitHub Pages sub-path).
//
// SportTrack lazy-loads its pages (React.lazy → separate hashed chunks).
// The service worker's precache list must therefore contain every hashed
// asset emitted by the build, otherwise a chunk not yet visited would be
// impossible to fetch offline. This script runs after `vite build`,
// rewrites the marker inside dist/sw.js (copied verbatim from public/sw.js)
// with the real list of built assets, keeping the sw template untouched.
//
// Public/sw.js stays the source of truth (the tokens the pwa tests inspect
// are preserved); dist/sw.js is the deployable service worker.
//
// LOT 10: the deploy target can be a GitHub Pages sub-path. Each emitted asset
// is injected as a path RELATIVE to the SW directory (no leading slash), so it
// resolves against the SW scope whether the app is at domain root or under
// /<repo>/. The manifest placeholder is substituted with the computed base.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const SW_SOURCE = path.join(ROOT, 'public', 'sw.js');
const SW_TARGET = path.join(DIST, 'sw.js');
const MANIFEST_TARGET = path.join(DIST, 'manifest.webmanifest');
const MARKER = '/*__PRECACHE_ASSETS__*/';
const BASE_MARKER = '__BASE_APP__';

// Same logic as vite.config.ts: derive the sub-path base from GITHUB_REPOSITORY
// if present (GitHub Actions), otherwise the app is at the domain root.
function computeBase() {
  const repo = process.env.GITHUB_REPOSITORY;
  if (repo && repo.includes('/')) {
    const slug = repo.split('/')[1];
    return `/${slug}`;
  }
  return '';
}

if (!fs.existsSync(SW_SOURCE)) {
  console.error('[precache-sw] public/sw.js introuvable');
  process.exit(1);
}
if (!fs.existsSync(DIST)) {
  console.error('[precache-sw] dist/ introuvable — lancer vite build d\'abord');
  process.exit(1);
}

// Every emitted asset that is self-hosted (js/css). Emitted RELATIVE to the SW
// directory (no leading slash) so it resolves under any base sub-path.
function collectAssets(dir) {
  const out = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|css)$/.test(entry.name)) {
        const rel = path.relative(DIST, full).split(path.sep).join('/');
        out.push(rel.replace(/^\/+/, ''));
      }
    }
  };
  walk(dir);
  return out.sort();
}

const assets = collectAssets(path.join(DIST, 'assets'));

const template = fs.readFileSync(SW_SOURCE, 'utf8');
if (!template.includes(MARKER)) {
  console.error(`[precache-sw] marqueur ${MARKER} absent de public/sw.js`);
  process.exit(1);
}

const injected = assets.map((a, i) => `  '${a}'${i < assets.length - 1 ? ',' : ''}`).join('\n');
const sw = template.replace(MARKER, `\n${injected}`);

fs.writeFileSync(SW_TARGET, sw, 'utf8');

// Substitute the manifest base marker (start_url, icons, shortcuts).
if (fs.existsSync(MANIFEST_TARGET)) {
  const manifest = fs.readFileSync(MANIFEST_TARGET, 'utf8').split(BASE_MARKER).join(computeBase());
  fs.writeFileSync(MANIFEST_TARGET, manifest, 'utf8');
}

console.log(`[precache-sw] ${assets.length} assets précachés dans dist/sw.js (base="${computeBase() || '/'}")`);