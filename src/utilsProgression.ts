import {
  ExercisePerformance,
  ExercisePerformanceSet,
  ExerciseBest,
  SessionExerciseLog,
  WorkoutSession,
} from './types';

const buildPerformanceSet = (set: SessionExerciseLog['sets'][number]): ExercisePerformanceSet => ({
  setNumber: set.setNumber,
  weightKg: set.weightKg || 0,
  reps: set.reps || 0,
  mode: set.mode === 'timer' ? 'timer' : 'reps',
  durationSec: set.durationSec || 0,
  completed: !!set.completed,
});

const sumCompletedReps = (sets: ExercisePerformanceSet[]): number =>
  sets.reduce((acc, s) => (s.completed && s.mode === 'reps' ? acc + s.reps : acc), 0);

const sumCompletedDuration = (sets: ExercisePerformanceSet[]): number =>
  sets.reduce((acc, s) => (s.completed && s.mode === 'timer' ? acc + s.durationSec : acc), 0);

const sumCompletedVolume = (sets: ExercisePerformanceSet[]): number =>
  sets.reduce((acc, s) => (s.completed && s.mode === 'reps' ? acc + s.weightKg * s.reps : acc), 0);

const maxWeightUsed = (sets: ExercisePerformanceSet[]): number =>
  sets.reduce((acc, s) => (s.completed ? Math.max(acc, s.weightKg) : acc), 0);

const bestCompletedSet = (sets: ExercisePerformanceSet[]) => {
  const completed = sets.filter((s) => s.completed);
  if (completed.length === 0) return null;
  // A session card is homogeneous in mode; for timer sets the real "best"
  // is the longest duration, not a (zero) reps count.
  if (dominantMode(completed) === 'timer') {
    return completed.reduce((acc, s) => (s.durationSec > acc.durationSec ? s : acc));
  }
  return completed.reduce((acc, s) => {
    if (s.weightKg !== acc.weightKg) return s.weightKg > acc.weightKg ? s : acc;
    return s.reps > acc.reps ? s : acc;
  });
};

const dominantMode = (sets: ExercisePerformanceSet[]): ExercisePerformanceSet['mode'] => {
  for (const s of sets) {
    if (s.completed) return s.mode;
  }
  return sets[0]?.mode || 'reps';
};

// Merge every card of the same exercise inside one session into a single performance.
export function buildExercisePerformance(
  sessionId: string,
  sessionTitle: string,
  date: string,
  logs: SessionExerciseLog[]
): ExercisePerformance | null {
  const sets = logs.flatMap((l) => l.sets.map(buildPerformanceSet));
  const completed = sets.filter((s) => s.completed);
  if (completed.length === 0) return null;

  const best = bestCompletedSet(sets);
  return {
    id: `${sessionId}-${logs[0].exerciseId}`,
    exerciseId: logs[0].exerciseId,
    exerciseName: logs[0].exerciseName,
    sessionId,
    sessionTitle,
    date,
    mode: dominantMode(sets),
    setsPlanned: sets.length,
    setsCompleted: completed.length,
    totalReps: sumCompletedReps(sets),
    totalDurationSec: sumCompletedDuration(sets),
    totalVolumeKg: sumCompletedVolume(sets),
    weightUsedKg: maxWeightUsed(sets),
    sets,
    bestSet: best
      ? {
          setNumber: best.setNumber,
          weightKg: best.weightKg,
          reps: best.reps,
          durationSec: best.mode === 'timer' ? best.durationSec : undefined,
        }
      : null,
  };
}

// Group the session cards by exercise and produce one performance per exercise.
export function buildSessionPerformances(session: WorkoutSession): ExercisePerformance[] {
  const groups = new Map<string, SessionExerciseLog[]>();
  for (const log of session.exercises || []) {
    const list = groups.get(log.exerciseId);
    if (list) list.push(log);
    else groups.set(log.exerciseId, [log]);
  }
  const entries: ExercisePerformance[] = [];
  for (const logs of groups.values()) {
    const entry = buildExercisePerformance(session.id, session.title, session.date, logs);
    if (entry) entries.push(entry);
  }
  return entries;
}

function pickBestWeight(entries: ExercisePerformance[]): ExercisePerformance {
  const sorted = entries.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return sorted[sorted.length - 1] || entries[0];
}

// Pure, deterministic computation of every recorded best for one exercise.
export function computeExerciseBest(exerciseId: string, entries: ExercisePerformance[]): ExerciseBest | null {
  if (!entries || entries.length === 0) return null;

  let bestWeightKg: ExerciseBest['bestWeightKg'] = null;
  let bestReps: ExerciseBest['bestReps'] = null;
  let bestVolumeKg: ExerciseBest['bestVolumeKg'] = null;
  let bestDurationSec: ExerciseBest['bestDurationSec'] = null;
  let lastDate = '';

  for (const entry of entries) {
    if (!entry.date || entry.date > lastDate) lastDate = entry.date;
    for (const s of entry.sets) {
      if (!s.completed) continue;
      if (!bestWeightKg || s.weightKg > bestWeightKg.value || (s.weightKg === bestWeightKg.value && s.reps > (bestWeightKg.reps || 0))) {
        bestWeightKg = { value: s.weightKg, reps: s.reps, date: entry.date };
      }
      if (s.mode === 'reps') {
        if (!bestReps || s.reps > bestReps.value || (s.reps === bestReps.value && s.weightKg > (bestReps.weightKg || 0))) {
          bestReps = { value: s.reps, weightKg: s.weightKg, date: entry.date };
        }
        const vol = s.weightKg * s.reps;
        if (!bestVolumeKg || vol > bestVolumeKg.value) {
          bestVolumeKg = { value: vol, date: entry.date };
        }
      } else if (s.mode === 'timer') {
        if (!bestDurationSec || s.durationSec > bestDurationSec.value) {
          bestDurationSec = { value: s.durationSec, weightKg: s.weightKg, date: entry.date };
        }
      }
    }
  }

  const latest = pickBestWeight(entries);
  const uniqueByDate = new Set(entries.map((e) => e.id)).size;

  return {
    exerciseId,
    exerciseName: latest.exerciseName,
    bestWeightKg,
    bestReps,
    bestVolumeKg,
    bestDurationSec,
    lastPerformedDate: lastDate || null,
    timesPerformed: uniqueByDate,
    updatedAt: lastDate ? `${lastDate}T00:00:00` : new Date().toISOString(),
  };
}

// ----------------------------------------------------------------------------
// Read-side helpers used by the Progression / Stats UI (Phase 3).
// These never mutate stored data and follow the same mode rules as the writer.
// ----------------------------------------------------------------------------

export type TrackedMetric = 'reps' | 'duration' | 'weight' | 'volume';

// The primary scalar metric followed for a single performance, derived from its
// real recorded data (never from repsPlan / durationPlan).
export function primaryProgressionMetric(entry: ExercisePerformance): TrackedMetric {
  if (entry.mode === 'timer') return 'duration';
  if (entry.weightUsedKg > 0) return 'weight';
  return 'reps';
}

export function performanceMetricValue(entry: ExercisePerformance, metric: TrackedMetric): number {
  switch (metric) {
    case 'duration':
      return entry.totalDurationSec || 0;
    case 'weight':
      return entry.weightUsedKg || 0;
    case 'volume':
      return entry.totalVolumeKg || 0;
    case 'reps':
    default:
      return entry.totalReps || 0;
  }
}

// Each metric can only ever be tracked through the matching data source.
// Using a metric on a performance it does not support yields null.
export function metricIsApplicable(entry: ExercisePerformance, metric: TrackedMetric): boolean {
  if (metric === 'duration') return entry.mode === 'timer';
  if (metric === 'volume') return entry.mode !== 'timer';
  if (metric === 'reps') return entry.mode !== 'timer';
  // weight is applicable to any exercise where a weight was actually used
  return entry.weightUsedKg > 0;
}

export function metricUnit(metric: TrackedMetric): string {
  switch (metric) {
    case 'duration':
      return 'sec';
    case 'weight':
    case 'volume':
      return 'kg';
    case 'reps':
    default:
      return 'rep';
  }
}

// Chronological sort (stable) independent of the storage order in IndexedDB.
export function sortPerformancesByDate(entries: ExercisePerformance[]): ExercisePerformance[] {
  return [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export interface ProgressionDelta {
  metric: TrackedMetric;
  sessionId: string;
  date: string;
  current: number;
  previous: number | null;
  delta: number | null; // current - previous ; null when not comparable (0 or 1 session)
  unit: string;
}

// Compares the most recent session to the immediately previous one for the same
// exercise. Returns null when there is no performance for the exercise.
export function computeProgressionDelta(entries: ExercisePerformance[], exerciseId: string): ProgressionDelta | null {
  const sorted = sortPerformancesByDate((entries || []).filter((e) => e.exerciseId === exerciseId));
  if (sorted.length === 0) return null;

  const cur = sorted[sorted.length - 1];
  const prev = sorted.length >= 2 ? sorted[sorted.length - 2] : null;
  const metric = primaryProgressionMetric(cur);
  const curV = performanceMetricValue(cur, metric);
  const prevV = prev && metricIsApplicable(prev, metric) ? performanceMetricValue(prev, metric) : null;

  return {
    metric,
    sessionId: cur.sessionId,
    date: cur.date,
    current: curV,
    previous: prevV !== null ? prevV : null,
    delta: prevV !== null ? curV - prevV : null,
    unit: metricUnit(metric),
  };
}

// Per-row deltas used by the history table: each row is compared against the
// preceding chronological session of the same exercise.
export function computeHistoryDeltas(entries: ExercisePerformance[], exerciseId: string): Map<string, ProgressionDelta> {
  const sorted = sortPerformancesByDate((entries || []).filter((e) => e.exerciseId === exerciseId));
  const map = new Map<string, ProgressionDelta>();
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const prev = i > 0 ? sorted[i - 1] : null;
    const metric = primaryProgressionMetric(cur);
    const curV = performanceMetricValue(cur, metric);
    const prevV = prev && metricIsApplicable(prev, metric) ? performanceMetricValue(prev, metric) : null;
    map.set(cur.sessionId, {
      metric,
      sessionId: cur.sessionId,
      date: cur.date,
      current: curV,
      previous: prevV !== null ? prevV : null,
      delta: prevV !== null && prev ? curV - prevV : null,
      unit: metricUnit(metric),
    });
  }
  return map;
}

// ----------------------------------------------------------------------------
// Smart progression suggestion (V8.1). Purely derived from real recorded data.
// It NEVER converts reps <-> seconds: the starred metric for an exercise stays
// exactly the one used by its own history (timer -> duration, weighted -> weight,
// otherwise reps). The suggestion is informational only; applying/ignoring it
// never mutates a program or any stored value.
// ----------------------------------------------------------------------------

export interface ProgressionSuggestion {
  metric: TrackedMetric;
  unit: string;
  current: number; // last recorded value of the starred metric
  suggested: number; // next target (always >= current, in the same unit)
  best: number | null; // best value ever recorded for that metric
  previous: number | null; // value of the immediately previous session
}

// Suggested increment, unit-appropriate and always a step the athlete can aim for.
function suggestionStep(metric: TrackedMetric): number {
  switch (metric) {
    case 'duration':
      return 5; // +5 sec
    case 'weight':
      return 2.5; // +2.5 kg
    case 'volume':
      return 100; // +100 kg
    case 'reps':
    default:
      return 2; // +2 reps
  }
}

export function computeProgressionSuggestion(entries: ExercisePerformance[], exerciseId: string): ProgressionSuggestion | null {
  const sorted = sortPerformancesByDate((entries || []).filter((e) => e.exerciseId === exerciseId));
  if (sorted.length === 0) return null;

  const cur = sorted[sorted.length - 1];
  const metric = primaryProgressionMetric(cur);
  const current = performanceMetricValue(cur, metric);
  const step = suggestionStep(metric);

  // Non-integer targets (e.g. reps) are rounded to integer; timers/weights keep
  // one decimal when meaningful.
  const suggested = Number.isInteger(step) ? Math.round(current + step) : Math.round((current + step) * 10) / 10;

  let best: number | null = null;
  for (const e of sorted) {
    const v = performanceMetricValue(e, metric);
    if (metricIsApplicable(e, metric) && (best === null || v > best)) best = v;
  }

  const prev = sorted.length >= 2 ? performanceMetricValue(sorted[sorted.length - 2], metric) : null;

  return {
    metric,
    unit: metricUnit(metric),
    current,
    suggested,
    best,
    previous: prev,
  };
}

// ----------------------------------------------------------------------------
// LOT D — Progression intelligente.
// Pure read-side analysis. It NEVER converts reps <-> seconds: the starred
// metric for an exercise is exactly the one used by its own history (timer ->
// duration, weighted -> weight, otherwise reps), matching the writer helpers.
// Nothing here mutates stored data.
// ----------------------------------------------------------------------------

export type ProgressionTrend = 'insufficient' | 'progressing' | 'stagnating' | 'regressing';

export interface ProgressionAnalysis {
  trend: ProgressionTrend;
  metric: TrackedMetric;
  unit: string;
  current: number; // last recorded value of the starred metric
  previous: number | null; // value of the immediately previous comparable session
  best: number | null; // best comparable value ever recorded
  comparableCount: number; // number of comparable chronological points used
  historyCount: number; // total performances recorded for the exercise
}

// Classifies the recent trajectory of one exercise from its real history.
// Requires at least 2 comparable (metric-applicable) chronological points,
// otherwise the trend is "insufficient" and no conclusion is drawn.
export function analyzeProgression(entries: ExercisePerformance[], exerciseId: string): ProgressionAnalysis {
  const byExercise = sortPerformancesByDate((entries || []).filter((e) => e.exerciseId === exerciseId));
  const historyCount = byExercise.length;
  if (historyCount === 0) {
    return {
      trend: 'insufficient',
      metric: 'reps',
      unit: 'rep',
      current: 0,
      previous: null,
      best: null,
      comparableCount: 0,
      historyCount: 0,
    };
  }

  const metric = primaryProgressionMetric(byExercise[byExercise.length - 1]);
  const comparable = byExercise
    .map((e) => performanceMetricValue(e, metric))
    .filter((v, i, arr) => v > 0 && metricIsApplicable(byExercise[i], metric));

  const lastV = comparable[comparable.length - 1];
  const prevV = comparable.length >= 2 ? comparable[comparable.length - 2] : null;
  let best: number | null = null;
  for (const v of comparable) if (best === null || v > best) best = v;

  const base: ProgressionAnalysis = {
    metric,
    unit: metricUnit(metric),
    trend: 'insufficient',
    current: lastV ?? 0,
    previous: prevV,
    best,
    comparableCount: comparable.length,
    historyCount,
  };

  if (comparable.length < 2 || lastV === undefined || lastV <= 0) {
    return { ...base, trend: 'insufficient' };
  }

  const trend: ProgressionTrend =
    lastV === prevV ? 'stagnating' : lastV > (prevV as number) ? 'progressing' : 'regressing';
  return { ...base, trend };
}

// Conservative next-target recommendation built on the analysed trend. The
// target is always expressed in the exercise's own metric (reps stays reps,
// duration stays duration) and never jumps more than one step at a time.
export interface ProgressionRecommendation {
  metric: TrackedMetric;
  unit: string;
  trend: ProgressionTrend;
  last: number; // last recorded value (same unit as target)
  previous: number | null; // value of the immediately previous comparable session
  best: number | null; // best comparable value
  target: number; // recommended next objective (>= last)
  reason: string; // short, human-readable French explanation
}

// Comparable threshold used to decide approximations (e.g. reps are integers,
// durations/weights keep one decimal like the suggestion helper).
const roundMetric = (metric: TrackedMetric, v: number): number =>
  Number.isInteger(suggestionStep(metric)) ? Math.round(v) : Math.round(v * 10) / 10;

export function suggestNextTarget(entries: ExercisePerformance[], exerciseId: string): ProgressionRecommendation | null {
  const sorted = sortPerformancesByDate((entries || []).filter((e) => e.exerciseId === exerciseId));
  if (sorted.length === 0) return null;

  const metric = primaryProgressionMetric(sorted[sorted.length - 1]);
  const unit = metricUnit(metric);
  const last = performanceMetricValue(sorted[sorted.length - 1], metric);
  const step = suggestionStep(metric);

  let best: number | null = null;
  let comparableCount = 0;
  for (const e of sorted) {
    const v = performanceMetricValue(e, metric);
    if (metricIsApplicable(e, metric) && v > 0) {
      comparableCount++;
      if (best === null || v > best) best = v;
    }
  }

  // Two comparable points are required before we dare recommend any progression.
  if (comparableCount < 2 || last <= 0) {
    return {
      metric,
      unit,
      trend: 'insufficient',
      last,
      previous: null,
      best,
      target: roundMetric(metric, last),
      reason:
        'Historique trop court. Gardez l’objectif actuel : quelques séances de plus donneront une recommandation fiable.',
    };
  }

  const prev = (() => {
    const comp = sorted
      .filter((e) => metricIsApplicable(e, metric) && performanceMetricValue(e, metric) > 0)
      .map((e) => performanceMetricValue(e, metric));
    return comp.length >= 2 ? comp[comp.length - 2] : null;
  })();
  const trend: ProgressionTrend = last === prev ? 'stagnating' : last > (prev as number) ? 'progressing' : 'regressing';

  let target: number;
  let reason: string;
  if (trend === 'regressing') {
    // Regression: do not push upward — tentatively keep the current objective.
    target = roundMetric(metric, last);
    reason = 'Dernière performance en baisse. On conserve l’objectif pour se recentrer sur l’exécution avant de progresser.';
  } else if (trend === 'stagnating') {
    target = roundMetric(metric, last + step);
    reason = 'Performance stable. Petite progression conseillée pour continuer à avancer.';
  } else {
    target = roundMetric(metric, last + step);
    reason = 'Bonne dynamique. On propose une progression raisonnable au-delà de la dernière performance.';
  }

  return { metric, unit, trend, last, previous: prev, best, target, reason };
}

// Recompute bests for every exercise represented in the given performances.
export function recomputeExerciseBests(performances: ExercisePerformance[]): ExerciseBest[] {
  const byExercise = new Map<string, ExercisePerformance[]>();
  for (const p of performances) {
    if (!p.exerciseId) continue;
    const list = byExercise.get(p.exerciseId);
    if (list) list.push(p);
    else byExercise.set(p.exerciseId, [p]);
  }
  const bests: ExerciseBest[] = [];
  for (const [exerciseId, entries] of byExercise) {
    const best = computeExerciseBest(exerciseId, entries);
    if (best) bests.push(best);
  }
  return bests;
}