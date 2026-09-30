import assert from 'node:assert/strict';
import {
  Goal,
  WorkoutSession,
  UserProfile,
  PersonalRecord,
  ExercisePerformance,
  ExerciseBest,
  BodyMeasurement,
} from '../src/types';
import {
  goalProgress,
  goalDirection,
  goalReachedFor,
  GoalProgress,
  GoalContext,
  computeGoalCurrentValue,
  buildGoalHistory,
  goalValueText,
  goalMetricLabel,
  goalMetricFromCategory,
  goalUnitSuffix,
  validateGoalForm,
  GOAL_METRICS,
  buildBlockBar,
} from '../src/utilsGoals';
import { totalXpFromProfile, computeLevelFromXp } from '../src/utilsLevels';
import { computeSessionXp } from '../src/utilsXp';

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

const todayStr = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

// A goal factory: direction matters.
function goal(partial: Partial<Goal> & { direction: 'gain' | 'perte'; initialValue: number; targetValue: number; currentValue: number }): Goal {
  return {
    id: 'g1',
    title: 'Test',
    category: 'custom',
    unit: '',
    completed: false,
    createdAt: todayStr(),
    ...partial,
  };
}

function ctx(partial?: Partial<GoalContext>): GoalContext {
  const profile: UserProfile = {
    name: '',
    level: 1,
    currentXp: 1500,
    nextLevelXp: 2000,
    streakDays: 0,
    bestStreak: 0,
    weeklyTargetSessions: 3,
    weeklyCompletedSessions: 0,
    totalWorkouts: 0,
    totalVolumeKg: 0,
    joinedDate: todayStr(),
  };
  return {
    sessions: [],
    profile,
    records: [],
    exercisePerformances: [],
    exerciseBests: [],
    measurements: [],
    ...partial,
  };
}

function session(id: string, date: string): WorkoutSession {
  return {
    id,
    title: `S ${id}`,
    date,
    startTime: '18:00',
    durationMinutes: 30,
    completed: true,
    totalVolumeKg: 0,
    stretchesCount: 0,
    exercises: [],
  };
}

function perf(exerciseId: string, name: string, date: string, mode: 'reps' | 'timer', totalReps: number, totalDurationSec = 0): ExercisePerformance {
  return {
    id: `${date}-${exerciseId}`,
    exerciseId,
    exerciseName: name,
    sessionId: `s-${date}`,
    sessionTitle: `S ${date}`,
    date,
    mode,
    setsPlanned: 1,
    setsCompleted: 1,
    totalReps,
    totalDurationSec,
    totalVolumeKg: 0,
    weightUsedKg: 0,
    sets: [
      {
        setNumber: 1,
        weightKg: 0,
        reps: mode === 'timer' ? 0 : totalReps,
        mode,
        durationSec: mode === 'timer' ? totalDurationSec : 0,
        completed: true,
      },
    ],
    bestSet: {
      setNumber: 1,
      weightKg: 0,
      reps: mode === 'timer' ? 0 : totalReps,
      durationSec: mode === 'timer' ? totalDurationSec : undefined,
    },
  };
}

function best(exerciseId: string, name: string, bestReps: number | null, bestDuration: number | null, date: string): ExerciseBest {
  return {
    exerciseId,
    exerciseName: name,
    bestWeightKg: null,
    bestReps: bestReps != null ? { value: bestReps, date } : null,
    bestVolumeKg: null,
    bestDurationSec: bestDuration != null ? { value: bestDuration, date } : null,
    lastPerformedDate: date,
    timesPerformed: 1,
    updatedAt: `${date}T00:00:00`,
  };
}

// ------------------------------------------------- GAIN / PERDU progression ----
ok('gain 0%', () => {
  const g = goal({ direction: 'gain', initialValue: 10, targetValue: 20, currentValue: 10 });
  const p = goalProgress(g);
  assert.equal(p.percent, 0);
  assert.equal(p.status, 'Actif');
});
ok('gain 50%', () => {
  const g = goal({ direction: 'gain', initialValue: 10, targetValue: 20, currentValue: 15 });
  assert.equal(goalProgress(g).percent, 50);
});
ok('gain 100%', () => {
  const g = goal({ direction: 'gain', initialValue: 10, targetValue: 20, currentValue: 20 });
  const p = goalProgress(g);
  assert.equal(p.percent, 100);
  assert.equal(p.status, 'Atteint');
});
ok('gain > cible → clamp 100%', () => {
  const g = goal({ direction: 'gain', initialValue: 10, targetValue: 20, currentValue: 25 });
  assert.equal(goalProgress(g).percent, 100);
});
ok('perte 0%', () => {
  const g = goal({ direction: 'perte', initialValue: 100, targetValue: 80, currentValue: 100 });
  assert.equal(goalProgress(g).percent, 0);
});
ok('perte 50%', () => {
  const g = goal({ direction: 'perte', initialValue: 100, targetValue: 80, currentValue: 90 });
  assert.equal(goalProgress(g).percent, 50);
});
ok('perte 100%', () => {
  const g = goal({ direction: 'perte', initialValue: 100, targetValue: 80, currentValue: 80 });
  const p = goalProgress(g);
  assert.equal(p.percent, 100);
  assert.equal(p.status, 'Atteint');
});
ok('perte < cible → clamp 100%', () => {
  const g = goal({ direction: 'perte', initialValue: 100, targetValue: 80, currentValue: 70 });
  assert.equal(goalProgress(g).percent, 100);
});
ok('initial === target (gain)', () => {
  const g = goal({ direction: 'gain', initialValue: 20, targetValue: 20, currentValue: 15 });
  const p = goalProgress(g);
  assert.ok(Number.isFinite(p.percent));
  assert.equal(p.percent, 0); // 15 < 20 → not reached → 0
});
ok('initial === target (perte)', () => {
  const g = goal({ direction: 'perte', initialValue: 20, targetValue: 20, currentValue: 25 });
  const p = goalProgress(g);
  assert.ok(Number.isFinite(p.percent));
  assert.equal(p.percent, 0); // 25 > 20 → not reached → 0
});
ok('valeur restante gain', () => {
  const g = goal({ direction: 'gain', initialValue: 10, targetValue: 50, currentValue: 35 });
  assert.equal(goalProgress(g).remaining, 15);
});
ok('valeur restante perte', () => {
  const g = goal({ direction: 'perte', initialValue: 90, targetValue: 50, currentValue: 65 });
  assert.equal(goalProgress(g).remaining, 15);
});
ok('reste 0 après objectif atteint', () => {
  const g = goal({ direction: 'gain', initialValue: 10, targetValue: 50, currentValue: 60 });
  const p = goalProgress(g);
  assert.equal(p.remaining, 0);
  assert.equal(p.percent, 100);
});
ok('reste jamais négatif', () => {
  const g = goal({ direction: 'perte', initialValue: 90, targetValue: 50, currentValue: 40 });
  const p = goalProgress(g);
  assert.ok(p.remaining === 0 || (p.remaining as number) >= 0);
});
// ------------------------------------------------------------------- status ----
ok('objectif actif', () => {
  const g = goal({ direction: 'gain', initialValue: 10, targetValue: 20, currentValue: 15, deadline: todayStr(20) });
  assert.equal(goalProgress(g, todayStr()).status, 'Actif');
});
ok('objectif atteint', () => {
  const g = goal({ direction: 'gain', initialValue: 10, targetValue: 20, currentValue: 21, deadline: todayStr(20) });
  assert.equal(goalProgress(g, todayStr()).status, 'Atteint');
});
ok('objectif expiré', () => {
  const g = goal({ direction: 'gain', initialValue: 10, targetValue: 20, currentValue: 15, deadline: todayStr(-1) });
  assert.equal(goalProgress(g, todayStr()).status, 'Expiré');
});
ok('atteint avant date limite reste Atteint', () => {
  const g = goal({ direction: 'gain', initialValue: 10, targetValue: 20, currentValue: 30, deadline: todayStr(5) });
  assert.equal(goalProgress(g, todayStr()).status, 'Atteint');
});
ok('atteint ignore deadline passée', () => {
  const g = goal({ direction: 'gain', initialValue: 10, targetValue: 20, currentValue: 30, deadline: todayStr(-1) });
  assert.equal(goalProgress(g, todayStr()).status, 'Atteint'); // reached wins over expired
});
ok('pas de date limite → Actif si non atteint', () => {
  const g = goal({ direction: 'gain', initialValue: 10, targetValue: 20, currentValue: 12 });
  assert.equal(goalProgress(g, todayStr()).status, 'Actif');
});
// ------------------------------------------------------ NaN / Infinity --------
ok('absence de NaN', () => {
  const cases: Goal[] = [
    goal({ direction: 'gain', initialValue: 10, targetValue: 20, currentValue: 15 }),
    goal({ direction: 'perte', initialValue: 100, targetValue: 80, currentValue: 90 }),
    goal({ direction: 'gain', initialValue: 0, targetValue: 0, currentValue: 0 }),
  ];
  for (const g of cases) {
    const p = goalProgress(g);
    assert.ok(Number.isFinite(p.percent), 'percent');
    assert.ok(p.remaining === null || Number.isFinite(p.remaining), 'remaining');
  }
});
ok("absence d'Infinity", () => {
  const g = goal({ direction: 'perte', initialValue: 80, targetValue: 80, currentValue: 80 });
  const p = goalProgress(g);
  assert.ok(Number.isFinite(p.percent));
  assert.ok(Number.isFinite(p.percent) && p.percent <= 100 && p.percent >= 0);
});
// ------------------------------------------------ zone de progression status ---
ok('progression affichée entre 0 et 100', () => {
  const g = goal({ direction: 'gain', initialValue: 10, targetValue: 20, currentValue: 999 });
  const p = goalProgress(g);
  assert.ok(p.percent >= 0 && p.percent <= 100);
});
// --------------------------------------------------- helper: goal metrics ----
ok('goals métriques supportées', () => {
  const labels = GOAL_METRICS.map((m) => m.metric);
  for (const m of ['reps', 'duration', 'sessions', 'xp', 'streak', 'record']) {
    assert.ok(labels.includes(m as any), m);
  }
});
ok('objectif reps', () => {
  assert.equal(goalMetricLabel('reps'), 'Répétitions');
});
ok('objectif duration', () => {
  assert.equal(goalMetricLabel('duration'), 'Durée');
});
ok('objectif sessions', () => {
  assert.equal(goalMetricLabel('sessions'), 'Séances');
});
ok('objectif XP', () => {
  assert.equal(goalMetricLabel('xp'), 'XP');
});
ok('objectif streak', () => {
  assert.equal(goalMetricLabel('streak'), 'Série (streak)');
});
ok('objectif record', () => {
  assert.equal(goalMetricLabel('record'), 'Records');
});
ok('goalMetricFromCategory fallback', () => {
  assert.equal(goalMetricFromCategory('frequency'), 'frequency');
  assert.equal(goalMetricFromCategory('record'), 'record');
  assert.equal(goalMetricFromCategory('weight'), 'weight');
  assert.equal(goalMetricFromCategory('custom'), 'custom');
});
ok('goalUnitSuffix duration = sec (jamais reps)', () => {
  assert.equal(goalUnitSuffix('duration'), 'sec');
  assert.notEqual(goalUnitSuffix('duration'), 'rep');
  assert.equal(goalUnitSuffix('reps'), '');
});
ok('goalValueText duration affiche minutes+secondes', () => {
  assert.equal(goalValueText('duration', 30), '30 sec');
  assert.equal(goalValueText('duration', 90), '1 min 30 s');
  assert.equal(goalValueText('duration', 120), '2 min');
});
ok('goalValueText duration jamais converti en reps', () => {
  assert.ok(/min|sec/.test(goalValueText('duration', 60)));
});
// ------------------------------------------------- current value (real data) ----
ok('reps current = meilleure performance reps', () => {
  const g = goal({ direction: 'gain', initialValue: 10, targetValue: 50, currentValue: 0 });
  g.goalMetric = 'reps';
  const c = ctx({ exercisePerformances: [perf('e1', 'Pompes', '2026-01-01', 'reps', 30)] });
  assert.equal(computeGoalCurrentValue(g, c), 30);
});
ok('duration current = meilleure durée en secondes', () => {
  const g = goal({ direction: 'gain', initialValue: 30, targetValue: 120, currentValue: 0 });
  g.goalMetric = 'duration';
  const c = ctx({ exercisePerformances: [perf('e1', 'Plank', '2026-01-01', 'timer', 0, 60)] });
  assert.equal(computeGoalCurrentValue(g, c), 60);
});
ok('reps ne pioche jamais dans les durées', () => {
  const g = goal({ direction: 'gain', initialValue: 10, targetValue: 50, currentValue: 0 });
  g.goalMetric = 'reps';
  // Seul un exercice timer existe → aucun reps réel → null (pas de conversion).
  const c = ctx({ exercisePerformances: [perf('e1', 'Plank', '2026-01-01', 'timer', 0, 60)] });
  assert.equal(computeGoalCurrentValue(g, c), null);
});
ok('sessions current = nombre réel de séances', () => {
  const g = goal({ direction: 'gain', initialValue: 0, targetValue: 12, currentValue: 0 });
  g.goalMetric = 'sessions';
  const c = ctx({ sessions: [session('a', '2026-01-01'), session('b', '2026-01-03'), session('c', '2026-01-05')] });
  assert.equal(computeGoalCurrentValue(g, c), 3);
});
ok('xp current = XP totale cumulée (F5)', () => {
  const g = goal({ direction: 'gain', initialValue: 0, targetValue: 5000, currentValue: 0 });
  g.goalMetric = 'xp';
  const c = ctx();
  // Cumulative total (0 baselines at level 1 + currentXp 1500) — NOT the
  // intra-level residual. Same value as social "XP totale".
  assert.equal(computeGoalCurrentValue(g, c), totalXpFromProfile(c.profile));
  assert.equal(computeGoalCurrentValue(g, c), 1500);
});
ok('streak current = streak réel', () => {
  const g = goal({ direction: 'gain', initialValue: 0, targetValue: 10, currentValue: 0 });
  g.goalMetric = 'streak';
  // 3 jours consécutifs se terminant aujourd'hui.
  const c = ctx({
    sessions: [session('a', todayStr(0)), session('b', todayStr(-1)), session('c', todayStr(-2))],
  });
  assert.equal(computeGoalCurrentValue(g, c), 3);
});
ok('record current = nombre réel de records', () => {
  const g = goal({ direction: 'gain', initialValue: 0, targetValue: 5, currentValue: 0 });
  g.goalMetric = 'record';
  const recs: PersonalRecord[] = [
    { id: 'r1', exerciseId: 'e1', exerciseName: 'A', weightKg: 10, reps: 5, date: '2026-01-01' },
    { id: 'r2', exerciseId: 'e2', exerciseName: 'B', weightKg: 20, reps: 5, date: '2026-01-02' },
  ];
  assert.equal(computeGoalCurrentValue(g, ctx({ records: recs })), 2);
});
ok('custom → current non dérivé (null)', () => {
  const g = goal({ direction: 'gain', initialValue: 5, targetValue: 10, currentValue: 7 });
  g.goalMetric = 'custom';
  assert.equal(computeGoalCurrentValue(g, ctx()), null);
});
// ------------------------------------------------ history ---------------------
ok('historique vide', () => {
  const g = goal({ direction: 'gain', initialValue: 10, targetValue: 20, currentValue: 0 });
  g.goalMetric = 'reps';
  assert.deepEqual(buildGoalHistory(g, ctx()), []);
});
ok('historique avec plusieurs mesures (chronologique)', () => {
  const g = goal({ direction: 'gain', initialValue: 10, targetValue: 50, currentValue: 0 });
  g.goalMetric = 'reps';
  const c = ctx({
    exercisePerformances: [
      perf('e1', 'Pompes', '2026-01-05', 'reps', 30),
      perf('e1', 'Pompes', '2026-01-01', 'reps', 20),
      perf('e1', 'Pompes', '2026-01-10', 'reps', 40),
    ],
  });
  const h = buildGoalHistory(g, c);
  assert.equal(h.length, 3);
  assert.deepEqual(h.map((m) => m.date), ['2026-01-01', '2026-01-05', '2026-01-10']);
  assert.deepEqual(h.map((m) => m.value), [20, 30, 40]);
});
ok('historique duration reste en secondes', () => {
  const g = goal({ direction: 'gain', initialValue: 30, targetValue: 120, currentValue: 0 });
  g.goalMetric = 'duration';
  const c = ctx({ exercisePerformances: [perf('e1', 'Plank', '2026-01-01', 'timer', 0, 45), perf('e1', 'Plank', '2026-01-02', 'timer', 0, 60)] });
  const h = buildGoalHistory(g, c);
  assert.deepEqual(h.map((m) => m.value), [45, 60]);
});
ok('historique sessions cumulatif', () => {
  const g = goal({ direction: 'gain', initialValue: 0, targetValue: 5, currentValue: 0 });
  g.goalMetric = 'sessions';
  const c = ctx({ sessions: [session('a', '2026-03-01'), session('b', '2026-03-03')] });
  const h = buildGoalHistory(g, c);
  assert.ok(h.length >= 2);
  assert.deepEqual(h.map((m) => m.value), [1, 2]);
});
ok('historique ordre chronologique', () => {
  const g = goal({ direction: 'gain', initialValue: 10, targetValue: 50, currentValue: 0 });
  g.goalMetric = 'reps';
  const c = ctx({
    exercisePerformances: [
      perf('e1', 'P', '2026-05-03', 'reps', 30),
      perf('e1', 'P', '2026-05-01', 'reps', 20),
      perf('e1', 'P', '2026-05-02', 'reps', 25),
    ],
  });
  const h = buildGoalHistory(g, c);
  for (let i = 1; i < h.length; i++) {
    assert.ok(h[i - 1].date <= h[i].date);
  }
});
// ------------------------------------------------- validateGoalForm ----------
ok('form: gain 10→20 valide', () => {
  assert.deepEqual(validateGoalForm({ title: 'Gain', initialValue: 10, targetValue: 20, direction: 'gain' }), []);
});
ok('form: gain 20→10 invalide', () => {
  const e = validateGoalForm({ title: 'Gain', initialValue: 20, targetValue: 10, direction: 'gain' });
  assert.ok(e.length > 0);
});
ok('form: perte 100→80 valide', () => {
  assert.deepEqual(validateGoalForm({ title: 'Perte', initialValue: 100, targetValue: 80, direction: 'perte' }), []);
});
ok('form: perte 80→100 invalide', () => {
  const e = validateGoalForm({ title: 'Perte', initialValue: 80, targetValue: 100, direction: 'perte' });
  assert.ok(e.length > 0);
});
ok('form: nom obligatoire', () => {
  const e = validateGoalForm({ title: '  ', initialValue: 10, targetValue: 20, direction: 'gain' });
  assert.ok(e.some((m) => /nom/i.test(m)));
});
ok('form: cible non positive invalide', () => {
  const e = validateGoalForm({ title: 'x', initialValue: 10, targetValue: 0, direction: 'gain' });
  assert.ok(e.length > 0);
});
ok('form: date invalide', () => {
  const e = validateGoalForm({ title: 'x', initialValue: 10, targetValue: 20, direction: 'gain', deadline: '01/01/2026' });
  assert.ok(e.length > 0);
});
ok('goalReachedFor', () => {
  assert.equal(goalReachedFor('gain', 20, 20), true);
  assert.equal(goalReachedFor('gain', 20, 19), false);
  assert.equal(goalReachedFor('perte', 80, 80), true);
  assert.equal(goalReachedFor('perte', 80, 81), false);
});
ok('goalDirection', () => {
  assert.equal(goalDirection(goal({ direction: 'gain', initialValue: 10, targetValue: 20, currentValue: 15 })), 'gain');
  assert.equal(goalDirection(goal({ direction: 'perte', initialValue: 100, targetValue: 80, currentValue: 90 })), 'perte');
});

ok('buildBlockBar 0%', () => {
  assert.equal(buildBlockBar(0), '░'.repeat(10));
});
ok('buildBlockBar 100%', () => {
  assert.equal(buildBlockBar(100), '█'.repeat(10));
});
ok('buildBlockBar 50%', () => {
  assert.equal(buildBlockBar(50), '█████░░░░░');
});
ok('buildBlockBar arrondi', () => {
  assert.equal(buildBlockBar(67), '███████░░░');
  assert.equal(buildBlockBar(64.99), '██████░░░░');
});
ok('buildBlockBar clamp', () => {
  assert.equal(buildBlockBar(-5), '░'.repeat(10));
  assert.equal(buildBlockBar(250), '█'.repeat(10));
});
ok('buildBlockBar aucune donnée invalide → barre vide (jamais NaN/Infinity)', () => {
  assert.equal(buildBlockBar(NaN), '░'.repeat(10));
  assert.equal(buildBlockBar(Infinity), '░'.repeat(10));
  assert.equal(buildBlockBar(-Infinity), '░'.repeat(10));
});

// ------------------------------------------------ F5 — objectif XP cumulatif ----
// A level-3 profile: xpToReachLevel(3) = 500 + 675 = 1175, plus 250 inside the
// level → totalXP = 1425 while currentXp (intra-level) is only 250.
const lvl3profile: UserProfile = {
  name: 'N3',
  level: 3,
  currentXp: 250,
  nextLevelXp: 912,
  streakDays: 0,
  bestStreak: 0,
  weeklyTargetSessions: 3,
  weeklyCompletedSessions: 0,
  totalWorkouts: 0,
  totalVolumeKg: 0,
  joinedDate: '2026-01-01',
};
const xpCtx = ctx({ profile: lvl3profile });

ok('F5 xp current = total cumulé (1425 ≠ résiduel 250)', () => {
  const g = goal({ direction: 'gain', initialValue: 0, targetValue: 5000, currentValue: 0 });
  g.goalMetric = 'xp';
  assert.equal(computeGoalCurrentValue(g, xpCtx), 1425);
});

ok('F5 xp cible < total actuel → Atteint 100%', () => {
  const current = computeGoalCurrentValue({ ...goal({ direction: 'gain', initialValue: 0, targetValue: 1000, currentValue: 0 }), goalMetric: 'xp' }, xpCtx) as number;
  const g = goal({ direction: 'gain', initialValue: 0, targetValue: 1000, currentValue: current });
  g.goalMetric = 'xp';
  const p = goalProgress(g);
  assert.equal(p.status, 'Atteint');
  assert.equal(p.percent, 100);
  assert.equal(p.remaining, 0);
});

ok('F5 xp cible == total actuel → Atteint 100%', () => {
  const g = goal({ direction: 'gain', initialValue: 0, targetValue: 1425, currentValue: 1425 });
  g.goalMetric = 'xp';
  const p = goalProgress(g);
  assert.equal(p.status, 'Atteint');
  assert.equal(p.percent, 100);
});

ok('F5 xp cible > total actuel → Actif avec progression', () => {
  const g = goal({ direction: 'gain', initialValue: 0, targetValue: 2000, currentValue: 1425 });
  g.goalMetric = 'xp';
  const p = goalProgress(g);
  assert.equal(p.status, 'Actif');
  assert.equal(p.percent, 71); // 1425/2000 ≈ 71%
  assert.equal(p.remaining, 575);
});

ok('F5 xp progression 50%', () => {
  const g = goal({ direction: 'gain', initialValue: 0, targetValue: 3000, currentValue: 1500 });
  g.goalMetric = 'xp';
  assert.equal(goalProgress(g).percent, 50);
});

ok('F5 xp objectif atteint même à bas niveau', () => {
  // Bas niveau (level 1, currentXp 200 → total 200) : cible 200 atteinte.
  const lowProfile = ctx({ profile: { ...lvl3profile, level: 1, currentXp: 200, nextLevelXp: 500 } });
  const g = goal({ direction: 'gain', initialValue: 0, targetValue: 200, currentValue: 200 });
  g.goalMetric = 'xp';
  const p = goalProgress(g);
  assert.equal(p.status, 'Atteint');
  assert.equal(computeGoalCurrentValue(g, lowProfile), 200);
});

ok('F5 xp historique cohérent (vide, aucune seconde source XP)', () => {
  const g = goal({ direction: 'gain', initialValue: 0, targetValue: 2000, currentValue: 0 });
  g.goalMetric = 'xp';
  // L'historique XP reste vide (XP = total vivant, pas de snapshot stocké) :
  // aucune donnée de progression XP inventée.
  assert.deepEqual(buildGoalHistory(g, xpCtx), []);
});

// ------------------------------------------------ LOT 8 — S3 : objectif XP ----
// Scénarios dédiés du polish final : faible / intermédiaire / atteint / non
// atteint / progression / sauvegarde-rechargement. Toujours la MÊME source XP
// (formule computeSessionXp → courbe de niveaux → totalXpFromProfile).

ok('S3 xp faible : total 200 vs cible 1000 → Actif 20%', () => {
  const low = ctx({ profile: { ...ctx().profile, level: 1, currentXp: 200, nextLevelXp: 500 } });
  const g = goal({ direction: 'gain', initialValue: 0, targetValue: 1000, currentValue: 200 });
  g.goalMetric = 'xp';
  const p = goalProgress(g);
  assert.equal(p.status, 'Actif');
  assert.equal(p.percent, 20);
  assert.equal(p.remaining, 800);
});

ok('S3 xp intermédiaire : total 1425 vs cible 3000 → 48%', () => {
  const g = goal({ direction: 'gain', initialValue: 0, targetValue: 3000, currentValue: 1425 });
  g.goalMetric = 'xp';
  const p = goalProgress(g);
  assert.equal(p.percent, 48);
  assert.equal(p.remaining, 1575);
});

ok('S3 xp non atteint → jamais coché completed par la derive', () => {
  const g = goal({ direction: 'gain', initialValue: 0, targetValue: 5000, currentValue: 1425 });
  g.goalMetric = 'xp';
  assert.equal(goalProgress(g).reached, false);
  assert.equal(goalReachedFor('gain', 5000, 1425), false);
});

ok('S3 xp atteint → status stable', () => {
  const g = goal({ direction: 'gain', initialValue: 0, targetValue: 1425, currentValue: 1425 });
  g.goalMetric = 'xp';
  const p = goalProgress(g);
  assert.equal(p.status, 'Atteint');
  assert.equal(p.reached, true);
  assert.equal(goalReachedFor('gain', 1425, 1425), true);
});

ok('S3 xp sauvegarde/rechargement : valeur redérivée identique (non stockée)', () => {
  // Simule 3 séances validées → XP totale via LA formule XP unique.
  const makeSession = (id: string, nExercises: number, stretches: number, daysAgo: number): WorkoutSession => ({
    id,
    title: `S ${id}`,
    date: todayStr(daysAgo),
    startTime: '10:00',
    durationMinutes: 30,
    totalVolumeKg: 100,
    completed: true,
    exercises: Array.from({ length: nExercises }, () => ({}) as never),
    stretchesCount: stretches,
  } as unknown as WorkoutSession);
  const sessions: WorkoutSession[] = [
    makeSession('s1', 5, 2, -4),
    makeSession('s2', 4, 1, -2),
    makeSession('s3', 6, 0, -1),
  ];
  const totalFromSessions = sessions.reduce((acc, s) => acc + computeSessionXp(s.exercises.length, s.stretchesCount || 0), 0);

  // "Rechargement" : le profil est reconstruit depuis les séances.
  const rebuilt = computeLevelFromXp(totalFromSessions);
  const reloadedProfile: UserProfile = { ...ctx().profile, level: rebuilt.level, currentXp: rebuilt.currentXp, nextLevelXp: rebuilt.nextLevelXp };
  const room = ctx({ profile: reloadedProfile, sessions });
  const g = goal({ direction: 'gain', initialValue: 0, targetValue: totalFromSessions + 100, currentValue: 0 });
  g.goalMetric = 'xp';

  const current = computeGoalCurrentValue(g, room) as number;
  assert.equal(totalXpFromProfile(reloadedProfile), totalFromSessions, 'profil reconstruit == XP des séances (source unique)');
  assert.equal(current, totalFromSessions, 'l\'objectif lit exactement le total re-dérivé');
  // Nouvel appel (2e rechargement) → même valeur, aucune dépendance à un stockage.
  assert.equal(computeGoalCurrentValue(g, room), current);

  // Et la métrique 'xp' ne dépend JAMAIS du champ currentValue stocké de l'objectif.
  const g2 = { ...g, currentValue: 999999 } as Goal;
  assert.equal(computeGoalCurrentValue(g2, room), totalFromSessions);
});

// ---------------------------------------------------------------- report -----
console.log(`\n${passed} tests PASS, ${failed} FAIL`);
if (failed === 0) {
  console.log('ALL TESTS PASSED');
} else {
  console.log('SOME TESTS FAILED');
}
