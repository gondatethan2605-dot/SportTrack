import assert from 'node:assert/strict';
import {
  DEFAULT_WORKOUT_SETTINGS,
  loadWorkoutSettings,
  updateWorkoutSettings,
  resetWorkoutSettings,
  getWorkoutSettings,
  normaliseWorkoutSettings,
  normaliseDefaultRestSec,
  guidedSettingsFromWorkoutSettings,
  normaliseDashboardBlocks,
  normaliseThemeMode,
  normaliseAccentColor,
  normaliseFeedbackVolume,
  feedbackStateFor,
  FeedbackCategory,
  resolveThemeMode,
  themeColorFor,
  THEME_MODES,
  ACCENT_COLORS,
  DASHBOARD_BLOCK_KEYS,
  DEFAULT_DASHBOARD_BLOCKS,
  DASHBOARD_BLOCK_LABELS,
  SETTINGS_STORAGE_KEY,
  __setSettingsStorage,
  SettingsAdapter,
} from '../src/utilsSettings';

let passed = 0;
let failed = 0;
function ok(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL  ${name}`);
    console.error('      ', (e as Error).message);
    process.exitCode = 1;
  }
}

// In-memory storage adapter used in place of window.localStorage.
function makeStore(): { adapter: SettingsAdapter; data: Record<string, string> } {
  const data: Record<string, string> = {};
  const adapter: SettingsAdapter = {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v; },
    removeItem: (k: string) => { delete data[k]; },
  };
  return { adapter, data };
}

// Clean up any module-level storage override between tests.
function withStore(fn: () => void) {
  const { adapter, data } = makeStore();
  __setSettingsStorage(adapter);
  try { fn(); } finally { __setSettingsStorage(null); }
  return data;
}

// 13. absence de NaN / 14. absence d'Infinity are checked across all outputs.
function assertNoNaNInf(value: unknown, label: string) {
  assert.ok(!Number.isNaN(Number(value)), `${label} should not be NaN`);
  assert.ok(Number.isFinite(Number(value)) || value === null, `${label} should not be Infinity`);
}

function assertSafe(settings: { defaultRestSec: number; exerciseTransitionRestSec?: number }) {
  assertNoNaNInf(settings.defaultRestSec, 'defaultRestSec');
  assert.ok(Number.isFinite(settings.defaultRestSec) && settings.defaultRestSec > 0, 'defaultRestSec finite/positive');
  if (settings.exerciseTransitionRestSec !== undefined) {
    assertNoNaNInf(settings.exerciseTransitionRestSec, 'exerciseTransitionRestSec');
    assert.ok(
      Number.isFinite(settings.exerciseTransitionRestSec) && settings.exerciseTransitionRestSec > 0,
      'exerciseTransitionRestSec finite/positive'
    );
  }
}

ok('1. valeurs par défaut', () => {
  assert.deepEqual({ ...DEFAULT_WORKOUT_SETTINGS }, {
    soundEnabled: true,
    voiceEnabled: true,
    vibrationEnabled: true,
    defaultRestSec: 30,
    exerciseTransitionRestSec: 30,
    units: 'metric',
    animationsEnabled: true,
    themeMode: 'dark',
    accentColor: 'violet',
    dashboardBlocks: [...DASHBOARD_BLOCK_KEYS],
    feedbackVolume: 0.8,
    seriesFeedbackEnabled: true,
    restFeedbackEnabled: true,
    countdownFeedbackEnabled: true,
    workoutEndFeedbackEnabled: true,
    recordFeedbackEnabled: true,
  });
});

// LOT 6 item 16 — mode/apparence
ok('1c. modes & accents supportés (listes pures)', () => {
  assert.deepEqual([...THEME_MODES], ['dark', 'light', 'system']);
  assert.deepEqual([...ACCENT_COLORS], ['violet', 'blue', 'green', 'orange', 'red', 'rose']);
});

ok('1d. blocs du dashboard : 9 blocs ordonnés + labels', () => {
  assert.deepEqual([...DASHBOARD_BLOCK_KEYS], [
    'next-session', 'recommendation', 'weekly', 'stats',
    'streak', 'level', 'volume', 'badges', 'records',
  ]);
  assert.equal(DASHBOARD_BLOCK_KEYS.length, 9);
  for (const key of DASHBOARD_BLOCK_KEYS) {
    assert.ok(DASHBOARD_BLOCK_LABELS[key], `label présent pour ${key}`);
  }
  assert.deepEqual([...DEFAULT_DASHBOARD_BLOCKS], [...DASHBOARD_BLOCK_KEYS]);
});

ok('1b. valeurs par défaut via lecture (storage vide)', () => {
  withStore(() => {
    const s = loadWorkoutSettings();
    assert.equal(s.soundEnabled, true);
    assert.equal(s.voiceEnabled, true);
    assert.equal(s.vibrationEnabled, true);
    assert.equal(s.defaultRestSec, 30);
    assert.equal(s.exerciseTransitionRestSec, 30);
    assert.equal(s.units, 'metric');
    assert.equal(s.themeMode, 'dark');
    assert.equal(s.accentColor, 'violet');
    assert.deepEqual([...s.dashboardBlocks], [...DASHBOARD_BLOCK_KEYS]);
    assert.equal(s.feedbackVolume, 0.8);
    assert.equal(s.seriesFeedbackEnabled, true);
    assert.equal(s.restFeedbackEnabled, true);
    assert.equal(s.countdownFeedbackEnabled, true);
    assert.equal(s.workoutEndFeedbackEnabled, true);
    assert.equal(s.recordFeedbackEnabled, true);
    assertSafe(s);
  });
});

ok('1e. thème: valeurs valides conservées', () => {
  for (const m of THEME_MODES) assert.equal(normaliseThemeMode(m), m, `mode ${m}`);
  for (const c of ACCENT_COLORS) assert.equal(normaliseAccentColor(c), c, `accent ${c}`);
});

ok('1f. thème: valeurs inconnues → défauts', () => {
  assert.equal(normaliseThemeMode('sepia'), 'dark');
  assert.equal(normaliseThemeMode(42), 'dark');
  assert.equal(normaliseThemeMode(undefined), 'dark');
  assert.equal(normaliseAccentColor('cyan'), 'violet');
  assert.equal(normaliseAccentColor(null), 'violet');
});

ok('1g. resolveThemeMode: résolution système', () => {
  assert.equal(resolveThemeMode('dark', true), 'dark');
  assert.equal(resolveThemeMode('dark', false), 'dark');
  assert.equal(resolveThemeMode('light', false), 'light');
  assert.equal(resolveThemeMode('system', true), 'light');
  assert.equal(resolveThemeMode('system', false), 'dark');
});

ok('1h. themeColorFor: chrome navigateur par mode', () => {
  assert.equal(themeColorFor('dark'), '#09090d');
  assert.equal(themeColorFor('light'), '#eef0f4');
});

ok('1i. dashboard: ordre personnalisé conservé', () => {
  const custom = ['records', 'stats', 'streak'];
  assert.deepEqual(normaliseDashboardBlocks(custom), custom);
});

ok('1j. dashboard: dédoublonnage & clés inconnues retirées', () => {
  assert.deepEqual(normaliseDashboardBlocks(['streak', 'bogus', 'streak', 'stats', 42]), ['streak', 'stats']);
});

ok('1k. dashboard: absent/invalide → liste par défaut complète', () => {
  assert.deepEqual(normaliseDashboardBlocks(undefined), [...DASHBOARD_BLOCK_KEYS]);
  assert.deepEqual(normaliseDashboardBlocks(null), [...DASHBOARD_BLOCK_KEYS]);
  assert.deepEqual(normaliseDashboardBlocks('x'), [...DASHBOARD_BLOCK_KEYS]);
  assert.deepEqual(normaliseDashboardBlocks({ a: 1 }), [...DASHBOARD_BLOCK_KEYS]);
});

ok('1l. dashboard: liste vide explicite conservée (tout masqué)', () => {
  assert.deepEqual(normaliseDashboardBlocks([]), []);
  const s = normaliseWorkoutSettings({ dashboardBlocks: [] });
  assert.deepEqual([...s.dashboardBlocks], []);
  const t = normaliseWorkoutSettings({});
  assert.deepEqual([...t.dashboardBlocks], [...DASHBOARD_BLOCK_KEYS], 'clé absente → défaut');
});

ok('1m. thème: persisté et relu', () => {
  withStore(() => {
    let s = updateWorkoutSettings({ themeMode: 'system', accentColor: 'rose', dashboardBlocks: ['volume', 'stats'] });
    assert.equal(s.themeMode, 'system');
    assert.equal(s.accentColor, 'rose');
    assert.deepEqual([...s.dashboardBlocks], ['volume', 'stats']);
    s = loadWorkoutSettings();
    assert.equal(s.themeMode, 'system');
    assert.equal(s.accentColor, 'rose');
    assert.deepEqual([...s.dashboardBlocks], ['volume', 'stats']);
    assertSafe(s);
  });
});

ok('1n. reset → thème & dashboard aux défauts', () => {
  withStore(() => {
    updateWorkoutSettings({ themeMode: 'light', accentColor: 'green', dashboardBlocks: ['streak'] });
    const s = resetWorkoutSettings();
    assert.equal(s.themeMode, 'dark');
    assert.equal(s.accentColor, 'violet');
    assert.deepEqual([...s.dashboardBlocks], [...DASHBOARD_BLOCK_KEYS]);
  });
});

// LOT 6 item 17 — sons & vibrations
ok('1o. volume: bornes 0..1 & valeurs invalides → défaut', () => {
  assert.equal(normaliseFeedbackVolume(1), 1);
  assert.equal(normaliseFeedbackVolume(0), 0);
  assert.equal(normaliseFeedbackVolume(0.5), 0.5);
  assert.equal(normaliseFeedbackVolume(1.5), 1);
  assert.equal(normaliseFeedbackVolume(-0.2), 0);
  assert.equal(normaliseFeedbackVolume(Number.NaN), 0.8);
  assert.equal(normaliseFeedbackVolume(Number.POSITIVE_INFINITY), 0.8);
  assert.equal(normaliseFeedbackVolume('abc' as unknown as number), 0.8);
  assert.equal(normaliseFeedbackVolume(undefined), 0.8);
});

ok('1p. feedbacks par événement: valeurs valides conservées', () => {
  withStore(() => {
    const s = updateWorkoutSettings({
      seriesFeedbackEnabled: false,
      restFeedbackEnabled: false,
      countdownFeedbackEnabled: false,
      workoutEndFeedbackEnabled: false,
      recordFeedbackEnabled: false,
      feedbackVolume: 0.4,
    });
    assert.equal(s.seriesFeedbackEnabled, false);
    assert.equal(s.restFeedbackEnabled, false);
    assert.equal(s.countdownFeedbackEnabled, false);
    assert.equal(s.workoutEndFeedbackEnabled, false);
    assert.equal(s.recordFeedbackEnabled, false);
    assert.equal(s.feedbackVolume, 0.4);
    const reloaded = loadWorkoutSettings();
    assert.equal(reloaded.recordFeedbackEnabled, false);
    assert.equal(reloaded.feedbackVolume, 0.4);
    assertSafe(reloaded);
  });
});

ok('1q. feedbacks: valeurs invalides/inconnues → défauts (anciens settings)', () => {
  const n = normaliseWorkoutSettings({
    soundEnabled: false,
    seriesFeedbackEnabled: 'oui',
    recordFeedbackEnabled: 1,
    feedbackVolume: {},
  });
  assert.equal(n.seriesFeedbackEnabled, true);
  assert.equal(n.recordFeedbackEnabled, true);
  assert.equal(n.feedbackVolume, 0.8);
  assert.equal(n.soundEnabled, false, 'legacy sound toggle preserved');
  // Old settings (no new keys at all) keep everything ON by default.
  const legacy = normaliseWorkoutSettings({ soundEnabled: true, vibrationEnabled: true });
  assert.equal(legacy.seriesFeedbackEnabled, true);
  assert.equal(legacy.restFeedbackEnabled, true);
  assert.equal(legacy.countdownFeedbackEnabled, true);
  assert.equal(legacy.workoutEndFeedbackEnabled, true);
  assert.equal(legacy.recordFeedbackEnabled, true);
  assert.equal(legacy.feedbackVolume, 0.8);
});

ok('1r. feedbackStateFor: toutes les combinaisons de portes', () => {
  const prefs = {
    seriesFeedbackEnabled: true,
    restFeedbackEnabled: true,
    countdownFeedbackEnabled: true,
    workoutEndFeedbackEnabled: true,
    recordFeedbackEnabled: true,
    feedbackVolume: 0.8,
  };
  // Categorie + canaux actifs → tout passe.
  let s = feedbackStateFor({ sound: true, vibration: true }, prefs, 'set');
  assert.equal(s.sound, true);
  assert.equal(s.vibration, true);
  assert.equal(s.volume, 0.8);
  // Son maître coupé → plus de son, vibration conservée.
  s = feedbackStateFor({ sound: false, vibration: true }, prefs, 'rest');
  assert.equal(s.sound, false);
  assert.equal(s.vibration, true);
  // Vibration maître coupée → plus de vibration, son conservé.
  s = feedbackStateFor({ sound: true, vibration: false }, prefs, 'workoutEnd');
  assert.equal(s.sound, true);
  assert.equal(s.vibration, false);
  // Categorie coupée → les deux canaux coupés.
  s = feedbackStateFor({ sound: true, vibration: true }, { ...prefs, seriesFeedbackEnabled: false }, 'set');
  assert.equal(s.sound, false);
  assert.equal(s.vibration, false);
  // Volume 0 → pas de son (la vibration reste possible).
  s = feedbackStateFor({ sound: true, vibration: true }, { ...prefs, feedbackVolume: 0 }, 'record');
  assert.equal(s.sound, false);
  assert.equal(s.vibration, true);
  assert.equal(s.volume, 0);
  // Maître absent (undefined) → considéré actif.
  s = feedbackStateFor({ sound: undefined, vibration: undefined }, prefs, 'countdown');
  assert.equal(s.sound, true);
  assert.equal(s.vibration, true);
  // Volume hors bornes → borné par la normalisation.
  s = feedbackStateFor({ sound: true, vibration: true }, { ...prefs, feedbackVolume: 3 }, 'countdown');
  assert.equal(s.volume, 1);
  s = feedbackStateFor({ sound: true, vibration: true }, { ...prefs, feedbackVolume: -1 }, 'countdown');
  assert.equal(s.volume, 0);
  assert.equal(s.sound, false);
  // Les 5 catégories se mappent sur les 5 toggles attendus.
  const cat: FeedbackCategory[] = ['set', 'rest', 'countdown', 'workoutEnd', 'record'];
  for (const c of cat) {
    const all = { seriesFeedbackEnabled: true, restFeedbackEnabled: true, countdownFeedbackEnabled: true, workoutEndFeedbackEnabled: true, recordFeedbackEnabled: true, feedbackVolume: 0.5 };
    assert.ok(feedbackStateFor({ sound: true, vibration: true }, all, c).sound, c);
  }
});

ok('1s. feedbacks: persistés, puis reset → défauts', () => {
  withStore(() => {
    updateWorkoutSettings({ feedbackVolume: 0.25, recordFeedbackEnabled: false, countdownFeedbackEnabled: false });
    const reset = resetWorkoutSettings();
    assert.equal(reset.feedbackVolume, 0.8);
    assert.equal(reset.recordFeedbackEnabled, true);
    assert.equal(reset.countdownFeedbackEnabled, true);
    const reloaded = loadWorkoutSettings();
    assert.equal(reloaded.feedbackVolume, 0.8);
    assert.equal(reloaded.recordFeedbackEnabled, true);
  });
});

ok('2. lecture d\'une valeur persistée', () => {
  const data = withStore(() => {
    updateWorkoutSettings({ soundEnabled: false, defaultRestSec: 90 });
    const s = loadWorkoutSettings();
    assert.equal(s.soundEnabled, false);
    assert.equal(s.defaultRestSec, 90);
    assertSafe(s);
  });
  assert.ok(data[SETTINGS_STORAGE_KEY], 'storage key written');
  assert.ok(data[SETTINGS_STORAGE_KEY].includes('"soundEnabled":false'), 'persisted JSON has soundEnabled false');
});

ok('3. sauvegarde persistée dans la clé', () => {
  const data = withStore(() => {
    updateWorkoutSettings({ voiceEnabled: false });
  });
  assert.ok(SETTINGS_STORAGE_KEY in data, 'key sporttrack-settings written');
});

ok('4. modification sound', () => {
  withStore(() => {
    let s = updateWorkoutSettings({ soundEnabled: false });
    assert.equal(s.soundEnabled, false);
    s = loadWorkoutSettings();
    assert.equal(s.soundEnabled, false);
    assertSafe(s);
  });
});

ok('5. modification voice', () => {
  withStore(() => {
    let s = updateWorkoutSettings({ voiceEnabled: false });
    assert.equal(s.voiceEnabled, false);
    s = loadWorkoutSettings();
    assert.equal(s.voiceEnabled, false);
    assertSafe(s);
  });
});

ok('6. modification vibration', () => {
  withStore(() => {
    let s = updateWorkoutSettings({ vibrationEnabled: false });
    assert.equal(s.vibrationEnabled, false);
    s = loadWorkoutSettings();
    assert.equal(s.vibrationEnabled, false);
    assertSafe(s);
  });
});

ok('7. modification repos', () => {
  withStore(() => {
    let s = updateWorkoutSettings({ defaultRestSec: 60 });
    assert.equal(s.defaultRestSec, 60);
    s = loadWorkoutSettings();
    assert.equal(s.defaultRestSec, 60);
    assertSafe(s);
  });
});

ok('7b. repos: valeurs de liste supportées', () => {
  withStore(() => {
    for (const v of [15, 30, 45, 60, 75, 90, 120]) {
      const s = updateWorkoutSettings({ defaultRestSec: v });
      assert.equal(s.defaultRestSec, v, `rest ${v} kept`);
      assertSafe(s);
    }
  });
});

ok('7c. repos entre exercices: valeurs de liste supportées', () => {
  withStore(() => {
    for (const v of [15, 30, 45, 60, 75, 90, 120]) {
      const s = updateWorkoutSettings({ exerciseTransitionRestSec: v });
      assert.equal(s.exerciseTransitionRestSec, v, `transition rest ${v} kept`);
      assert.equal(s.defaultRestSec, 30, 'defaultRestSec untouched');
      assertSafe(s);
    }
  });
});

ok('7d. repos entre exercices: persisté et relu', () => {
  withStore(() => {
    let s = updateWorkoutSettings({ exerciseTransitionRestSec: 60 });
    assert.equal(s.exerciseTransitionRestSec, 60);
    s = loadWorkoutSettings();
    assert.equal(s.exerciseTransitionRestSec, 60);
    assertSafe(s);
  });
});

ok('7e. repos entre exercices: invalides → par défaut', () => {
  withStore(() => {
    const s = updateWorkoutSettings({ exerciseTransitionRestSec: 'abc' as unknown as number });
    assert.equal(s.exerciseTransitionRestSec, 30);
    const n = normaliseWorkoutSettings({ exerciseTransitionRestSec: -5 });
    assert.equal(n.exerciseTransitionRestSec, 30);
    const m = normaliseWorkoutSettings({ exerciseTransitionRestSec: NaN });
    assert.equal(m.exerciseTransitionRestSec, 30);
    const i = normaliseWorkoutSettings({ exerciseTransitionRestSec: Infinity });
    assert.equal(i.exerciseTransitionRestSec, 30);
    assertSafe(n);
    assertSafe(m);
    assertSafe(i);
  });
});

ok('7f. repos entre exercices: absence → par défaut dans les deux sens', () => {
  withStore(() => {
    const n = normaliseWorkoutSettings({});
    assert.equal(n.exerciseTransitionRestSec, 30);
    // un update ciblé (repos par défaut) ne modifie pas le repos entre exercices
    const s = updateWorkoutSettings({ defaultRestSec: 90 });
    assert.equal(s.exerciseTransitionRestSec, 30);
    assertSafe(s);
  });
});

ok('8. modification unités (uniquement métrique)', () => {
  withStore(() => {
    const s = updateWorkoutSettings({ units: 'metric' });
    assert.equal(s.units, 'metric');
    // non-metric is not supported and must be normalised back to metric
    const n = normaliseWorkoutSettings({ units: 'imperial' });
    assert.equal(n.units, 'metric');
    assertSafe(n);
  });
});

ok('9. valeurs invalides → par défaut', () => {
  withStore(() => {
    const s = updateWorkoutSettings({ defaultRestSec: 'abc' as unknown as number });
    assert.equal(s.defaultRestSec, 30);
    assertSafe(s);
    const n = normaliseWorkoutSettings({ soundEnabled: 'yes', defaultRestSec: -5 });
    assert.equal(n.soundEnabled, true);
    assert.equal(n.defaultRestSec, 30);
    assertSafe(n);
  });
});

ok('9b. valeurs invalides (NaN, Infinity) → par défaut', () => {
  withStore(() => {
    const n = normaliseWorkoutSettings({ defaultRestSec: NaN });
    assert.equal(n.defaultRestSec, 30);
    const m = normaliseWorkoutSettings({ defaultRestSec: Infinity });
    assert.equal(m.defaultRestSec, 30);
    assertSafe(n);
    assertSafe(m);
  });
});

ok('10. valeurs manquantes → par défaut', () => {
  withStore(() => {
    const n = normaliseWorkoutSettings({});
    assert.deepEqual({ ...n }, { ...DEFAULT_WORKOUT_SETTINGS });
    assertSafe(n);
    // partial update keeps the untouched fields
    const p = updateWorkoutSettings({ soundEnabled: false });
    assert.equal(p.voiceEnabled, true);
    assert.equal(p.vibrationEnabled, true);
    assert.equal(p.defaultRestSec, 30);
    assertSafe(p);
  });
});

ok('11. valeurs anciennes/incompatibles → par défaut', () => {
  withStore(() => {
    // Legacy shape: guided-only fields, no workout preference fields.
    const legacy = JSON.stringify({ soundEnabled: true, vibrationEnabled: true, voiceEnabled: true, countdownEnabled: true, musicEnabled: false });
    const { adapter, data } = makeStore();
    __setSettingsStorage(adapter);
    data[SETTINGS_STORAGE_KEY] = legacy;
    const s = loadWorkoutSettings();
    assert.equal(s.soundEnabled, true);
    assert.equal(s.vibrationEnabled, true);
    assert.equal(s.voiceEnabled, true);
    assert.equal(s.units, 'metric');
    assert.equal(s.defaultRestSec, 30);
    assertSafe(s);
    __setSettingsStorage(null);
  });
});

ok('11b. JSON corrompu → défaut sans erreur', () => {
  withStore(() => {
    const { adapter, data } = makeStore();
    __setSettingsStorage(adapter);
    data[SETTINGS_STORAGE_KEY] = '{not valid json';
    const s = loadWorkoutSettings();
    assert.equal(s.soundEnabled, true);
    assertSafe(s);
    __setSettingsStorage(null);
  });
});

ok('12. reset → retour aux valeurs par défaut', () => {
  withStore(() => {
    updateWorkoutSettings({ soundEnabled: false, voiceEnabled: false, defaultRestSec: 120 });
    const s = resetWorkoutSettings();
    assert.deepEqual({ ...s }, { ...DEFAULT_WORKOUT_SETTINGS });
    const reloaded = loadWorkoutSettings();
    assert.deepEqual({ ...reloaded }, { ...DEFAULT_WORKOUT_SETTINGS });
    assertSafe(reloaded);
  });
});

ok('12b. reset ne supprime que la clé de réglages', () => {
  const data = withStore(() => {
    updateWorkoutSettings({ soundEnabled: false });
    resetWorkoutSettings();
  });
  assert.ok(!(SETTINGS_STORAGE_KEY in data), 'settings key removed');
  // Nothing else should have been touched (no IndexedDB involvement here).
  assert.deepEqual(Object.keys(data).length, 0, 'no other localStorage keys created');
});

ok('13. absence de NaN (sorties pures)', () => {
  withStore(() => {
    const s = loadWorkoutSettings();
    assertNoNaNInf(s.defaultRestSec, 'defaultRestSec');
    const n = normaliseWorkoutSettings({ defaultRestSec: NaN });
    assertNoNaNInf(n.defaultRestSec, 'defaultRestSec normalisé');
  });
});

ok('14. absence d\'Infinity (sorties pures)', () => {
  withStore(() => {
    const s = loadWorkoutSettings();
    assertNoNaNInf(s.defaultRestSec, 'defaultRestSec');
    const n = normaliseWorkoutSettings({ defaultRestSec: Infinity });
    assertNoNaNInf(n.defaultRestSec, 'defaultRestSec normalisé');
  });
});

ok('getWorkoutSettings() renvoie l\'état effectif', () => {
  withStore(() => {
    updateWorkoutSettings({ soundEnabled: false });
    const s = getWorkoutSettings();
    assert.equal(s.soundEnabled, false);
    assertSafe(s);
  });
});

ok('guidedSettingsFromWorkoutSettings mappe les 3 réglages', () => {
  const g = guidedSettingsFromWorkoutSettings({ ...DEFAULT_WORKOUT_SETTINGS }, true, false, 0.6);
  assert.equal(g.soundEnabled, true);
  assert.equal(g.voiceEnabled, true);
  assert.equal(g.vibrationEnabled, true);
  assert.equal(g.countdownEnabled, true);
  assert.equal(g.musicEnabled, false);
  assert.equal(g.musicVolume, 0.6);
  assert.equal(g.exerciseTransitionRestSec, 30);
  const off = guidedSettingsFromWorkoutSettings({ ...DEFAULT_WORKOUT_SETTINGS, soundEnabled: false, voiceEnabled: false, vibrationEnabled: false });
  assert.equal(off.soundEnabled, false);
  assert.equal(off.voiceEnabled, false);
  assert.equal(off.vibrationEnabled, false);
  const tr = guidedSettingsFromWorkoutSettings({ ...DEFAULT_WORKOUT_SETTINGS, exerciseTransitionRestSec: 120 });
  assert.equal(tr.exerciseTransitionRestSec, 120);
});

ok('normaliseDefaultRestSec: bornes & arrondi au plus proche', () => {
  assert.equal(normaliseDefaultRestSec(30), 30);
  assert.equal(normaliseDefaultRestSec(60), 60);
  assert.equal(normaliseDefaultRestSec(0), 30); // invalid -> default
  assert.equal(normaliseDefaultRestSec(-10), 30); // invalid -> default
  assert.equal(normaliseDefaultRestSec('35' as unknown as number), 30); // snaps to 30
  assert.equal(normaliseDefaultRestSec('75' as unknown as number), 75);
  assert.equal(normaliseDefaultRestSec(Number.NaN), 30);
  assert.equal(normaliseDefaultRestSec(Number.POSITIVE_INFINITY), 30);
});

console.log(`\n===== RÉSUMÉ =====`);
console.log(`${passed}/${passed + failed} PASS`);
