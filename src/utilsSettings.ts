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

// LOT 6 — item 16 (visual themes): mode + accent, both optional so legacy
// settings without them keep the current dark/violet appearance.
export const THEME_MODES = ['dark', 'light', 'system'] as const;
export type ThemeModeValue = (typeof THEME_MODES)[number];
export const ACCENT_COLORS = ['violet', 'blue', 'green', 'orange', 'red', 'rose'] as const;
export type AccentColorValue = (typeof ACCENT_COLORS)[number];

// LOT 6 — item 18 (customisable dashboard): the ordered, user-visible blocks.
// The hero START action is ALWAYS displayed above them and is never here.
export const DASHBOARD_BLOCK_KEYS = [
  'streak',
  'level',
  'volume',
  'weekly',
  'badges',
  'stats',
  'recommendation',
  'next-session',
  'records',
] as const;
export type DashboardBlockKey = (typeof DASHBOARD_BLOCK_KEYS)[number];
export const DEFAULT_DASHBOARD_BLOCKS: readonly DashboardBlockKey[] = DASHBOARD_BLOCK_KEYS;
export const DASHBOARD_BLOCK_LABELS: Record<DashboardBlockKey, string> = {
  streak: 'Série en cours',
  level: 'Niveau & XP',
  volume: 'Volume soulevé',
  weekly: 'Objectif semaine',
  badges: 'Badges & défis',
  stats: 'Statistiques de la semaine',
  recommendation: 'Cible recommandée',
  'next-session': 'Prochaine séance & objectifs',
  records: 'Records & dernière activité',
};

// Defaults preserve the pre-LOT H behaviour as closely as possible:
// sounds ON, voice ON, vibration ON, 30s default rest (matches the guided engine's
// DEFAULT_REST_SEC), 30s rest between exercises, metric units and animations ON.
// LOT 6 — item 17: all feedback categories default ON with a moderate volume.
export const DEFAULT_WORKOUT_SETTINGS: Readonly<WorkoutSettings> = {
  soundEnabled: true,
  voiceEnabled: true,
  vibrationEnabled: true,
  defaultRestSec: 30,
  exerciseTransitionRestSec: 30,
  units: 'metric',
  animationsEnabled: true,
  themeMode: 'dark',
  accentColor: 'violet',
  dashboardBlocks: [...DEFAULT_DASHBOARD_BLOCKS],
  feedbackVolume: 0.8,
  seriesFeedbackEnabled: true,
  restFeedbackEnabled: true,
  countdownFeedbackEnabled: true,
  workoutEndFeedbackEnabled: true,
  recordFeedbackEnabled: true,
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

// LOT 6 — item 16: coerce the theme mode. Unknown values fall back to the
// default ('dark'), preserving the current appearance for legacy settings.
export function normaliseThemeMode(value: unknown): ThemeModeValue {
  return THEME_MODES.includes(value as ThemeModeValue) ? (value as ThemeModeValue) : DEFAULT_WORKOUT_SETTINGS.themeMode;
}

// LOT 6 — item 16: coerce the brand accent. Unknown values fall back to violet.
export function normaliseAccentColor(value: unknown): AccentColorValue {
  return ACCENT_COLORS.includes(value as AccentColorValue) ? (value as AccentColorValue) : DEFAULT_WORKOUT_SETTINGS.accentColor;
}

// Resolves the effective display mode from the stored preference. 'system' is
// resolved against the OS preference so the rest of the app only ever deals
// with an explicit 'dark' | 'light'.
export function resolveThemeMode(mode: ThemeModeValue, prefersLight: boolean): 'dark' | 'light' {
  return mode === 'system' ? (prefersLight ? 'light' : 'dark') : mode;
}

// Browser chrome / PWA theme-color per effective display mode.
export function themeColorFor(resolved: 'dark' | 'light'): string {
  return resolved === 'light' ? '#eef0f4' : '#09090d';
}

// LOT 6 — item 18: normalise the user's dashboard block list. The stored value
// is an ORDERED list of visible block keys. Unknown keys are dropped, duplicates
// removed (first occurrence kept). ONLY when the key is present in the raw
// settings is the result honoured as "the user's dashboard": an absent/invalid
// value means "use the default full dashboard", while an explicit, present
// empty array (the user hid every block) stays empty.
export function normaliseDashboardBlocks(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_DASHBOARD_BLOCKS];
  const seen = new Set<DashboardBlockKey>();
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const key = entry as DashboardBlockKey;
    if (!(DASHBOARD_BLOCK_KEYS as readonly string[]).includes(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

// LOT 6 — item 17: coerce the feedback volume into the [0, 1] window. Anything
// invalid (missing, NaN, Infinity, non-number) falls back to the default 0.8.
export function normaliseFeedbackVolume(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || Number.isNaN(num)) return DEFAULT_WORKOUT_SETTINGS.feedbackVolume;
  return Math.max(0, Math.min(1, num));
}

// LOT 6 — item 17: a feedback CATEGORY groups the sound + vibration cues of one
// event type (set, rest, countdown tick, session completed, new PR). Each
// category has its own ON/OFF preference; the FILE path is enforced at use time
// by feedbackStateFor.
export type FeedbackCategory = 'set' | 'rest' | 'countdown' | 'workoutEnd' | 'record';

const FEEDBACK_TOGGLE_KEY: Record<FeedbackCategory, 'seriesFeedbackEnabled' | 'restFeedbackEnabled' | 'countdownFeedbackEnabled' | 'workoutEndFeedbackEnabled' | 'recordFeedbackEnabled'> = {
  set: 'seriesFeedbackEnabled',
  rest: 'restFeedbackEnabled',
  countdown: 'countdownFeedbackEnabled',
  workoutEnd: 'workoutEndFeedbackEnabled',
  record: 'recordFeedbackEnabled',
};

export type FeedbackPrefs = Pick<
  WorkoutSettings,
  'seriesFeedbackEnabled' | 'restFeedbackEnabled' | 'countdownFeedbackEnabled' | 'workoutEndFeedbackEnabled' | 'recordFeedbackEnabled' | 'feedbackVolume'
>;

export interface FeedbackState {
  sound: boolean;
  vibration: boolean;
  volume: number;
}

// Pure decision helper (unit-testable): whether a cue of the given category may
// emit a sound and/or a vibration right now. `master` carries the EFFECTIVE
// master flags at the call site (guided sessions may have per-session toggles;
// classic mode has its own in-session sound toggle). The category toggle is a
// single switch that gates BOTH channels. Sound additionally needs volume > 0;
// vibration is independent of volume.
export function feedbackStateFor(
  master: { sound?: boolean; vibration?: boolean },
  prefs: FeedbackPrefs,
  category: FeedbackCategory
): FeedbackState {
  const catEnabled = prefs[FEEDBACK_TOGGLE_KEY[category]] === true;
  const volume = normaliseFeedbackVolume(prefs.feedbackVolume);
  const masterSound = master.sound !== false;
  const masterVibration = master.vibration !== false;
  return {
    sound: catEnabled && masterSound && volume > 0,
    vibration: catEnabled && masterVibration,
    volume,
  };
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
  let themeMode: ThemeModeValue = base.themeMode;
  let accentColor: AccentColorValue = base.accentColor;
  let dashboardBlocks: string[] = [...DEFAULT_DASHBOARD_BLOCKS];
  let feedbackVolume = base.feedbackVolume;
  let seriesFeedbackEnabled = base.seriesFeedbackEnabled;
  let restFeedbackEnabled = base.restFeedbackEnabled;
  let countdownFeedbackEnabled = base.countdownFeedbackEnabled;
  let workoutEndFeedbackEnabled = base.workoutEndFeedbackEnabled;
  let recordFeedbackEnabled = base.recordFeedbackEnabled;

  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    if (typeof r.soundEnabled === 'boolean') soundEnabled = r.soundEnabled;
    if (typeof r.voiceEnabled === 'boolean') voiceEnabled = r.voiceEnabled;
    if (typeof r.vibrationEnabled === 'boolean') vibrationEnabled = r.vibrationEnabled;
    if (r.units === 'metric') units = 'metric'; // only metric is supported
    if (typeof r.animationsEnabled === 'boolean') animationsEnabled = r.animationsEnabled;
    if (typeof r.themeMode === 'string') themeMode = normaliseThemeMode(r.themeMode);
    if (typeof r.accentColor === 'string') accentColor = normaliseAccentColor(r.accentColor);
    // dashboardBlocks is only read when the key is really PRESENT so an old
    // settings object (no key) always gets the default full dashboard, while a
    // stored empty array (everything hidden) is a legitimate user choice.
    if ('dashboardBlocks' in r) dashboardBlocks = normaliseDashboardBlocks(r.dashboardBlocks);
    // LOT 6 — item 17: new feedback fields are all optional; old/foreign settings
    // without them keep the defaults (failure here only degrades to a missing cue).
    if ('feedbackVolume' in r) feedbackVolume = normaliseFeedbackVolume(r.feedbackVolume);
    if (typeof r.seriesFeedbackEnabled === 'boolean') seriesFeedbackEnabled = r.seriesFeedbackEnabled;
    if (typeof r.restFeedbackEnabled === 'boolean') restFeedbackEnabled = r.restFeedbackEnabled;
    if (typeof r.countdownFeedbackEnabled === 'boolean') countdownFeedbackEnabled = r.countdownFeedbackEnabled;
    if (typeof r.workoutEndFeedbackEnabled === 'boolean') workoutEndFeedbackEnabled = r.workoutEndFeedbackEnabled;
    if (typeof r.recordFeedbackEnabled === 'boolean') recordFeedbackEnabled = r.recordFeedbackEnabled;
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
    themeMode,
    accentColor,
    dashboardBlocks,
    feedbackVolume,
    seriesFeedbackEnabled,
    restFeedbackEnabled,
    countdownFeedbackEnabled,
    workoutEndFeedbackEnabled,
    recordFeedbackEnabled,
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
  return { ...DEFAULT_WORKOUT_SETTINGS, dashboardBlocks: [...DEFAULT_DASHBOARD_BLOCKS] };
}

// Convenience single-call used by the guided engine & any consumer that just
// needs the effective settings. Named to match the expected read-layer API.
export function getWorkoutSettings(adapter: SettingsAdapter = getSettingsStorage()): WorkoutSettings {
  return loadWorkoutSettings(adapter);
}
