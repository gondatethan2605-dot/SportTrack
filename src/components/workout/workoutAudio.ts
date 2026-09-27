// Offline, dependency-free workout sounds built on the Web Audio API.
// No external audio files, no CDN, works fully offline. Every sound is an
// oscillator envelope. A module-level cooldown de-duplicates sounds that could
// otherwise fire twice (React StrictMode / doubled renders).

export type WorkoutSoundKind = 'tick' | 'go' | 'end' | 'restEnd' | 'start';

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
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.03);
  } catch {
    // ignore audio restrictions
  }
}

export function playWorkoutSound(kind: WorkoutSoundKind, enabled = true): void {
  if (!enabled) return;
  const now = Date.now();
  if (lastPlayedAt[kind] && now - lastPlayedAt[kind] < COOLDOWN_MS) return;
  lastPlayedAt[kind] = now;
  const ctx = getAudioContext();
  if (!ctx) return;
  switch (kind) {
    case 'tick':
      beep(ctx, 660, 660, 0, 0.06, 0.18);
      break;
    case 'go':
      beep(ctx, 523.25, 880, 0, 0.3, 0.3);
      break;
    case 'start':
      beep(ctx, 440, 660, 0, 0.22, 0.25);
      break;
    case 'end':
      beep(ctx, 587.33, 880, 0, 0.36, 0.28);
      break;
    case 'restEnd':
      beep(ctx, 660, 440, 0, 0.26, 0.24);
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