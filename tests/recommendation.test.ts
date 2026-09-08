import assert from 'node:assert/strict';
import {
  ExercisePerformance,
  ExercisePerformanceSet,
} from '../src/types';
import {
  analyzeProgression,
  suggestNextTarget,
} from '../src/utilsProgression';

// ---------------------------------------------------------------- fixtures ---
function perf(
  exerciseId: string,
  exerciseName: string,
  date: string,
  mode: 'reps' | 'timer',
  totalReps: number,
  totalDurationSec: number = 0,
  weightUsedKg: number = 0
): ExercisePerformance {
  const set: ExercisePerformanceSet = {
    setNumber: 1,
    weightKg: weightUsedKg,
    reps: mode === 'reps' ? Math.max(totalReps, 1) : 0,
    mode,
    durationSec: mode === 'timer' ? Math.max(totalDurationSec, 1) : 0,
    completed: true,
  };
  return {
    id: `${date}-${exerciseId}-${Math.random()}`,
    exerciseId,
    exerciseName,
    sessionId: `s-${date}`,
    sessionTitle: `Séance ${date}`,
    date,
    mode,
    setsPlanned: 1,
    setsCompleted: 1,
    totalReps,
    totalDurationSec,
    totalVolumeKg: weightUsedKg * totalReps,
    weightUsedKg,
    sets: [set],
    bestSet: {
      setNumber: 1,
      weightKg: weightUsedKg,
      reps: set.reps,
      durationSec: mode === 'timer' ? set.durationSec : undefined,
    },
  };
}

let passed = 0;
function ok(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (e) {
    console.error(`FAIL  ${name}`);
    console.error('      ', (e as Error).message);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------- TESTS -----
ok('historique vide -> insuffisant, aucune recommandation', () => {
  const a = analyzeProgression([], 'P1');
  assert.equal(a.trend, 'insufficient');
  assert.equal(suggestNextTarget([], 'P1'), null);
});

ok('une seule performance -> historique insuffisant', () => {
  const entries = [perf('P1', 'Pompes', '2026-01-01', 'reps', 12)];
  const a = analyzeProgression(entries, 'P1');
  assert.equal(a.trend, 'insufficient');
  const rec = suggestNextTarget(entries, 'P1');
  assert.ok(rec);
  assert.equal(rec.target, 12); // no aggressive recommendation
  assert.match(rec.reason, /Historique trop court/);
});

ok('progression (reps) -> +step, tendance progression', () => {
  const entries = [
    perf('P1', 'Pompes', '2026-01-01', 'reps', 10),
    perf('P1', 'Pompes', '2026-01-08', 'reps', 12),
  ];
  const a = analyzeProgression(entries, 'P1');
  assert.equal(a.trend, 'progressing');
  assert.equal(a.current, 12);
  assert.equal(a.previous, 10);
  assert.equal(a.best, 12);
  const rec = suggestNextTarget(entries, 'P1');
  assert.ok(rec);
  assert.equal(rec.trend, 'progressing');
  assert.equal(rec.unit, 'rep');
  assert.equal(rec.target, 14); // 12 + 2 reps
  assert.equal(rec.last, 12);
  assert.equal(rec.best, 12);
});

ok('stagnation (reps) -> petite augmentation, tendance stagnation', () => {
  const entries = [
    perf('P1', 'Pompes', '2026-01-01', 'reps', 12),
    perf('P1', 'Pompes', '2026-01-08', 'reps', 12),
  ];
  const a = analyzeProgression(entries, 'P1');
  assert.equal(a.trend, 'stagnating');
  const rec = suggestNextTarget(entries, 'P1');
  assert.ok(rec);
  assert.equal(rec.trend, 'stagnating');
  // stagnation -> still a small +2 step
  assert.equal(rec.target, 14);
});

ok('régression (reps) -> on conserve l objectif, tendance régression', () => {
  const entries = [
    perf('P1', 'Pompes', '2026-01-01', 'reps', 14),
    perf('P1', 'Pompes', '2026-01-08', 'reps', 12),
  ];
  const a = analyzeProgression(entries, 'P1');
  assert.equal(a.trend, 'regressing');
  const rec = suggestNextTarget(entries, 'P1');
  assert.ok(rec);
  assert.equal(rec.trend, 'regressing');
  // regression -> target stays at current (no upward push)
  assert.equal(rec.target, 12);
  assert.match(rec.reason, /baisse/);
});

ok('timer (durée) -> reste en secondes, +5s, jamais converti en reps', () => {
  const entries = [
    perf('P2', 'Plank', '2026-01-01', 'timer', 0, 40),
    perf('P2', 'Plank', '2026-01-08', 'timer', 0, 45),
  ];
  const a = analyzeProgression(entries, 'P2');
  assert.equal(a.metric, 'duration');
  assert.equal(a.trend, 'progressing');
  const rec = suggestNextTarget(entries, 'P2');
  assert.ok(rec);
  assert.equal(rec.metric, 'duration');
  assert.equal(rec.unit, 'sec');
  assert.equal(rec.target, 50); // 45 + 5s
  // no reps on the metric
  assert.notEqual(rec.unit, 'rep');
});

ok('timer en baisse -> on conserve la durée actuelle', () => {
  const entries = [
    perf('P2', 'Plank', '2026-01-01', 'timer', 0, 50),
    perf('P2', 'Plank', '2026-01-08', 'timer', 0, 45),
  ];
  const rec = suggestNextTarget(entries, 'P2');
  assert.ok(rec);
  assert.equal(rec.trend, 'regressing');
  assert.equal(rec.target, 45);
  assert.equal(rec.unit, 'sec');
});

ok('poids pertinent -> on suit le poids, pas les reps', () => {
  // weighted exercise: metric becomes weight (weightUsedKg > 0)
  const entries = [
    perf('P3', 'Développé', '2026-01-01', 'reps', 10, 0, 50),
    perf('P3', 'Développé', '2026-01-08', 'reps', 10, 0, 52.5),
  ];
  const a = analyzeProgression(entries, 'P3');
  assert.equal(a.metric, 'weight');
  assert.equal(a.trend, 'progressing');
  const rec = suggestNextTarget(entries, 'P3');
  assert.ok(rec);
  assert.equal(rec.metric, 'weight');
  assert.equal(rec.unit, 'kg');
  assert.equal(rec.target, 55); // 52.5 + 2.5 kg
});

ok('pas de conversion reps <-> durée (métrique isolée)', () => {
  const reps = [
    perf('P1', 'Pompes', '2026-01-01', 'reps', 10),
    perf('P1', 'Pompes', '2026-01-08', 'reps', 12),
  ];
  const timer = [
    perf('P2', 'Plank', '2026-01-01', 'timer', 0, 40),
    perf('P2', 'Plank', '2026-01-08', 'timer', 0, 45),
  ];
  const r1 = suggestNextTarget(reps, 'P1')!;
  const r2 = suggestNextTarget(timer, 'P2')!;
  assert.equal(r1.unit, 'rep');
  assert.equal(r2.unit, 'sec');
  // targets expressed in their own metric with no cross multiplication
  assert.equal(r1.target, 14);
  assert.equal(r2.target, 50);
});

ok('valeurs nulles/invalides tolérées', () => {
  // totalReps 0 -> treated as insufficient/invalid, no crash
  const e0 = perf('P4', 'X', '2026-01-01', 'reps', 0);
  const e1 = perf('P4', 'X', '2026-01-08', 'reps', 0);
  const rec = suggestNextTarget([e0, e1], 'P4');
  assert.ok(rec);
  assert.equal(rec.trend, 'insufficient');
});

// ---------------------------------------------------------------- report -----
console.log(`\n${passed} tests PASS`);
if (process.exitCode === 1) {
  console.log('SOME TESTS FAILED');
} else {
  console.log('ALL TESTS PASSED');
}
