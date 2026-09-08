import { WorkoutProgram, WorkoutProgramDay, ProgramExerciseConfig, ExercisePerformance } from './types';
import {
  analyzeProgression,
  suggestNextTarget,
  TrackedMetric,
  metricUnit,
} from './utilsProgression';

// LOT 4 — Item 13 (Programme intelligent).
//
// Conservative, deterministic per-exercise recommendations tied to the ACTIVE
// program. Everything reuses the existing analysis helpers (analyzeProgression /
// suggestNextTarget); nothing here converts reps <-> seconds and nothing is
// ever applied automatically:
//   - reps stays reps, duration stays duration, weight stays weight;
//   - if the exercise's history metric (reps/duration) disagrees with the
//     program config mode, no recommendation is produced (a suggestion over a
//     conversion is forbidden);
//   - accept/refuse only ever rewrites the exercise's TARGET (reps plan,
//     duration plan or target weight). sets, rest, mode and the rest of the
//     program are never touched by this module.

export interface ProgramRecommendation {
  exerciseId: string;
  exerciseName: string;
  metric: TrackedMetric;
  unit: string;
  last: number; // last recorded value of the starred metric
  best: number | null;
  trend: 'progressing' | 'stagnating' | 'regressing' | 'insufficient';
  currentTarget: number; // session-target already planned in the program
  suggestedTarget: number; // conservative next objective
  willIncrease: boolean; // suggestedTarget strictly above the program target
  reason: string;
}

// Total session-target planned by the config for the given metric:
//   - reps     -> sum of the per-set reps plan (fallback: per-set reps x sets),
//   - duration -> sum of the per-set duration plan (fallback: durationSec x sets),
//   - weight   -> the config's targetWeightKg.
// Returns null whenever the metric can't be mapped to a real program target.
function resolveProgramTarget(
  config: { sets: number; reps: number | string | undefined; durationSec?: number; repsPlan?: (number | string)[]; durationPlan?: number[]; targetWeightKg: number; mode?: 'reps' | 'timer' },
  metric: TrackedMetric
): number | null {
  const sets = Number.isFinite(config.sets) && config.sets > 0 ? config.sets : 0;
  if (sets === 0) return null;
  switch (metric) {
    case 'reps':
      if (config.repsPlan && config.repsPlan.length === sets) {
        const total = config.repsPlan.reduce<number>((acc, v) => acc + (Number(v) || 0), 0);
        return Number.isFinite(total) && total > 0 ? total : null;
      }
      {
        const perSet = Number(config.reps) || 0;
        return perSet > 0 ? perSet * sets : null;
      }
    case 'duration':
      if (config.durationPlan && config.durationPlan.length === sets) {
        const total = config.durationPlan.reduce((acc, v) => acc + (Number(v) || 0), 0);
        return Number.isFinite(total) && total > 0 ? total : null;
      }
      {
        const perSet = Number(config.durationSec) || 0;
        return perSet > 0 ? perSet * sets : null;
      }
    case 'weight':
      return Number.isFinite(config.targetWeightKg) && config.targetWeightKg > 0 ? config.targetWeightKg : null;
    default:
      return null; // volume has no program-level target
  }
}

// Distribute a total target across N sets (deterministic: base rounded below,
// remainder added to the first sets).
export function distributeTargetAcrossSets(total: number, sets: number): number[] {
  const safeSets = Number.isFinite(sets) && sets > 0 ? Math.max(1, Math.round(sets)) : 1;
  const safeTotal = Math.max(0, Math.round(total));
  const base = Math.floor(safeTotal / safeSets);
  const remainder = safeTotal - base * safeSets;
  return Array.from({ length: safeSets }, (_, i) => (i < remainder ? base + 1 : base));
}

export interface ProgramExerciseConfigSlice {
  exerciseId: string;
  exerciseName: string;
  mode?: 'reps' | 'timer';
  sets: number;
  reps: number | string | undefined;
  durationSec?: number;
  repsPlan?: (number | string)[];
  durationPlan?: number[];
  targetWeightKg: number;
}

// Per-exercise recommendation for every active-program exercise that has a real
// history AND a compatible program target. Sorted by program order (day/order).
export function computeProgramRecommendations(
  performances: ExercisePerformance[],
  program: WorkoutProgram | null
): ProgramRecommendation[] {
  if (!program || !Array.isArray(program.days)) return [];

  const out: ProgramRecommendation[] = [];
  for (const day of program.days) {
    const configs: ProgramExerciseConfigSlice[] = Array.isArray(day.exercises)
      ? (day.exercises as ProgramExerciseConfigSlice[])
      : (day.exerciseIds || []).map((id) => ({
          exerciseId: id,
          exerciseName: id,
          sets: 1,
          reps: undefined,
          targetWeightKg: 0,
        }));

    for (const config of configs) {
      if (!config || !config.exerciseId) continue;
      const suggestion = suggestNextTarget(performances, config.exerciseId);
      if (!suggestion) continue;
      const metric = suggestion.metric;
      if (metric === 'volume') continue; // no program-level volume target

      // History metric must agree with the program mode: never convert.
      if (metric === 'reps' && config.mode === 'timer') continue;
      if (metric === 'duration' && config.mode !== 'timer') continue;

      const currentTarget = resolveProgramTarget(config, metric);
      if (currentTarget === null || currentTarget <= 0) continue;
      if (!(suggestion.target > 0)) continue;

      const analysis = analyzeProgression(performances, config.exerciseId);
      const trend = analysis.trend;
      if (trend === 'insufficient') continue; // pas de données suffisantes -> rien
      const willIncrease = suggestion.target > currentTarget + 1e-9;

      out.push({
        exerciseId: config.exerciseId,
        exerciseName: config.exerciseName || config.exerciseId,
        metric,
        unit: metricUnit(metric),
        last: suggestion.last,
        best: suggestion.best,
        trend,
        currentTarget,
        suggestedTarget: suggestion.target,
        willIncrease,
        reason: `${suggestion.reason} La cible actuelle du programme est de ${currentTarget} ${metricUnit(metric)}.`,
      });
    }
  }
  return out;
}

// Recommendation for a single exercise (used by the Progression page).
export function recommendationForExercise(
  recommendations: ProgramRecommendation[],
  exerciseId: string
): ProgramRecommendation | null {
  for (const r of recommendations || []) {
    if (r.exerciseId === exerciseId) return r;
  }
  return null;
}

// Apply the suggestion to the exercise's TARGET only. Returns a NEW program
// (config-level clones) or the SAME reference when nothing matches.
export function applyProgramTargetSuggestion(
  program: WorkoutProgram,
  exerciseId: string,
  metric: TrackedMetric,
  suggestedTarget: number
): WorkoutProgram {
  const safeTarget = Number.isFinite(suggestedTarget) && suggestedTarget > 0 ? suggestedTarget : 0;
  if (safeTarget <= 0) return program;

  const target = metric === 'reps' || metric === 'duration' ? Math.round(safeTarget) : Math.round(safeTarget * 10) / 10;

  for (let d = 0; d < program.days.length; d++) {
    const day = program.days[d];
    const configs = Array.isArray(day.exercises) ? (day.exercises as ProgramExerciseConfigSlice[]) : [];
    for (let e = 0; e < configs.length; e++) {
      const config = configs[e];
      if (!config || config.exerciseId !== exerciseId) continue;

      const current = resolveProgramTarget(config, metric);
      if (current === null || target <= current + 1e-9) return program;

      // Cloned config — only the TARGET fields are rewritten.
      const nextConfig: ProgramExerciseConfig = {
        ...config as ProgramExerciseConfig,
      };
      const sets = Number.isFinite(config.sets) && config.sets > 0 ? Math.max(1, Math.round(config.sets)) : 1;

      if (metric === 'reps') {
        const perSet = distributeTargetAcrossSets(target, sets);
        nextConfig.repsPlan = perSet;
        nextConfig.reps = perSet[0];
      } else if (metric === 'duration') {
        const perSet = distributeTargetAcrossSets(target, sets);
        nextConfig.durationPlan = perSet;
        nextConfig.durationSec = perSet[0];
      } else if (metric === 'weight') {
        nextConfig.targetWeightKg = target;
      }

      // Only the affected config is replaced; every other exercise keeps its
      // identity untouched (never re-created) so nothing else changes.
      const nextExercises: ProgramExerciseConfig[] = configs.map((c, i) => (i === e ? nextConfig : c as ProgramExerciseConfig));
      const nextDay: WorkoutProgramDay = { ...day, exercises: nextExercises };
      return { ...program, days: program.days.map((dd, i) => (i === d ? nextDay : dd)) };
    }
  }
  return program;
}