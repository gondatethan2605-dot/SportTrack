import assert from 'node:assert/strict';
import {
  buildQuickSessionPlan,
  QUICK_SESSION_PRESETS,
  isQuickSessionMinutes,
} from '../src/utilsQuickSession';

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

ok('presets are 10/20/30 minutes only', () => {
  assert.deepEqual([...QUICK_SESSION_PRESETS], [10, 20, 30]);
  assert.equal(isQuickSessionMinutes(15), false);
  assert.equal(isQuickSessionMinutes(20), true);
});

for (const m of QUICK_SESSION_PRESETS) {
  ok(`plan ${m} min: day built with title, configs, ids, stretches`, () => {
    const { day, title } = buildQuickSessionPlan(m);
    assert.equal(day.name, `Séance rapide — ${m} min`);
    assert.equal(title, day.name);
    assert.ok(day.exercises.length > 0);
    assert.ok(day.exercises.length <= { 10: 3, 20: 4, 30: 5 }[m]);
    assert.equal(day.exerciseIds.length, day.exercises.length);
    assert.ok(day.stretches.length > 0);
    assert.ok(day.notes);
  });

  ok(`plan ${m} min: synthetic day is NOT persisted-marked (no program ref)`, () => {
    const { day } = buildQuickSessionPlan(m);
    // The day payload must carry nothing that could be mistaken for a real
    // calendar entry: it is purely a launch payload.
    assert.equal(day.id.startsWith('quick-'), true);
  });
}

ok('every cfg has a working reps/timer shape (dimension preserved)', () => {
  for (const m of QUICK_SESSION_PRESETS) {
    for (const cfg of buildQuickSessionPlan(m).day.exercises) {
      if (cfg.mode === 'reps') {
        assert.equal(Number(cfg.reps) > 0, true, `reps cfg ${cfg.exerciseId}`);
        assert.equal(cfg.durationSec, 0, `timer fields cleared for ${cfg.exerciseId}`);
      } else {
        assert.equal(cfg.durationSec > 0, true, `timer cfg ${cfg.exerciseId}`);
        assert.equal(Number(cfg.reps), 0, `reps cleared for ${cfg.exerciseId}`);
      }
    }
  }
});

ok('default muscle groups per duration are applied', () => {
  assert.deepEqual(buildQuickSessionPlan(10).day.muscleGroups, ['Pectoraux']);
  assert.deepEqual(buildQuickSessionPlan(30).day.muscleGroups, ['Jambes', 'Pectoraux', 'Dos']);
});

ok('absence de données: structured output never NaN/Infinity', () => {
  for (const m of QUICK_SESSION_PRESETS) {
    const day = buildQuickSessionPlan(m).day;
    assert.ok(Number.isFinite(day.exercises.length));
    for (const cfg of day.exercises) {
      assert.ok(Number.isFinite(Number(cfg.sets)), `sets finite ${cfg.exerciseId}`);
      assert.ok(Number.isFinite(Number(cfg.restSec)), `restSec finite ${cfg.exerciseId}`);
      if (cfg.mode === 'reps') assert.ok(Number.isFinite(Number(cfg.reps)), `reps finite ${cfg.exerciseId}`);
      else assert.ok(Number.isFinite(cfg.durationSec), `duration finite ${cfg.exerciseId}`);
    }
    for (const s of day.stretches) {
      assert.ok(Number.isFinite(s.durationSec), `stretch finite ${s.id}`);
    }
  }
});

ok('stable shape: config ids unique and day id prefixed quick-', () => {
  const { day } = buildQuickSessionPlan(20);
  const ids = day.exercises.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, 'unique ids');
  assert.equal(day.id.startsWith('quick-'), true);
  for (const c of day.exercises) {
    assert.equal(c.id.startsWith('quick-'), true);
  }
});

console.log(`\n${passed} tests PASS, ${failed} FAIL`);
if (failed > 0) process.exitCode = 1;