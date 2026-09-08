// ----------------------------------------------------------------------------
// LOT 9 — Item 9.8 : séance rapide.
// Builds a SYNTHETIC workout day (never persisted as a program) to feed a
// WorkoutSessionPage without programId/dayId, so set-rest write-backs are
// skipped by the existing guards and the finished session follows the exact
// same validation / XP / records path as any real session.
// ----------------------------------------------------------------------------

import { initialExercises } from './data/initialExercises';
import { getDefaultStretchesForDay } from './data/stretchesData';
import { parseDefaultReps } from './utilsAlternatives';
import type { ProgramExerciseConfig, WorkoutProgramDay, MuscleGroup } from './types';

export const QUICK_SESSION_PRESETS = [10, 20, 30] as const;
export type QuickSessionMinutes = (typeof QUICK_SESSION_PRESETS)[number];

// Muscle buckets per preset duration (default, editable later by the user).
const QUICK_BUCKETS: Record<QuickSessionMinutes, MuscleGroup[]> = {
  10: ['Pectoraux'],
  20: ['Pectoraux', 'Dos'],
  30: ['Jambes', 'Pectoraux', 'Dos'],
};

const MAX_EXERCISES: Record<QuickSessionMinutes, number> = { 10: 3, 20: 4, 30: 5 };

function buildQuickExerciseConfig(
  ex: (typeof initialExercises)[number],
  restSec: number,
  stamp: number
): ProgramExerciseConfig {
  const native = parseDefaultReps(ex.defaultReps as number | string);
  return {
    id: `quick-${ex.id}-${stamp}`,
    exerciseId: ex.id,
    exerciseName: ex.name,
    sets: ex.defaultSets ?? 3,
    reps: native.kind === 'count' ? ex.defaultReps : 0,
    mode: native.kind === 'duration' ? 'timer' : 'reps',
    durationSec: native.kind === 'duration' ? native.value : 0,
    restSec,
    transitionRestSec: restSec + 15,
    targetWeightKg: 0,
    notes: undefined,
  };
}

// Build the synthetic day for the requested duration. Recomputed on demand so
// no state is retained; the seed changes each call to guarantee unique cfg ids.
export function buildQuickSessionPlan(minutes: QuickSessionMinutes): { day: WorkoutProgramDay; title: string } {
  const stamp = Date.now();
  const muscles = QUICK_BUCKETS[minutes];
  const cap = MAX_EXERCISES[minutes];

  const configs: ProgramExerciseConfig[] = [];
  const seen = new Set<string>();
  for (const muscle of muscles) {
    for (const ex of initialExercises) {
      if (configs.length >= cap) break;
      if (ex.primaryMuscle === muscle && !seen.has(ex.id)) {
        seen.add(ex.id);
        configs.push(buildQuickExerciseConfig(ex, 60, stamp));
      }
    }
  }
  // Any fallback: if the buckets yielded nothing (empty catalog), stay honest.
  // The session is still completable via the add-exercise picker.

  const day: WorkoutProgramDay = {
    id: `quick-${minutes}-${stamp}`,
    name: `Séance rapide — ${minutes} min`,
    dayOfWeek: new Date().toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase(),
    scheduledTime: undefined,
    muscleGroups: muscles,
    exerciseIds: configs.map((c) => c.exerciseId),
    exercises: configs,
    stretches: getDefaultStretchesForDay(undefined, `séance rapide ${minutes}`, muscles),
    notes: 'Séance synthétique temporaire — elle ne modifie aucun programme.',
  };

  return { day, title: day.name };
}

// Valid preset guard (keeps callers type-safe at runtime).
export function isQuickSessionMinutes(value: number): value is QuickSessionMinutes {
  return (QUICK_SESSION_PRESETS as readonly number[]).includes(value);
}