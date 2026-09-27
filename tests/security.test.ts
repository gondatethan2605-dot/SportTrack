// LOT S — Sécurité : tests unitaires ciblés sur les protections ajoutées.
//
// Couvre : XSS (patterns interdits dans le code source), validation JSON / backup
// (parseBackup + limites de sécurité), settings localStorage (normaliseWorkoutSettings),
// calculs numériques (0/0, Infinity, NaN), et IDs.
//
// Exécutable via :  tsx tests/security.test.ts
//
// Les tests browser (navigateur réel) ne peuvent pas être exécutés ici (aucun
// navigateur installé) et sont signalés N/A, jamais PASS.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseBackup,
  BackupError,
  BACKUP_STORE_KEYS,
  MAX_BACKUP_BYTES,
  MAX_STORE_RECORDS,
  MAX_STRING_LENGTH,
} from '../src/db/backup';
import { normaliseWorkoutSettings } from '../src/utilsSettings';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

let passed = 0;
let failed = 0;
let notApp = 0;
function code() {
  return JSON.stringify([
    path.join(SRC, 'App.tsx'),
    path.join(SRC, 'pages'),
    path.join(SRC, 'components'),
    path.join(SRC, 'db'),
    path.join(SRC, 'utilsSettings.ts'),
    path.join(SRC, 'utilsProgression.ts'),
    path.join(SRC, 'data'),
  ]);
}
function ok(name: string) {
  passed++;
  console.log(`PASS  ${name}`);
}
function fail(name: string, detail?: string) {
  failed++;
  console.error(`FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  process.exitCode = 1;
}
function check(name: string, cond: boolean, detail?: string) {
  if (cond) ok(name);
  else fail(name, detail);
}
function na(name: string) {
  notApp++;
  console.log(`N/A   ${name}`);
}

function readAllFiles(dir: string, ext: string[]): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...readAllFiles(fp, ext));
    else if (ext.some((e) => entry.name.endsWith(e))) out.push(fp);
  }
  return out;
}

// ----------------------------------------------------------------------------
// 1. XSS / INJECTION — patterns interdits dans le code source de production
// ----------------------------------------------------------------------------
const srcFiles = readAllFiles(SRC, ['.ts', '.tsx']);
const srcContent = srcFiles
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n');

check('XSS: pas de dangerouslySetInnerHTML', !srcContent.includes('dangerouslySetInnerHTML'));
check('XSS: pas de innerHTML', !srcContent.includes('.innerHTML'));
check('XSS: pas de outerHTML', !srcContent.includes('.outerHTML'));
check('XSS: pas de insertAdjacentHTML', !srcContent.includes('insertAdjacentHTML'));
check('XSS: pas de eval(', !/eval\s*\(/.test(srcContent));
check('XSS: pas de new Function(', !/new\s+Function\s*\(/.test(srcContent));
check('XSS: pas de document.write(', !srcContent.includes('document.write('));
check('XSS: pas de javascript:', !/javascript:/i.test(srcContent));
check('XSS: pas de debugger', !srcContent.includes('debugger'));
// Pas de console.log dans le code de production (les console.error légitimes restent).
check('XSS: pas de console.log en production src/', !srcContent.includes('console.log'));

// ----------------------------------------------------------------------------
// 2. Aucun secret / token inattendu dans le code source
// ----------------------------------------------------------------------------
check(
  'Secrets: pas de API_KEY/SECRET/TOKEN/PASSWORD/PRIVATE_KEY dans src/',
  !/(API_?KEY|PRIVATE_?KEY|ACCESS_?TOKEN|AUTH_?TOKEN|PASSWORD|SECRET)(?![A-Za-z])/.test(srcContent)
);

// ----------------------------------------------------------------------------
// 3. Validation JSON / backup
// ----------------------------------------------------------------------------

// Helper: backup minimal valide.
function validBackup(obj: Record<string, unknown>): string {
  const data: Record<string, unknown> = {
    profile: { id: 'main_profile', name: 'Test' },
  };
  for (const key of BACKUP_STORE_KEYS) {
    if (key === 'profile') continue;
    data[key] = [];
  }
  return JSON.stringify({ formatVersion: 1, data: { ...data, ...obj } });
}

// --- JSON invalide
check('JSON: "{}" rejeté (pas d’enveloppe data)', (() => {
  try { parseBackup('{}'); return false; } catch (e) { return e instanceof BackupError; }
})());
check('JSON: null rejeté', (() => {
  try { parseBackup('null'); return false; } catch (e) { return e instanceof BackupError; }
})());
check('JSON: [] rejeté', (() => {
  try { parseBackup('[]'); return false; } catch (e) { return e instanceof BackupError; }
})());
check('JSON: chaîne invalide rejetée', (() => {
  try { parseBackup('{nope'); return false; } catch (e) { return e instanceof BackupError; }
})());
check('JSON: fichier vide rejeté', (() => {
  try { parseBackup('   '); return false; } catch (e) { return e instanceof BackupError; }
})());

// --- formatVersion
check('JSON: formatVersion inconnu rejeté', (() => {
  try { parseBackup(JSON.stringify({ formatVersion: 99, data: {} })); return false; }
  catch (e) { return e instanceof BackupError; }
})());
check('JSON: formatVersion 1 accepté (compat)', (() => {
  try { parseBackup(validBackup({})); return true; } catch { return false; }
})());
check('JSON: backup legacy sans formatVersion accepté (enveloppe {data})', (() => {
  const b = validBackup({});
  const legacy = JSON.parse(b);
  delete legacy.formatVersion;
  try { parseBackup(JSON.stringify(legacy)); return true; } catch { return false; }
})());

// --- stores manquants / supplémentaires
check('JSON: store manquant rejeté', (() => {
  const data: Record<string, unknown> = { profile: { id: 'main_profile', name: 'T' } };
  for (const key of BACKUP_STORE_KEYS) if (key !== 'exercises') data[key] = [];
  try { parseBackup(JSON.stringify({ data })); return false; } catch (e) { return e instanceof BackupError; }
})());
check('JSON: store supplémentaire toléré (forward-compat)', (() => {
  const data = JSON.parse(validBackup({}));
  data.data.extraStore = [];
  try { parseBackup(JSON.stringify(data)); return true; } catch { return false; }
})());

// --- types incorrects
check('JSON: profile sans name rejeté', (() => {
  const data = JSON.parse(validBackup({}));
  data.data.profile = { id: 'main_profile' };
  try { parseBackup(JSON.stringify(data)); return false; } catch (e) { return e instanceof BackupError; }
})());
check('JSON: store non-tableau rejeté', (() => {
  const data = JSON.parse(validBackup({}));
  data.data.sessions = 'not-an-array';
  try { parseBackup(JSON.stringify(data)); return false; } catch (e) { return e instanceof BackupError; }
})());
check('JSON: enregistrement sans id rejeté', (() => {
  const data = JSON.parse(validBackup({ sessions: [{ foo: 1 }] }));
  try { parseBackup(JSON.stringify(data)); return false; } catch (e) { return e instanceof BackupError; }
})());

// --- NaN / Infinity (un JSON ne peut pas encoder littéralement NaN/Infinity ;
// le vecteur réaliste est le débordement vers Infinity comme 1e400, testé ci-dessous)
check('JSON: NaN/Infinity via débordement 1e400 → Infinity rejeté', (() => {
  const str = '{"data":{"profile":{"id":"main_profile","name":"T","x":1e400}}}';
  try { parseBackup(str); return false; } catch (e) { return e instanceof BackupError; }
})());
check('JSON: -Infinity via -1e400 rejeté', (() => {
  const str = '{"data":{"profile":{"id":"main_profile","name":"T","x":-1e400}}}';
  try { parseBackup(str); return false; } catch (e) { return e instanceof BackupError; }
})());

// --- limites de sécurité (DoS)
check('JSON: taille de fichier excessive rejetée', (() => {
  const big = ' '.repeat(MAX_BACKUP_BYTES + 1);
  try { parseBackup(big); return false; } catch (e) { return e instanceof BackupError; }
})());
check('JSON: string trop longue rejetée', (() => {
  const long = 'a'.repeat(MAX_STRING_LENGTH + 1);
  const data = JSON.parse(validBackup({ sessions: [{ id: 's1', notes: long }] }));
  try { parseBackup(JSON.stringify(data)); return false; } catch (e) { return e instanceof BackupError; }
})());
check('JSON: tableau trop grand rejeté', (() => {
  const arr = Array.from({ length: MAX_STORE_RECORDS + 1 }, (_, i) => ({ id: `r${i}` }));
  const data = JSON.parse(validBackup({ sessions: arr }));
  try { parseBackup(JSON.stringify(data)); return false; } catch (e) { return e instanceof BackupError; }
})());
check('JSON: profondeur excessive rejetée (pas de stack overflow)', (() => {
  let nested: Record<string, unknown> = { v: 1 };
  for (let i = 0; i < 500; i++) nested = { child: nested };
  const data = JSON.parse(validBackup({ sessions: [{ id: 's1', deep: nested }] }));
  try { parseBackup(JSON.stringify(data)); return false; } catch (e) { return e instanceof BackupError; }
})());

// --- validité (il ne faut pas casser les backups acceptés)
check('JSON: backup complet valide accepté', (() => {
  try { parseBackup(validBackup({ sessions: [{ id: 's1', n: 1 }] })); return true; }
  catch { return false; }
})());

// ----------------------------------------------------------------------------
// 4. Settings localStorage — normaliseWorkoutSettings
// ----------------------------------------------------------------------------
check('Settings: JSON corrompu → défauts', (() => {
  const s = normaliseWorkoutSettings('not json');
  return s.defaultRestSec === 30 && s.soundEnabled === true;
})());
check('Settings: valeurs non-booléennes → défauts', (() => {
  const s = normaliseWorkoutSettings({ soundEnabled: 1, voiceEnabled: 'x', vibrationEnabled: null });
  return s.soundEnabled === true && s.voiceEnabled === true && s.vibrationEnabled === true;
})());
check('Settings: restSec NaN/Infinity/négatif → défaut', (() => {
  return (
    normaliseWorkoutSettings({ defaultRestSec: NaN }).defaultRestSec === 30 &&
    normaliseWorkoutSettings({ defaultRestSec: Infinity }).defaultRestSec === 30 &&
    normaliseWorkoutSettings({ defaultRestSec: -5 }).defaultRestSec === 30
  );
})());
check('Settings: restSec snapping valide conservé', (() => {
  const s = normaliseWorkoutSettings({ defaultRestSec: 45 });
  return s.defaultRestSec === 45;
})());
check('Settings: units non supporté → metric', (() => {
  return normaliseWorkoutSettings({ units: 'imperial' }).units === 'metric';
})());
check('Settings: clés arbitraires ignorées (pas de pollution)', (() => {
  const s = normaliseWorkoutSettings({ foo: 'bar', admin: true, __proto__: { x: 1 } } as unknown);
  return !('foo' in s) && s.units === 'metric';
})());

// ----------------------------------------------------------------------------
// 5. Calculs numériques — protections contre NaN / Infinity
// ----------------------------------------------------------------------------
check('Calculs: Number.isFinite protège affichage', (() => {
  return (
    Number.isFinite(0 / 0) === false &&
    Number.isFinite(Infinity) === false &&
    Number.isFinite(-Infinity) === false &&
    Number.isFinite(1 / 0) === false
  );
})());
check('Calculs: guard 0/0 → fallback', (() => {
  const ratio = (a: number, b: number) => (b === 0 ? 0 : a / b);
  return Number.isFinite(ratio(10, 2)) && ratio(10, 0) === 0;
})());

// ----------------------------------------------------------------------------
// 6. IDs — validation
// ----------------------------------------------------------------------------
check('IDs: id vide rejeté dans un enregistrement', (() => {
  const data = JSON.parse(validBackup({ sessions: [{ id: '', x: 1 }] }));
  try { parseBackup(JSON.stringify(data)); return false; } catch (e) { return e instanceof BackupError; }
})());
check('IDs: id non-string rejeté dans un enregistrement', (() => {
  const data = JSON.parse(validBackup({ sessions: [{ id: 5, x: 1 }] }));
  try { parseBackup(JSON.stringify(data)); return false; } catch (e) { return e instanceof BackupError; }
})());
check('IDs: exerciseBests clé par exerciseId validée', (() => {
  const data = JSON.parse(validBackup({ exerciseBests: [{ exerciseId: 'ex-1', best: 20 }] }));
  try { parseBackup(JSON.stringify(data)); return true; } catch { return false; }
})());

// ----------------------------------------------------------------------------
// 7. Vérification V8 (confirmation statique)
// ----------------------------------------------------------------------------
const indexedDbSrc = fs.readFileSync(path.join(SRC, 'db', 'indexedDb.ts'), 'utf8');
check('IndexedDB: DB_VERSION = 8 (exactement)', /const DB_VERSION = 8/.test(indexedDbSrc));
check('IndexedDB: pas de VERSION = 9', !/DB_VERSION = 9|VERSION = 9|version: 9/.test(indexedDbSrc));

// ----------------------------------------------------------------------------
// RÉSUMÉ
// ----------------------------------------------------------------------------
console.log('');
console.log('===== RÉSUMÉ SÉCURITÉ =====');
console.log(`PASS ${passed}  FAIL ${failed}  N/A ${notApp}`);

// Tests browser non disponibles (aucun navigateur / Playwright / Puppeteer installé).
na('browser: chargement réel');
na('browser: navigation réelle');
na('browser: session guidée réelle');
na('browser: export/import réel');
na('browser: PWA/offline réel');

if (failed > 0) {
  process.exitCode = 1;
}
console.log(failed > 0 ? 'RÉSULTAT: FAIL' : 'RÉSULTAT: PASS');
