// Offline, dependency-free workout sounds built on the Web Audio API.
// No external audio files, no CDN, works fully offline. Every sound is an
// oscillator envelope. A module-level cooldown de-duplicates sounds that could
// otherwise fire twice (React StrictMode / doubled renders).

// LOT 6 — item 17: kinds are now event-specific so each feedback is a distinct,
// recognisable signal: set start/end, rest start/end, countdown tick, session
// completed and a genuine new personal record.
export type WorkoutSoundKind = 'tick' | 'go' | 'end' | 'restEnd' | 'start' | 'restStart' | 'complete' | 'pr';

let audioCtx: AudioContext | null = null;
const lastPlayedAt: Partial<Record<WorkoutSoundKind, number>> = {};
const COOLDOWN_MS = 90;

function getAudioContext(): AudioContext | null {
  try {
    const AC: typeof AudioContext | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

// Call from a user gesture (button click) to lift browser autoplay restrictions.
export function unlockAudio(): void {
  getAudioContext();
}

function beep(
  ctx: AudioContext,
  freqStart: number,
  freqEnd: number,
  delaySec: number,
  durationSec: number,
  volume: number,
  type: OscillatorType = 'sine'
): void {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime + delaySec;
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), now + durationSec);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.03);
  } catch {
    // ignore audio restrictions
  }
}

// Short, distinct and recognisable cue sounds (all generated locally, offline).
export function playWorkoutSound(kind: WorkoutSoundKind, enabled = true, volumeScale = 1): void {
  if (!enabled) return;
  // A 0 volume means "muted": skip the work entirely (no scheduled sound).
  const scale = Math.max(0, Math.min(1, Number.isFinite(volumeScale) ? volumeScale : 1));
  if (scale <= 0) return;
  const now = Date.now();
  if (lastPlayedAt[kind] && now - lastPlayedAt[kind] < COOLDOWN_MS) return;
  lastPlayedAt[kind] = now;
  const ctx = getAudioContext();
  if (!ctx) return;
  switch (kind) {
    case 'tick':
      beep(ctx, 660, 660, 0, 0.06, 0.18 * scale);
      break;
    case 'go':
      beep(ctx, 523.25, 880, 0, 0.3, 0.3 * scale);
      break;
    case 'start':
      beep(ctx, 440, 660, 0, 0.22, 0.25 * scale);
      break;
    case 'end':
      beep(ctx, 587.33, 880, 0, 0.36, 0.28 * scale);
      break;
    case 'restEnd':
      beep(ctx, 660, 440, 0, 0.26, 0.24 * scale);
      break;
    case 'restStart':
      // Soft low double thud: clearly "rest is starting".
      beep(ctx, 196, 196, 0, 0.12, 0.18 * scale);
      beep(ctx, 196, 196, 0.16, 0.12, 0.18 * scale);
      break;
    case 'complete':
      // Rising three-note fanfare: session finished.
      beep(ctx, 523.25, 523.25, 0, 0.14, 0.22 * scale);
      beep(ctx, 659.25, 659.25, 0.15, 0.14, 0.22 * scale);
      beep(ctx, 783.99, 1046.5, 0.3, 0.3, 0.26 * scale);
      break;
    case 'pr':
      // Bright ascending trill: unmistakable new personal record.
      beep(ctx, 783.99, 783.99, 0, 0.1, 0.24 * scale);
      beep(ctx, 1046.5, 1046.5, 0.11, 0.1, 0.24 * scale);
      beep(ctx, 1318.5, 1318.5, 0.22, 0.16, 0.26 * scale);
      beep(ctx, 1567.98, 1567.98, 0.4, 0.3, 0.28 * scale);
      break;
  }
}

// Architecture-ready music stub: SportTrack has no bundled audio track, so this
// intentionally returns a no-op. A local audio source can be plugged here later
// without touching the guided session. Returns a stop() handle.
export function startWorkoutMusic(_volume: number): () => void {
  return () => {
    // Music is optional; the session must keep working without any music.
  };
}