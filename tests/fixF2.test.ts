// F2 — Garde réentrante sur la finalisation de session (correction post-audit).
//
// Deux clics rapides sur "Terminer" (ou un double appel programmatique) ne
// produisent qu'UNE session : XP, records, performances, streak/totaux et
// suppression du draft sont appliqués une seule fois. Le test couvre la porte
// entièrement synchrone (tryAcquire avant le premier await ⇒ le 2ᵉ appel est
// ignoré même en rafale) et le câblage réel dans App.tsx.
//
// Exécutable via :  tsx tests/fixF2.test.ts

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReentrancyGate } from '../src/utilsGuard';

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

ok('F2 premier acquittement réussi', () => {
  const gate = createReentrancyGate();
  assert.equal(gate.tryAcquire(), true);
});

ok('F2 second appel simultané refusé', () => {
  const gate = createReentrancyGate();
  gate.tryAcquire();
  assert.equal(gate.tryAcquire(), false);
});

// La protection DOIT fonctionner même si deux événements arrivent très
// rapidement : tryAcquire est synchrone, donc une rafale de deux appels
// consécutifs ne laisse passer qu'une seule finalisation.
ok('F2 double-clic rapide → une seule finalisation', () => {
  const gate = createReentrancyGate();
  const first = gate.tryAcquire();
  const second = gate.tryAcquire(); // backing-to-back, même tick
  const third = gate.tryAcquire();
  assert.equal(first, true);
  assert.equal(second, false);
  assert.equal(third, false);
});

ok('F2 rebuild après completion → nouvelle finalisation permise', () => {
  const gate = createReentrancyGate();
  const start = () => {
    if (!gate.tryAcquire()) return 'ignored';
    return 'finalized';
  };
  const stop = () => gate.release();
  assert.equal(start(), 'finalized');
  assert.equal(start(), 'ignored'); // doublon pendant que la finalisation tourne
  stop(); // la finalisation se termine réellement
  assert.equal(start(), 'finalized'); // nouvelle séance possible
});

ok('F2 release sur erreur (finally) → porte débloquée', () => {
  const gate = createReentrancyGate();
  let threw = false;
  const finish = () => {
    if (!gate.tryAcquire()) return 'ignored';
    try {
      throw new Error('échec IDB simulé');
    } finally {
      gate.release();
    }
  };
  try {
    finish();
  } catch {
    threw = true;
  }
  assert.equal(threw, true);
  assert.equal(gate.tryAcquire(), true, 'la porte doit être débloquée après erreur');
});

ok('F2 plusieurs duplications dans le même tick → 1 seul lauréat', () => {
  const gate = createReentrancyGate();
  const calls = [gate.tryAcquire(), gate.tryAcquire(), gate.tryAcquire(), gate.tryAcquire()];
  assert.deepEqual(calls, [true, false, false, false]);
});

// Câblage réel : handleFinishSession (App.tsx) utilise bien la porte.
{
  const appRaw = fs.readFileSync(path.join(ROOT, 'src', 'App.tsx'), 'utf8');
  ok('F2 App.tsx utilise createReentrancyGate', () => {
    assert.ok(appRaw.includes("createReentrancyGate()"));
  });
  ok('F2 App.tsx: tryAcquire synchronisé en tête de handleFinishSession', () => {
    assert.ok(appRaw.includes('finishingSessionGateRef.current.tryAcquire()'));
  });
  ok('F2 App.tsx: release dans un finally', () => {
    assert.ok(appRaw.includes('finishingSessionGateRef.current.release()'));
    assert.ok(/finally \{[^}]*finishingSessionGateRef\.current\.release\(\)/.test(appRaw));
  });
}

console.log(`\n${passed} tests PASS, ${failed} FAIL`);
if (failed === 0) {
  console.log('ALL TESTS PASSED');
} else {
  console.log('SOME TESTS FAILED');
}