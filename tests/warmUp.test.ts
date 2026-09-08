import assert from 'node:assert/strict';
import {
  buildWarmUpSuggestion,
  warmUpTotalDuration,
  cooldownHint,
  WARM_UP_LABEL,
  COOL_DOWN_LABEL,
} from '../src/utilsWarmUp';

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

ok('generic suggestion: always a finite item list', () => {
  const s = buildWarmUpSuggestion([]);
  assert.ok(s.items.length > 0);
  assert.ok(s.items.every((i) => i.durationSec > 0 && i.title && i.id));
});

ok('specific muscles add focused items', () => {
  const s = buildWarmUpSuggestion(['Pectoraux']);
  assert.equal(s.items.some((i) => i.id === 'w-pec-stretch'), true);
  assert.equal(s.summary.includes('Pectoraux'), true);
});

ok('jambes synonyms are normalised', () => {
  const s = buildWarmUpSuggestion(['Quadriceps', 'Mollets']);
  assert.equal(s.items.some((i) => i.id === 'w-leg-swing'), true);
});

ok('no duplicates even with overlapping groups', () => {
  const s = buildWarmUpSuggestion(['Pectoraux', 'Épaules']); // Épaules -> Pectoraux
  const ids = s.items.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
});

ok('total duration is finite and positive', () => {
  const s = buildWarmUpSuggestion(['Jambes']);
  assert.ok(Number.isFinite(warmUpTotalDuration(s)));
  assert.ok(warmUpTotalDuration(s) > 0);
});

ok('labels pinned', () => {
  assert.equal(WARM_UP_LABEL, 'Échauffement');
  assert.equal(COOL_DOWN_LABEL, 'Retour au calme & étirements');
});

ok('cooldownHint: context-aware', () => {
  assert.equal(cooldownHint(true).length > 0, true);
  assert.equal(cooldownHint(false).length > 0, true);
});

console.log(`\n${passed} tests PASS, ${failed} FAIL`);
if (failed > 0) process.exitCode = 1;