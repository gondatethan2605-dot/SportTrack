import { ExercisePerformance } from './types';
import { primaryProgressionMetric, performanceMetricValue, metricIsApplicable, metricUnit, TrackedMetric } from './utilsProgression';

// ----------------------------------------------------------------------------
// LOT 9 — Item 9.4 : comparaison de progression personnelle.
// Pure, read-only. Compares two recorded performances of the SAME exercise and
// ALWAYS in the same metric (the one the exercise actually uses: timer ->
// duration, weighted -> weight, otherwise reps). It never converts reps <-> sec
// and never compares two exercises to each other. Division by zero / NaN /
// Infinity are guarded so a comparison always returns either a finite, labelled
// result or null ("comparaison indisponible") — never a broken number.
// ----------------------------------------------------------------------------

export interface ValueComparison {
  deltaAbs: number; // current - previous (finite)
  deltaPercent: number | null; // rounded percent; null when the baseline is 0
}

// Percentage evolution between two non-negative values, protected against
// division by zero (returns null when not computable). Mirrors evolutionPercent
// from utilsStats but operates on any two finite values.
export function compareValues(current: number, previous: number): ValueComparison | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  const deltaAbs = Math.round((current - previous) * 10) / 10;
  let deltaPercent: number | null = null;
  if (previous !== 0) {
    deltaPercent = Math.round((((current - previous) / Math.abs(previous)) * 100) * 10) / 10;
  }
  return { deltaAbs, deltaPercent };
}

export interface PerformanceComparison {
  exerciseId: string;
  exerciseName: string;
  metric: TrackedMetric;
  unit: string;
  previousValue: number;
  currentValue: number;
  previousDate: string;
  currentDate: string;
  deltaAbs: number;
  deltaPercent: number | null;
  isNewBest: boolean; // current >= best of the exercise's history up to now
  best: number | null; // best comparable value for that metric in the history
  comparable: boolean;
}

// Compares two performances of the same exercise, in the metric that the
// exercise really uses (the current performance's own metric). Returns null
// whenever the previous performance is absent, belongs to another exercise, or
// does not support the metric (e.g. a reps-only exercise followed by a timer).
// When comparable, the result always carries finite deltas.
export function comparePerformances(
  current: ExercisePerformance | undefined | null,
  previous: ExercisePerformance | undefined | null
): PerformanceComparison | null {
  if (!current || !previous) return null;
  if (current.exerciseId !== previous.exerciseId) return null;

  const metric = primaryProgressionMetric(current);
  if (!metricIsApplicable(previous, metric)) return null;

  const currentValue = performanceMetricValue(current, metric);
  const previousValue = performanceMetricValue(previous, metric);
  const values = compareValues(currentValue, previousValue);
  if (!values) return null;

  // Reference history = the previous comparable performance. A current value is
  // strictly better only when it exceeds it (a tie is not a new best).
  const best: number | null = previousValue;

  return {
    exerciseId: current.exerciseId,
    exerciseName: current.exerciseName || previous.exerciseName,
    metric,
    unit: metricUnit(metric),
    previousValue,
    currentValue,
    previousDate: previous.date,
    currentDate: current.date,
    deltaAbs: values.deltaAbs,
    deltaPercent: values.deltaPercent,
    isNewBest: best !== null && currentValue > best,
    best,
    comparable: true,
  };
}

// Convenience: compare the two most recent comparable performances of one
// exercise from its full history (chronological). Returns null without a pair.
// If the most recent entry has no comparable predecessor (e.g. a one-off timer
// session inside a reps history), it walks backwards to find the nearest
// previous performance that shares the same metric — never mixing metrics.
export function compareLatestPerformances(
  entries: ExercisePerformance[],
  exerciseId: string
): PerformanceComparison | null {
  const sorted = [...(entries || [])]
    .filter((e) => e && e.exerciseId === exerciseId)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (sorted.length < 2) return null;
  const newest = sorted[sorted.length - 1];
  for (let i = sorted.length - 2; i >= 0; i--) {
    const comparison = comparePerformances(newest, sorted[i]);
    if (comparison) return comparison;
  }
  return null;
}