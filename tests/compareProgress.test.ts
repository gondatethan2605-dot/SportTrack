import assert from 'node:assert/strict';
import { ExercisePerformance } from '../src/types';
import { compareValues, comparePerformances, compareLatestPerformances } from '../src/utilsCompare';

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

function perf(id: string, exerciseId: string, date: string, mode: 'reps' | 'timer', totalReps: number, totalDurationSec = 0, weightUsedKg = 0): ExercisePerformance {
  return {
    id,
    exerciseId,
    exerciseName: 'Pompes',
    sessionId: 's' + id,
    sessionTitle: 'S' + id,
    date,
    mode,
    setsPlanned: 3,
    setsCompleted: 3,
    totalReps,
    totalDurationSec,
    totalVolumeKg: weightUsedKg * totalReps,
    weightUsedKg,
    sets: [],
    bestSet: null,
  };
}

// ------------------------- compareValues -------------------------

ok('compareValues: plain delta + percent', () => {
  const r = compareValues(110, 100);
  assert.ok(r);
  assert.equal(r.deltaAbs, 10);
  assert.equal(r.deltaPercent, 10);
});

ok('compareValues: percent uses absolute baseline (regression) ', () => {
  const r = compareValues(80, 100);
  assert.ok(r);
  assert.equal(r.deltaAbs, -20);
  assert.equal(r.deltaPercent, -20);
});

ok('compareValues: division by zero -> percent null, delta kept', () => {
  const r = compareValues(25, 0);
  assert.ok(r);
  assert.equal(r.deltaAbs, 25);
  assert.equal(r.deltaPercent, null);
});

ok('compareValues: zero current vs zero previous -> delta 0', () => {
  const r = compareValues(0, 0);
  assert.ok(r);
  assert.equal(r.deltaAbs, 0);
  assert.equal(r.deltaPercent, null);
});

ok('compareValues: NaN / Infinity -> null', () => {
  assert.equal(compareValues(NaN, 100), null);
  assert.equal(compareValues(100, Infinity), null);
  assert.equal(compareValues(-Infinity, 5), null);
});

// ------------------------- comparePerformances -------------------------

ok('compare: null single performance', () => {
  assert.equal(comparePerformances(undefined, undefined), null);
  assert.equal(comparePerformances(perf('a', 'e1', '2026-09-01', 'reps', 20), undefined), null);
  assert.equal(comparePerformances(undefined, perf('a', 'e1', '2026-09-01', 'reps', 20)), null);
});

ok('compare: different exercises -> null', () => {
  const a = perf('a', 'e1', '2026-09-01', 'reps', 20);
  const b = perf('b', 'e2', '2026-09-05', 'reps', 25);
  assert.equal(comparePerformances(a, b), null);
});

ok('compare: reps exercise compares reps (never duration)', () => {
  const prev = perf('a', 'e1', '2026-09-01', 'reps', 20);
  const cur = perf('b', 'e1', '2026-09-05', 'reps', 24);
  const r = comparePerformances(cur, prev);
  assert.ok(r);
  assert.equal(r.metric, 'reps');
  assert.equal(r.unit, 'rep');
  assert.equal(r.previousValue, 20);
  assert.equal(r.currentValue, 24);
  assert.equal(r.deltaAbs, 4);
  assert.equal(r.deltaPercent, 20);
  assert.equal(r.isNewBest, true);
});

ok('compare: timer exercise compares duration (never reps)', () => {
  const prev = perf('a', 'e1', '2026-09-01', 'timer', 0, 45);
  const cur = perf('b', 'e1', '2026-09-05', 'timer', 0, 55);
  const r = comparePerformances(cur, prev);
  assert.ok(r);
  assert.equal(r.metric, 'duration');
  assert.equal(r.unit, 'sec');
  assert.deepEqual([r.previousValue, r.currentValue, r.deltaAbs, r.deltaPercent], [45, 55, 10, 22.2]);
});

ok('compare: weighted exercise compares weight', () => {
  const prev = perf('a', 'e1', '2026-09-01', 'reps', 8, 0, 60);
  const cur = perf('b', 'e1', '2026-09-05', 'reps', 8, 0, 65);
  const r = comparePerformances(cur, prev);
  assert.ok(r);
  assert.equal(r.metric, 'weight');
  assert.equal(r.previousValue, 60);
  assert.equal(r.currentValue, 65);
  assert.equal(r.deltaAbs, 5);
});

ok('compare: mode switch between sessions -> nul (non comparable)', () => {
  // A timer session followed by a reps session must NOT be compared: the two
  // metrics are independent and no conversion may ever occur.
  const prev = perf('a', 'e1', '2026-09-01', 'timer', 0, 50);
  const cur = perf('b', 'e1', '2026-09-05', 'reps', 30);
  assert.equal(comparePerformances(cur, prev), null);
});

ok('compare: regression flagged (not a new best)', () => {
  const prev = perf('a', 'e1', '2026-09-01', 'reps', 30);
  const cur = perf('b', 'e1', '2026-09-05', 'reps', 25);
  const r = comparePerformances(cur, prev);
  assert.ok(r);
  assert.equal(r.deltaAbs, -5);
  assert.equal(r.isNewBest, false);
});

ok('compare: equal values -> zero delta, not a new best', () => {
  const prev = perf('a', 'e1', '2026-09-01', 'reps', 20);
  const cur = perf('b', 'e1', '2026-09-05', 'reps', 20);
  const r = comparePerformances(cur, prev);
  assert.ok(r);
  assert.equal(r.deltaAbs, 0);
  assert.equal(r.isNewBest, false);
});

// ------------------------- compareLatestPerformances -------------------------

ok('latestComparable: requires at least two entries', () => {
  assert.equal(compareLatestPerformances([], 'e1'), null);
  assert.equal(compareLatestPerformances([perf('a', 'e1', '2026-09-01', 'reps', 20)], 'e1'), null);
});

ok('latestComparable: uses the two most recent comparable entries', () => {
  const entries = [
    perf('a', 'e1', '2026-09-01', 'reps', 20),
    perf('b', 'e1', '2026-09-03', 'reps', 22),
    perf('c', 'e1', '2026-09-05', 'reps', 26),
  ];
  const r = compareLatestPerformances(entries, 'e1');
  assert.ok(r);
  assert.equal(r.previousValue, 22);
  assert.equal(r.currentValue, 26);
  assert.equal(r.deltaAbs, 4);
});

ok('latestComparable: skips a timer outlier without mixing metrics', () => {
  const entries = [
    perf('a', 'e1', '2026-09-01', 'reps', 20),
    perf('b', 'e1', '2026-09-03', 'timer', 0, 60),
    perf('c', 'e1', '2026-09-05', 'reps', 24),
  ];
  const r = compareLatestPerformances(entries, 'e1');
  assert.ok(r);
  assert.equal(r.previousValue, 20);
  assert.equal(r.currentValue, 24);
});

console.log(`\n${passed} tests PASS, ${failed} FAIL`);
if (failed > 0) process.exitCode = 1;