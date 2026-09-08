// LOT S — Audit statique de sécurité (validate-security.js).
//
// Vérifie, à partir des FICHIERS RÉELS du projet, les protections de sécurité
// mises en place (sans navigateur) :
//   - CSP dans index.html + headers dans vite.config.ts
//   - fichers externes (pas de script inline bloquant)
//   - absence de patterns XSS / code injection dans src/
//   - aucun secret dans le bundle/config
//   - IndexedDB reste V8
//
// Exécutable via :  node validate-security.js
// Résultat : PASS (toutes les vérifications) ou FAIL.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

let passed = 0;
let failed = 0;

function ok(name) {
  passed++;
  console.log(`PASS  ${name}`);
}
function fail(name, detail) {
  failed++;
  console.error(`FAIL  ${name}${detail ? ' — ' + detail : ''}`);
}
function check(name, cond, detail) {
  if (cond) ok(name);
  else fail(name, detail);
}

function read(p) {
  return fs.readFileSync(p, 'utf8');
}
function exists(p) {
  return fs.existsSync(p);
}
function walk(dir, ext, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walk(fp, ext, out);
    else if (ext.some((x) => e.name.endsWith(x))) out.push(fp);
  }
  return out;
}

// ---- 1. CSP
const indexHtml = read(path.join(ROOT, 'index.html'));
check('CSP: meta content-security-policy présente', /http-equiv="Content-Security-Policy"/.test(indexHtml));
const cspMatch = indexHtml.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/);
check('CSP: contenu présent', !!cspMatch);
let csp = cspMatch ? cspMatch[1] : '';
check('CSP: script-src (pas unsafe-eval)', /script-src[^;]*'self'/.test(csp) && !/unsafe-eval/.test(csp));
check('CSP: pas de unsafe-inline script', !/script-src[^;]*'unsafe-inline'/.test(csp));
check('CSP: object-src none', /object-src 'none'/.test(csp));
check('CSP: base-uri self', /base-uri 'self'/.test(csp));
check('CSP: frame-ancestors none', /frame-ancestors 'none'/.test(csp));
check('CSP: form-action self', /form-action 'self'/.test(csp));
check('CSP: default-src self', /default-src 'self'/.test(csp));

// ---- 2. Pas de script inline bloquant (SW via fichier externe)
check('SW: pas de inline <script> dans index.html', !/<script>[\s\S]*?serviceWorker/.test(indexHtml) && !/<script>[\s\S]*navigator\.serviceWorker/.test(indexHtml));
check('SW: sw-register.js externe référencé', /sw-register\.js/.test(indexHtml));
check('SW: sw-register.js existe', exists(path.join(ROOT, 'public', 'sw-register.js')));
const swReg = read(path.join(ROOT, 'public', 'sw-register.js'));
check('SW: enregistre /sw.js', /register\(['"]\/sw\.js['"]\)/.test(swReg));

// ---- 3. Headers vite.config.ts
let viteConfig = read(path.join(ROOT, 'vite.config.ts'));
check('Headers: X-Content-Type-Options nosniff', /X-Content-Type-Options/.test(viteConfig) && /nosniff/.test(viteConfig));
check('Headers: X-Frame-Options DENY', /X-Frame-Options/.test(viteConfig) && /'DENY'/.test(viteConfig));
check('Headers: Referrer-Policy', /Referrer-Policy/.test(viteConfig));
check('Headers: Permissions-Policy', /Permissions-Policy/.test(viteConfig));
check('HSTS: uniquement en preview (pas en serveur local)', (() => {
  // HSTS ne doit PAS être dans server.headers (dev local HTTP), seulement preview.
  const serverBlock = viteConfig.slice(viteConfig.indexOf('server:'), viteConfig.indexOf('preview:'));
  return !/Strict-Transport-Security/.test(serverBlock);
})());

// ---- 4. Patterns dangereux dans src/
const srcFiles = walk(path.join(ROOT, 'src'), ['.ts', '.tsx']);
const srcContent = srcFiles.map((f) => read(f)).join('\n');
check('XSS: pas de dangerouslySetInnerHTML', !/dangerouslySetInnerHTML/.test(srcContent));
check('XSS: pas de innerHTML', !/\.innerHTML/.test(srcContent));
check('XSS: pas de insertAdjacentHTML', !/insertAdjacentHTML/.test(srcContent));
check('XSS: pas de eval(', !/eval\s*\(/.test(srcContent));
check('XSS: pas de new Function(', !/new\s+Function\s*\(/.test(srcContent));
check('XSS: pas de document.write(', !/document\.write\(/.test(srcContent));
check('XSS: pas de javascript:', !/javascript:/i.test(srcContent));
check('XSS: pas de console.log production', !/console\.log/.test(srcContent));

// ---- 5. Secrets dans src/ + public/
const pubFiles = walk(path.join(ROOT, 'public'), ['.js', '.json', '.html']);
const publicContent = pubFiles.map((f) => read(f)).join('\n');
check('Secrets: aucun pattern secret dans src/', !/(API_?KEY|PRIVATE_?KEY|ACCESS_?TOKEN|AUTH_?TOKEN|PASSWORD|SECRET)(?![A-Za-z])/.test(srcContent));
check('Secrets: aucun pattern secret dans public/', !/(API_?KEY|PRIVATE_?KEY|ACCESS_?TOKEN|AUTH_?TOKEN|PASSWORD|SECRET)(?![A-Za-z])/.test(publicContent));

// ---- 6. .gitignore couvre .env*
const gitignore = exists(path.join(ROOT, '.gitignore')) ? read(path.join(ROOT, '.gitignore')) : '';
check('.gitignore: couvre .env*', /\.env\*/.test(gitignore));

// ---- 7. IndexedDB reste V8
const idxdb = read(path.join(ROOT, 'src', 'db', 'indexedDb.ts'));
check('IndexedDB: DB_VERSION = 8', /const DB_VERSION = 8/.test(idxdb));
check('IndexedDB: pas de VERSION 9', !/(DB_)?VERSION\s*=\s*9/.test(idxdb));
check('IndexedDB: pas de version: 9', !/version:\s*9/.test(idxdb));

// ---- 8. Aucune donnée envoyée vers un serveur externe (pas de fetch/XMLHttpRequest en src/)
check('Réseau: pas de fetch() dans src/', !/fetch\s*\(/.test(srcContent));
check('Réseau: pas de XMLHttpRequest dans src/', !/XMLHttpRequest/.test(srcContent));
check('Réseau: pas de WebSocket dans src/', !/new\s+WebSocket/.test(srcContent));

console.log('');
console.log(`===== AUDIT SÉCURITÉ STATIQUE =====`);
console.log(`PASS ${passed}  FAIL ${failed}`);
if (failed > 0) {
  process.exitCode = 1;
}
console.log(failed > 0 ? 'RESULT: FAIL' : 'RESULT: PASS (validations statiques sécurité)');
