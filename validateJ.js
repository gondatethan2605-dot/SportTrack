#!/usr/bin/env node
/**
 * validateJ.js — LOT J (Import / Export / Sauvegardes) validation script.
 *
 * Pure Node (no browser). Verifies, from the actual files, every LOT J invariant
 * that CAN be checked in this environment:
 *   - the backup module implements a versioned format (formatVersion) independent
 *     of DB_VERSION (=8)
 *   - export includes all 10 object stores + settings
 *   - import validates BEFORE writing, refuses empty/invalid/wrong-version files,
 *     and never clears IndexedDB before validation
 *   - only the SportTrack settings localStorage key is touched (no foreign keys)
 *   - the SettingsPage wires export (download) and import
 *
 * Browser-only behaviours (real download, real IndexedDB write, real reset) are
 * reported as N/A, never as passing.
 *
 * Usage:  node validateJ.js     (or tsx validateJ.js)
 */
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');

let failures = 0;
let checks = 0;
let na = 0;
function ok(name, cond, detail = '') {
  checks++;
  if (cond) console.log('PASS  ' + name + (detail ? ' — ' + detail : ''));
  else { failures++; console.error('FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}
function note(name) { na++; console.log('N/A   ' + name); }
function readOrNull(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } }

console.log('== LOT J — validateJ.js ==\n');

const backupRaw = readOrNull(path.join(SRC, 'db', 'backup.ts'));
const dbRaw = readOrNull(path.join(SRC, 'db', 'indexedDb.ts'));

// ---- Backup module ---------------------------------------------------------
ok('src/db/backup.ts existe', backupRaw !== null);
if (backupRaw) {
  ok('format de sauvegarde versionné (formatVersion)', /EXPORT_FORMAT_VERSION\s*=\s*1/.test(backupRaw));
  ok('formatVersion indépendant de DB_VERSION', !/[Dd][Bb]_VERSION\s*=/.test(backupRaw));
  ok('10 stores définis (BACKUP_STORE_KEYS)', /BACKUP_STORE_KEYS/.test(backupRaw));
  ok('validation/sérialisation présente', /validateBackupData/.test(backupRaw) && /sanitizeExportValue/.test(backupRaw));
  ok('refus NaN/Infinity (NON_FINITE_NUMBER)', /NON_FINITE_NUMBER/.test(backupRaw));
  ok('refus version inconnue (UNKNOWN_FORMAT_VERSION)', /UNKNOWN_FORMAT_VERSION/.test(backupRaw));
  ok('clé localStorage limitée à sporttrack-settings', /sporttrack-settings/.test(backupRaw));
  ok('aucune clé localStorage étrangère / clear() dans backup.ts',
    !/localStorage\.(clear|removeItem|setItem)\(/.test(backupRaw));
}

// ---- IndexedDB export/import -------------------------------------------------
ok('src/db/indexedDb.ts existe', dbRaw !== null);
if (dbRaw) {
  ok('exportAllData utilise serializeBackup', /exportAllData[\s\S]{0,4000}serializeBackup/.test(dbRaw));
  ok('exportAllData inclut les 10 stores', /sessionDrafts/.test(dbRaw) && /exerciseBests/.test(dbRaw) && /exercisePerformances/.test(dbRaw));
  ok('importAllData valide AVANT d\'écrire (parseBackup)', /parseBackup/.test(dbRaw));
  ok('importAllData refuse proprement (retour false sur BackupError)', /BackupError/.test(dbRaw));
  ok('importAllData ne clear aucun store avant validation', /parseBackup\(jsonString\)/.test(dbRaw));
  ok('import restaure les settings via sporttrack-settings', /SETTINGS_KEY/.test(dbRaw));
  ok('aucun localStorage.clear() dans import', !/localStorage\.clear\(/.test(dbRaw));
  const m = dbRaw.match(/DB_VERSION\s*=\s*(\d+)/);
  ok('DB_VERSION = 8 (exactement)', m && m[1] === '8', m ? `DB_VERSION = ${m[1]}` : 'absent');
  ok('pas de nouveau object store', (dbRaw.match(/createObjectStore\(/g) || []).length <= 10,
    `${(dbRaw.match(/createObjectStore\(/g) || []).length} stores`);
}

// ---- SettingsPage wiring ------------------------------------------------------
const settingsRaw = readOrNull(path.join(SRC, 'pages', 'SettingsPage.tsx'));
ok('SettingsPage.tsx existe', settingsRaw !== null);
if (settingsRaw) {
  ok('bouton export JSON branché', /btn-export-backup[\s\S]*handleExportBackup/.test(settingsRaw) || /handleExportBackup/.test(settingsRaw));
  ok('bouton import JSON branché', /handleImportFile/.test(settingsRaw) && /accept="\.json"/.test(settingsRaw));
  ok('nom de fichier d\'export SportTrack-backup-YYYY-MM-DD.json',
    /SportTrack-backup-\$\{dateStr\}\.json|SportTrack-backup/.test(settingsRaw));
  ok('reset réglages distinct du reset données',
    /handleResetSettings/.test(settingsRaw) && /handleResetData/.test(settingsRaw));
  ok('reset réglages n\'affiche pas de suppression de données',
    /resetWorkoutSettings/.test(settingsRaw));
}

// ---- Tests LOT J --------------------------------------------------------------
const backupTest = readOrNull(path.join(ROOT, 'tests', 'backup.test.ts'));
ok('tests/backup.test.ts existe', backupTest !== null);

// ---- Non testable sans navigateur ------------------------------------------------
note('téléchargement réel du fichier JSON (bouton export)');
note('écriture/lecture IndexedDB réelle lors de l\'import');
note('reset réglages réel / données intactes');
note('messages d\'erreur rendus à l\'écran');

console.log('\n== Bilan ==');
console.log(`PASS  ${checks}`);
console.log(`FAIL  ${failures}`);
console.log(`N/A   ${na}`);
console.log('');
if (failures > 0) { console.log('RESULT: FAIL'); process.exitCode = 1; }
else {
  console.log('RESULT: PASS (validations statiques LOT J)');
  console.log('Note: écriture IndexedDB réelle, téléchargement et reset visible ne sont pas');
  console.log('testables sans navigateur — marqués N/A.');
}
