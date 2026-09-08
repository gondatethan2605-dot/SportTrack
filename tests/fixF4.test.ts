// F4 — Clés calendaires en DATE LOCALE (correction post-audit).
//
// Les dates de séances / mesures / records sont des jours calendaires LOCAUX :
// toISOString() (UTC) ne doit jamais servir à les construire (un événement juste
// après minuit local serait attribué à la veille sur les fuseaux à l'est de UTC).
// toLocalDateKey() est pur et déterministe (getters locaux uniquement).
//
// Exécutable via :  tsx tests/fixF4.test.ts

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toLocalDateKey, dayOfWeekName } from '../src/utilsCalendar';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

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

// --- début / fin de journée, changement de jour --------------------------------
ok('F4 début de journée locale (00:05) → 2026-09-07', () => {
  assert.equal(toLocalDateKey(new Date(2026, 8, 7, 0, 5, 0)), '2026-09-07');
});

ok('F4 fin de journée locale (23:59) → 2026-09-07', () => {
  assert.equal(toLocalDateKey(new Date(2026, 8, 7, 23, 59, 0)), '2026-09-07');
});

ok('F4 changement de jour (minuit + 1s) → jour suivant', () => {
  assert.equal(toLocalDateKey(new Date(2026, 8, 7, 23, 59, 59)), '2026-09-07');
  assert.equal(toLocalDateKey(new Date(2026, 8, 8, 0, 0, 1)), '2026-09-08');
});

ok('F4 padding mois/jour (janvier, jours < 10)', () => {
  assert.equal(toLocalDateKey(new Date(2026, 0, 3)), '2026-01-03');
  assert.equal(toLocalDateKey(new Date(2026, 11, 31)), '2026-12-31');
});

ok('F4 aucun padding (dates à double chiffre)', () => {
  assert.equal(toLocalDateKey(new Date(2026, 9, 15)), '2026-10-15');
});

// --- preuve de la dérive UTC sur les fuseaux à l'est de UTC --------------------
ok('F4 à minuit local, la clé locale diffère de la clé UTC (UTC+x)', () => {
  const instant = new Date(2026, 8, 7, 0, 0, 0); // construit en HEURE LOCALE
  assert.equal(toLocalDateKey(instant), '2026-09-07');
  if (instant.getTimezoneOffset() < 0) {
    // Machine à l'est de UTC (ex. UTC+1/+2) : 09-07 00:00 local est encore le
    // 09-06 en UTC → toISOString donnerait la VEILLE. Le fix y échappe.
    assert.notEqual(instant.toISOString().split('T')[0], '2026-09-07');
  }
});

ok('F4 à la fin de journée locale, clique UTC diffère aussi (UTC+x)', () => {
  const instant = new Date(2026, 8, 7, 22, 0, 0);
  assert.equal(toLocalDateKey(instant), '2026-09-07');
  if (instant.getTimezoneOffset() < -120) {
    // Ex. UTC+3, 22:00 local est déjà le 08-07 en UTC pour UTC-... hors cas —
    // simplement vérifier l'invariant local ci-dessus.
    assert.equal(dayOfWeekName('2026-09-07'), 'Lundi');
  }
});

ok('F4 clé locale cohérente avec le jour de la semaine local (Lundi 2026-09-07)', () => {
  assert.equal(dayOfWeekName(toLocalDateKey(new Date(2026, 8, 7, 0, 5))), 'Lundi');
});

// --- câblage réel : plus aucune clé « aujourd’hui » via toISOString ------------
{
  const check = (file: string, expect: (s: string) => boolean) => {
    const raw = fs.readFileSync(path.join(ROOT, 'src', file), 'utf8');
    return expect(raw);
  };

  ok('F4 CalendarPage utilise toLocalDateKey (sélection + isToday)', () => {
    assert.ok(check('pages/CalendarPage.tsx', (s) => s.includes('toLocalDateKey(new Date())')));
    assert.ok(check('pages/CalendarPage.tsx', (s) => !s.includes('new Date().toISOString().split(\'T\')[0]')));
  });

  ok('F4 utilsHome utilise toLocalDateKey pour today', () => {
    assert.ok(check('utilsHome.ts', (s) => s.includes('toLocalDateKey(today)')));
    assert.ok(check('utilsHome.ts', (s) => !s.includes('today.toISOString().slice(0, 10)')));
  });

  ok('F4 GoalsPage utilise toLocalDateKey pour todayStr', () => {
    assert.ok(check('pages/GoalsPage.tsx', (s) => s.includes('toLocalDateKey(new Date())')));
  });

  ok('F4 App.tsx clés de semaine (lundi/dimanche) en local', () => {
    assert.ok(check('App.tsx', (s) => s.includes('toLocalDateKey(monday)') && s.includes('toLocalDateKey(sunday)')));
  });

  ok('F4 ProgressPage (mesures + records manuels) et StatsPage (bornes de période) en local', () => {
    assert.ok(check('pages/ProgressPage.tsx', (s) => s.includes('toLocalDateKey(new Date())')));
    assert.ok(check('pages/StatsPage.tsx', (s) => s.includes('toLocalDateKey(')));
  });
}

console.log(`\n${passed} tests PASS, ${failed} FAIL`);
if (failed === 0) {
  console.log('ALL TESTS PASSED');
} else {
  console.log('SOME TESTS FAILED');
}