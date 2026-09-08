// Shared XP computation for completed work-out sessions.
// Single source of truth: 250 XP base + 20 XP per exercise + 25 XP per completed stretch.
// Used both for the live HUD (WorkoutSessionPage) and for persistence (handleFinishSession + reload recompute).
export function computeSessionXp(exerciseCount: number, completedStretchesCount: number): number {
  return 250 + exerciseCount * 20 + completedStretchesCount * 25;
}