import assert from 'node:assert/strict';
import { PersonalRecord, ExerciseBest } from '../src/types';
import { buildNewRecordItems } from '../src/utilsRecords';

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

// ---------------------------------------------------------------- fixtures -----

function weightRecord(exerciseId: string, weightKg: number, opts?: { previous?: number; reps?: number }): PersonalRecord {
  return {
    id: `rec-${exerciseId}-${weightKg}`,
    exerciseId,
    exerciseName: `Exo ${exerciseId}`,
    weightKg,
    reps: opts?.reps ?? 8,
    date: '2026-09-06',
    previousWeightKg: opts?.previous,
  };
}

function best(exerciseId: string, opts?: {
  bestRepsValue?: number;
  bestRepsWeight?: number;
  bestDurationSecValue?: number;
}): ExerciseBest {
  return {
    exerciseId,
    exerciseName: `Exo ${exerciseId}`,
    bestWeightKg: null,
    bestReps: opts?.bestRepsValue != null ? { value: opts.bestRepsValue, weightKg: opts.bestRepsWeight ?? 0, date: '2026-09-06' } : null,
    bestVolumeKg: null,
    bestDurationSec: opts?.bestDurationSecValue != null ? { value: opts.bestDurationSecValue, weightKg: 0, date: '2026-09-06' } : null,
    lastPerformedDate: '2026-09-06',
    timesPerformed: 2,
    updatedAt: '2026-09-06T00:00:00',
  };
}

// ---------------------------------------------------------------- TESTS -----

ok('weight PR with previous weight', () => {
  const items = buildNewRecordItems([weightRecord('e1', 80, { previous: 75 })], [], [best('e1')]);
  assert.equal(items.length, 1);
  assert.equal(items[0].mode, 'poids');
  assert.equal(items[0].newValue, 80);
  assert.equal(items[0].previousValue, 75);
  assert.equal(items[0].unit, 'kg');
});

ok('weight PR without previous (first record)', () => {
  const items = buildNewRecordItems([weightRecord('e1', 60)], [], [best('e1')]);
  assert.equal(items[0].mode, 'poids');
  assert.equal(items[0].previousValue, null);
});

ok('reps improved -> new record', () => {
  const items = buildNewRecordItems([], [best('e1', { bestRepsValue: 10 })], [best('e1', { bestRepsValue: 12 })]);
  assert.equal(items.length, 1);
  assert.equal(items[0].mode, 'reps');
  assert.equal(items[0].newValue, 12);
  assert.equal(items[0].previousValue, 10);
  assert.equal(items[0].unit, 'rep');
});

ok('reps first performance -> previous null', () => {
  const items = buildNewRecordItems([], [], [best('e1', { bestRepsValue: 15 })]);
  assert.equal(items.length, 1);
  assert.equal(items[0].mode, 'reps');
  assert.equal(items[0].previousValue, null);
});

ok('reps EQUAL -> no repeated notification', () => {
  const items = buildNewRecordItems([], [best('e1', { bestRepsValue: 12 })], [best('e1', { bestRepsValue: 12 })]);
  assert.equal(items.length, 0);
});

ok('reps regression -> no record', () => {
  const items = buildNewRecordItems([], [best('e1', { bestRepsValue: 12 })], [best('e1', { bestRepsValue: 10 })]);
  assert.equal(items.length, 0);
});

ok('duration improved -> new record (timer mode)', () => {
  const items = buildNewRecordItems([], [best('t1', { bestDurationSecValue: 45 })], [best('t1', { bestDurationSecValue: 60 })]);
  assert.equal(items.length, 1);
  assert.equal(items[0].mode, 'duree');
  assert.equal(items[0].newValue, 60);
  assert.equal(items[0].previousValue, 45);
  assert.equal(items[0].unit, 'sec');
});

ok('duration EQUAL -> no repeated notification', () => {
  const items = buildNewRecordItems([], [best('t1', { bestDurationSecValue: 60 })], [best('t1', { bestDurationSecValue: 60 })]);
  assert.equal(items.length, 0);
});

ok('duration never produces a reps record (metrics not mixed)', () => {
  const items = buildNewRecordItems([], [], [best('t1', { bestDurationSecValue: 60 })]);
  assert.equal(items.length, 1);
  assert.equal(items[0].mode, 'duree');
  assert.ok(!items.some((i) => i.mode === 'reps'));
});

ok('reps never produces a duration record', () => {
  const items = buildNewRecordItems([], [], [best('e1', { bestRepsValue: 15 })]);
  assert.ok(!items.some((i) => i.mode === 'duree'));
});

ok('empty inputs -> empty items', () => {
  assert.deepEqual(buildNewRecordItems([], [], []), []);
});

ok('combination: weight + reps + duration on the same exercise', () => {
  const items = buildNewRecordItems(
    [weightRecord('e1', 90, { previous: 85 })],
    [best('e1', { bestRepsValue: 10, bestDurationSecValue: 30 })],
    [best('e1', { bestRepsValue: 12, bestDurationSecValue: 45 })]
  );
  assert.equal(items.length, 3);
  const modes = items.map((i) => i.mode).sort();
  assert.deepEqual(modes, ['duree', 'poids', 'reps']);
});

ok('deterministic ordering by exercise name then mode', () => {
  const items = buildNewRecordItems(
    [weightRecord('zeta', 80), weightRecord('alpha', 70)],
    [],
    [best('zeta', { bestRepsValue: 12 }), best('alpha', { bestDurationSecValue: 40 })]
  );
  // alpha first, then zeta; within each exercise: poids (0) < reps (1) < durée (2)
  assert.equal(items[0].exerciseName, 'Exo alpha');
  assert.equal(items[0].mode, 'poids');
  assert.equal(items[1].exerciseName, 'Exo alpha');
  assert.equal(items[1].mode, 'duree');
  assert.equal(items[2].exerciseName, 'Exo zeta');
  assert.equal(items[2].mode, 'poids');
  assert.equal(items[3].exerciseName, 'Exo zeta');
  assert.equal(items[3].mode, 'reps');
});

ok('no NaN values ever produced', () => {
  const items = buildNewRecordItems([weightRecord('e1', 100)], [best('e1', { bestRepsValue: 10 })], [best('e1', { bestRepsValue: 11 })]);
  for (const item of items) {
    assert.ok(Number.isFinite(item.newValue), 'newValue must be finite');
    if (item.previousValue != null) assert.ok(Number.isFinite(item.previousValue), 'previousValue must be finite');
  }
});

// ---------------------------------------------------------------- report -----
console.log(`\n${passed} tests PASS, ${failed} FAIL`);
if (failed === 0) {
  console.log('ALL TESTS PASSED');
} else {
  console.log('SOME TESTS FAILED');
}