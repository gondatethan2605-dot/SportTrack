// Safe navigator.vibrate wrapper. If the API does not exist the call is a
// silent no-op: never throws, never logs an error.

export function vibrate(pattern: number | number[], enabled = true): void {
  if (!enabled) return;
  try {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav && 'vibrate' in nav && typeof nav.vibrate === 'function') {
      nav.vibrate(pattern);
    }
  } catch {
    // vibration unavailable -> nothing to do
  }
}