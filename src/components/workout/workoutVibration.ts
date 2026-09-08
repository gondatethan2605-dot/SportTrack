// Safe navigator.vibrate wrapper. If the API does not exist the call is a
// silent no-op: never throws, never logs an error.

// LOT 6 — item 17: named patterns so every cue type vibrates distinctly (same
// semantics as the cue sounds). Short pulses only; a missing navigator.vibrate
// degrades silently to "no vibration".
export const VIBRATION_PATTERNS = {
  setStart: [40, 30, 60],
  setEnd: [70, 40, 70],
  restStart: [30, 40, 30],
  restEnd: [50, 50, 50],
  countdown: [15],
  workoutEnd: [80, 60, 80, 60, 120],
  record: [60, 50, 120, 50, 60],
} as const;

export type VibrationPatternKey = keyof typeof VIBRATION_PATTERNS;

export function vibrate(pattern: number | readonly number[], enabled = true): void {
  if (!enabled) return;
  try {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav && 'vibrate' in nav && typeof nav.vibrate === 'function') {
      nav.vibrate(typeof pattern === 'number' ? [pattern] : [...pattern]);
    }
  } catch {
    // vibration unavailable -> nothing to do
  }
}