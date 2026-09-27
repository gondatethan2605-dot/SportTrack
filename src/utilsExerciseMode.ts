import { ExerciseMode } from './types';

export const REP_CADENCE_SEC: Record<string, number> = {
  'Jumping jack': 0.75,
  'Mountain climber': 0.5,
  'Burpees': 2.5,
  'High knees': 0.5,
  'Jump squats': 1.5,
  'Squats': 2,
  'Pompes': 2.5,
  'Fentes arrière': 2,
  'Fentes': 2,
  'Crunch': 1.5,
  'Abdos': 1.5,
  'Russian twist sans poids': 1,
  'Pont fessier': 1.5,
};

export function getRepCadenceSec(exerciseName: string): number {
  const exact = REP_CADENCE_SEC[exerciseName];
  if (exact) return exact;
  const key = Object.keys(REP_CADENCE_SEC).find(k => exerciseName.toLowerCase().includes(k.toLowerCase()));
  return key ? REP_CADENCE_SEC[key] : 1.5;
}

export function repsToDurationSec(exerciseName: string, reps: number): number {
  return Math.max(1, Math.round(reps * getRepCadenceSec(exerciseName)));
}

export function durationToReps(exerciseName: string, durationSec: number): number {
  return Math.max(1, Math.round(durationSec / getRepCadenceSec(exerciseName)));
}

export function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m ? `${m} min${s ? ` ${s}s` : ''}` : `${s}s`;
}
