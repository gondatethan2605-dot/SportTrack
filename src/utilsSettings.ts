// LOT H — global user preferences (Réglages & Personnalisation).
//
// These preferences live in localStorage only. They are NOT stored in IndexedDB,
// so DB_VERSION stays 8 and no migration is ever required. They act as GLOBAL
// defaults that seed NEW guided sessions; an already-started/in-progress session
// keeps its own per-session settings and is never changed mid-session.
//
// The functions here are pure / framework-free so they can be unit-tested with
// node (no DOM required when an explicit storage adapter is injected).

import { WorkoutSettings } from './types';

export const SETTINGS_STORAGE_KEY = 'sporttrack-settings';

// Defaults preserve the pre-LOT H behaviour as closely as possible:
// sounds ON, voice ON, vibration ON, 30s default rest (matches the guided engine's
// DEFAULT_REST_SEC), 30s rest between exercises, metric units and animations ON.
export const DEFAULT_WORKOUT_SETTINGS: Readonly<WorkoutSettings> = {
  soundEnabled: true,
  voiceEnabled: true,
  vibrationEnabled: true,
  defaultRestSec: 30,
  exerciseTransitionRestSec: 30,
  units: 'metric',
  animationsEnabled: true,
};

export type SettingsStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type SettingsReader = () => string | null;

// Allowed rest values (seconds) for both the default rest AND the rest between
// exercises. Anything else is normalised to the closest supported value
// (matching the values already used across SportTrack).
export const SUPPORTED_REST_OPTIONS: readonly number[] = [15, 30, 45, 60, 75, 90, 120];

export function isWorkoutSettings(value: unknown): value is WorkoutSettings {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.soundEnabled === 'boolean' &&
    typeof v.voiceEnabled === 'boolean' &&
    typeof v.vibrationEnabled === 'boolean'
  );
}

export function normaliseDefaultRestSec(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || Number.isNaN(num) || num <= 0) {
    return DEFAULT_WORKOUT_SETTINGS.defaultRestSec;
  }
  const rounded = Math.max(0, Math.round(num));
  // Snap to the closest supported rest value (keeps it predictable & touch-friendly).
  let best = SUPPORTED_REST_OPTIONS[0];
  let bestDelta = Infinity;
  for (const opt of SUPPORTED_REST_OPTIONS) {
    const delta = Math.abs(opt - rounded);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = opt;
    }
  }
  return best;
}

// Coerce an arbitrary (possibly malformed / legacy / partial) object into a
// fully-valid WorkoutSettings. Unknown or invalid fields fall back to defaults.
// Unit test targets: invalid values, missing values, old/incompatible values,
// absence of NaN / Infinity.
export function normaliseWorkoutSettings(raw: unknown): WorkoutSettings {
  const base = DEFAULT_WORKOUT_SETTINGS;
  let soundEnabled = base.soundEnabled;
  let voiceEnabled = base.voiceEnabled;
  let vibrationEnabled = base.vibrationEnabled;
  let defaultRestSec = base.defaultRestSec;
  let exerciseTransitionRestSec = base.exerciseTransitionRestSec;
  let units: WorkoutSettings['units'] = base.units;
  let animationsEnabled = base.animationsEnabled;

  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    if (typeof r.soundEnabled === 'boolean') soundEnabled = r.soundEnabled;
    if (typeof r.voiceEnabled === 'boolean') voiceEnabled = r.voiceEnabled;
    if (typeof r.vibrationEnabled === 'boolean') vibrationEnabled = r.vibrationEnabled;
    if (r.units === 'metric') units = 'metric'; // only metric is supported
    if (typeof r.animationsEnabled === 'boolean') animationsEnabled = r.animationsEnabled;
    defaultRestSec = normaliseDefaultRestSec(r.defaultRestSec);
    exerciseTransitionRestSec = normaliseDefaultRestSec(r.exerciseTransitionRestSec);
  }

  const out: WorkoutSettings = {
    soundEnabled,
    voiceEnabled,
    vibrationEnabled,
    defaultRestSec,
    exerciseTransitionRestSec,
    units,
    animationsEnabled,
  };

  // Hard invariant: never allow NaN / Infinity to leak into persisted settings.
  if (!Number.isFinite(out.defaultRestSec) || Number.isNaN(out.defaultRestSec)) {
    out.defaultRestSec = base.defaultRestSec;
  }
  if (!Number.isFinite(out.exerciseTransitionRestSec) || Number.isNaN(out.exerciseTransitionRestSec)) {
    out.exerciseTransitionRestSec = base.exerciseTransitionRestSec;
  }
  return out;
}

export interface SettingsAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// Minimal well-behaved default. Runs safely under node (no DOM) by returning
// null / no-op, so pure tests never throw when no real storage is present.
export const NOOP_STORAGE: SettingsAdapter = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

let storageOverride: SettingsAdapter | null = null;

// Inject a custom storage adapter (used by tests to avoid a real window).
export function __setSettingsStorage(adapter: SettingsAdapter | null): void {
  storageOverride = adapter;
}

export function getSettingsStorage(): SettingsAdapter {
  if (storageOverride) return storageOverride;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage as SettingsAdapter;
    }
  } catch {
    // storage access blocked (private mode etc.) -> fall through to no-op
  }
  return NOOP_STORAGE;
}

// Link the app's workout preference defaults into a per-session GuidedSettings.
// Only the three user toggles are themed; countdown/music keep their current
// session defaults (music stays off by default).
export function guidedSettingsFromWorkoutSettings(
  s: WorkoutSettings,
  countdownEnabled = true,
  musicEnabled = false,
  musicVolume = 0.6
): {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  voiceEnabled: boolean;
  countdownEnabled: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  exerciseTransitionRestSec: number;
} {
  return {
    soundEnabled: s.soundEnabled,
    vibrationEnabled: s.vibrationEnabled,
    voiceEnabled: s.voiceEnabled,
    countdownEnabled,
    musicEnabled,
    musicVolume,
    exerciseTransitionRestSec: s.exerciseTransitionRestSec,
  };
}

// ---------- Load / save / reset ----------

// Reads and normalises the persisted settings. Never throws: returns the
// defaults if storage is missing, malformed, or an ancient/incompatible format.
export function loadWorkoutSettings(adapter: SettingsAdapter = getSettingsStorage()): WorkoutSettings {
  let raw: unknown = null;
  try {
    const stored = adapter.getItem(SETTINGS_STORAGE_KEY);
    if (stored) raw = JSON.parse(stored);
  } catch {
    raw = null; // malformed JSON -> defaults
  }
  return normaliseWorkoutSettings(raw);
}

// Merges a partial change onto the current settings and persists the result.
// Returns the fully normalised new settings.
export function updateWorkoutSettings(
  patch: Partial<WorkoutSettings>,
  adapter: SettingsAdapter = getSettingsStorage()
): WorkoutSettings {
  const current = loadWorkoutSettings(adapter);
  const next = normaliseWorkoutSettings({ ...current, ...patch });
  try {
    adapter.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // persistence unavailable -> non-fatal
  }
  return next;
}

// Resets all preferences back to the defaults (removes the storage key).
// Only ever touches the preferences key — never any IndexedDB data.
export function resetWorkoutSettings(adapter: SettingsAdapter = getSettingsStorage()): WorkoutSettings {
  try {
    adapter.removeItem(SETTINGS_STORAGE_KEY);
  } catch {
    // non-fatal
  }
  return { ...DEFAULT_WORKOUT_SETTINGS };
}

// Convenience single-call used by the guided engine & any consumer that just
// needs the effective settings. Named to match the expected read-layer API.
export function getWorkoutSettings(adapter: SettingsAdapter = getSettingsStorage()): WorkoutSettings {
  return loadWorkoutSettings(adapter);
}
