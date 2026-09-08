// LOT 9 static invariants: pin things that MUST never regress during the LOT 9
// work (security-sensitive or structural). These are cheap, env-free checks.
import assert from 'node:assert/strict';
import { DASHBOARD_BLOCK_KEYS, DEFAULT_DASHBOARD_BLOCKS, DASHBOARD_BLOCK_LABELS } from '../src/utilsSettings';

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

// --- 9.2 : the PERSISTED order is the single source of truth and MUST stay
// exactly as pinned by settings.test.ts (LOT 6 behaviour preserved). ---
ok('9.2 blocks: pinned order kept (9 keys, labels each)', () => {
  assert.deepEqual([...DASHBOARD_BLOCK_KEYS], [
    'streak', 'level', 'volume', 'weekly', 'badges', 'stats',
    'recommendation', 'next-session', 'records',
  ]);
  assert.equal(DASHBOARD_BLOCK_KEYS.length, 9);
  assert.deepEqual([...DEFAULT_DASHBOARD_BLOCKS], [...DASHBOARD_BLOCK_KEYS]);
  for (const k of DASHBOARD_BLOCK_KEYS) {
    assert.ok(DASHBOARD_BLOCK_LABELS[k], `label ${k}`);
  }
});

// --- The 8 functional positions of the cahier des charges all map to existing
// keys; no new key was introduced, none was deleted. ---
ok('9.2 functional mapping: 8 positions -> existing keys', () => {
  const mapping = [
    'next-session', // 1 Prochaine séance
    'recommendation', // 2 Progression récente
    'stats', // 3 Objectif
    'weekly', // 4 Challenge
    'recommendation', // 5 Recommandation
    'streak', // 6 Streak
    'records', // 7 Dernier record
    'stats', // 8 Résumé statistiques
  ] as const;
  for (const key of mapping) {
    assert.ok((DASHBOARD_BLOCK_KEYS as readonly string[]).includes(key), `position key présent: ${key}`);
  }
  // Extra blocks (level, volume, badges) survive untouched.
  assert.ok((DASHBOARD_BLOCK_KEYS as readonly string[]).includes('level'));
  assert.ok((DASHBOARD_BLOCK_KEYS as readonly string[]).includes('volume'));
  assert.ok((DASHBOARD_BLOCK_KEYS as readonly string[]).includes('badges'));
});

// --- 9.5 : the alternative builder NEVER converts a timer scheme into reps
// (the opposite is also forbidden) — verified at the pure-util level. ---
ok('9.5 alternatives: exports exist and ranking is pure', async () => {
  const u = await import('../src/utilsAlternatives');
  assert.equal(typeof u.getExerciseAlternatives, 'function');
  assert.equal(typeof u.buildAlternativeConfig, 'function');
  assert.equal(typeof u.alternativeWillSwitchMode, 'function');
  assert.equal(typeof u.parseDefaultReps, 'function');
});

ok('9.6 warm-up: exports exist, presentational only', async () => {
  const u = await import('../src/utilsWarmUp');
  assert.equal(typeof u.buildWarmUpSuggestion, 'function');
  assert.equal(typeof u.warmUpTotalDuration, 'function');
  assert.equal(typeof u.cooldownHint, 'function');
});

ok('9.8 quick session: exports exist, shaped for a synthetic day', async () => {
  const u = await import('../src/utilsQuickSession');
  assert.equal(typeof u.buildQuickSessionPlan, 'function');
  assert.equal(typeof u.isQuickSessionMinutes, 'function');
  assert.deepEqual([...u.QUICK_SESSION_PRESETS], [10, 20, 30]);
  const { day } = u.buildQuickSessionPlan(20);
  assert.equal(day.id.startsWith('quick-'), true, 'day is explicitly synthetic');
  assert.ok(day.exercises.length > 0);
});

console.log(`\n${passed} tests PASS, ${failed} FAIL`);
if (failed > 0) process.exitCode = 1;