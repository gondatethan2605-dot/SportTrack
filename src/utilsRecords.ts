import { PersonalRecord, ExerciseBest } from './types';

// ----------------------------------------------------------------------------
// LOT III — "NOUVEAU RECORD" detection at the end of a validated session.
// Pure, read-only. Reuses the exact same sources as the writers:
//   - poids  -> stored PersonalRecord PRs (weight-based, one per exercise);
//   - reps   -> bestReps from exerciseBests (reps mode only);
//   - durée  -> bestDurationSec from exerciseBests (timer mode only).
// Metrics are NEVER mixed: a reps value never comes from a duration and vice
// versa. A value is announced as a record ONLY when it strictly exceeds the
// previous best (or when it is the very first recorded performance). Equal
// values never notify, avoiding repeated notifications for the same record.
// ----------------------------------------------------------------------------

export type NewRecordMode = 'poids' | 'reps' | 'duree';

export interface NewRecordItem {
  exerciseId: string;
  exerciseName: string;
  mode: NewRecordMode;
  newValue: number;
  previousValue: number | null; // null = first ever performance for this metric
  unit: 'kg' | 'rep' | 'sec';
  repsContext?: number; // reps achieved on the weight PR (informational)
  weightContext?: number; // weight used on the reps PR (informational)
}

export function buildNewRecordItems(
  newWeightRecords: PersonalRecord[],
  oldBests: ExerciseBest[],
  newBests: ExerciseBest[]
): NewRecordItem[] {
  const items: NewRecordItem[] = [];
  const oldByExercise = new Map<string, ExerciseBest>();
  for (const b of oldBests || []) oldByExercise.set(b.exerciseId, b);
  const newByExercise = new Map<string, ExerciseBest>();
  for (const b of newBests || []) newByExercise.set(b.exerciseId, b);

  // Weight records come from the stored PersonalRecord PRs (previous weight
  // is already captured by the writer as previousWeightKg).
  for (const rec of newWeightRecords || []) {
    items.push({
      exerciseId: rec.exerciseId,
      exerciseName: rec.exerciseName,
      mode: 'poids',
      newValue: rec.weightKg,
      previousValue: rec.previousWeightKg != null ? rec.previousWeightKg : null,
      unit: 'kg',
      repsContext: rec.reps,
    });
  }

  // Reps & duration records are derived from per-exercise bests, each strictly
  // in its own mode.
  for (const [exerciseId, nb] of newByExercise) {
    const ob = oldByExercise.get(exerciseId);
    if (nb.bestReps) {
      const oldValue = ob?.bestReps?.value != null ? ob.bestReps.value : null;
      if (oldValue === null || nb.bestReps.value > oldValue) {
        items.push({
          exerciseId,
          exerciseName: nb.exerciseName,
          mode: 'reps',
          newValue: nb.bestReps.value,
          previousValue: oldValue,
          unit: 'rep',
          weightContext: nb.bestReps.weightKg,
        });
      }
    }
    if (nb.bestDurationSec) {
      const oldValue = ob?.bestDurationSec?.value != null ? ob.bestDurationSec.value : null;
      if (oldValue === null || nb.bestDurationSec.value > oldValue) {
        items.push({
          exerciseId,
          exerciseName: nb.exerciseName,
          mode: 'duree',
          newValue: nb.bestDurationSec.value,
          previousValue: oldValue,
          unit: 'sec',
        });
      }
    }
  }

  // Deterministic ordering: by exercise name, then by mode (poids -> reps -> durée).
  const modeRank: Record<NewRecordMode, number> = { poids: 0, reps: 1, duree: 2 };
  return items.sort(
    (a, b) =>
      a.exerciseName.localeCompare(b.exerciseName, 'fr') ||
      modeRank[a.mode] - modeRank[b.mode]
  );
}