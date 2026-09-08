import { SessionExerciseLog } from './types';

// Whether a session contains at least one valid completed set. A session can be
// considered finished only when a real set was completed:
//   - reps mode: completed=true with a positive reps value;
//   - timer mode: completed=true AND durationSec > 0 (a timer finished at 0s
//     has never actually produced any effort).
// Merely having exercises present, or sets that exist with completed=false,
// is NOT enough to finalize a session.
export function hasValidCompletedSet(exercises: SessionExerciseLog[]): boolean {
  return (exercises || []).some((ex) =>
    (ex.sets || []).some((set) => {
      if (set.completed !== true) return false;
      if (set.mode === 'timer') return (set.durationSec || 0) > 0;
      return (set.reps || 0) > 0;
    }),
  );
}