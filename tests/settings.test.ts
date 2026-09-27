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
  });
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
    assertSafe(s);
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
