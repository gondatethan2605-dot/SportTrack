import { Goal, GoalDirection, GoalMetric, GoalMeasurement, WorkoutSession, UserProfile, PersonalRecord, ExercisePerformance, ExerciseBest, BodyMeasurement } from './types';
import { computeStreak } from './utilsStreak';
import { totalXpFromProfile } from './utilsLevels';

// Pure V7.8 goals logic shared by GoalsPage and any future consumer. No UI, no
// storage access. A goal can only ever move toward its target along one axis:
//   - perte: initialValue > targetValue, progress = (initial - current) / (initial - target)
//   - gain : initialValue < targetValue, progress = (current - initial) / (target - initial)
// Percent is clamped to [0, 100]. An "Atteint" goal always shows 100%.
// Division by zero is guarded (initial === target).

export type GoalStatus = 'Actif' | 'Atteint' | 'Expiré';

export interface GoalProgress {
  direction: GoalDirection;
  status: GoalStatus;
  percent: number; // 0..100
  remaining: number | null; // value still needed to reach the target (0 once reached)
  reached: boolean;
  hasInitial: boolean;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

function targetTotalReached(target: number, current: number, direction: GoalDirection): boolean {
  return direction === 'perte' ? current <= target : current >= target;
}

export function goalDirection(goal: Goal): GoalDirection {
  return goal.direction === 'perte' ? 'perte' : 'gain';
}

export function goalProgress(goal: Goal, today?: string): GoalProgress {
  const target = Number(goal.targetValue) || 0;
  const current = Number(goal.currentValue) || 0;
  const direction = goalDirection(goal);
  const hasInitial = typeof goal.initialValue === 'number' && isFinite(goal.initialValue);
  const initial = hasInitial ? goal.initialValue as number : current;

  let raw: number;
  let reached: boolean;

  if (direction === 'perte') {
    const denom = initial - target;
    if (denom === 0) {
      raw = current <= target ? 1 : 0;
    } else {
      raw = (initial - current) / denom;
    }
    reached = current <= target;
  } else {
    if (!hasInitial && goal.initialValue === undefined) {
      // Legacy V7.7 goal (no direction/initialValue): keep the historic
      // current/target ratio so existing goals display exactly as before.
      if (target === 0) {
        raw = current >= 0 ? (current > 0 ? 1 : 0) : 0;
      } else {
        raw = current / target;
      }
      reached = targetTotalReached(target, current, 'gain');
    } else {
      const denom = target - initial;
      if (denom === 0) {
        raw = current >= target ? 1 : 0;
      } else {
        raw = (current - initial) / denom;
      }
      reached = targetTotalReached(target, current, 'gain');
    }
  }

  const percent = Math.max(0, Math.min(100, Math.round(raw * 100)));

  let status: GoalStatus = 'Actif';
  if (reached) {
    status = 'Atteint';
  } else if (goal.deadline && today && today > goal.deadline) {
    status = 'Expiré';
  }

  let remaining: number | null = null;
  if (direction === 'perte') {
    remaining = reached ? 0 : round2(Math.max(0, current - target));
  } else {
    remaining = reached ? 0 : round2(Math.max(0, target - current));
  }

  return { direction, status, percent, remaining, reached, hasInitial };
}

// True when a freshly created goal (using the given direction) is already reached.
export function goalReachedFor(direction: GoalDirection, target: number, current: number): boolean {
  return targetTotalReached(target, current, direction);
}

// ----------------------------------------------------------------------------
// LOT F — Smart goals: real-data current values, history, labels and helpers.
// All logic is additive and read-only. Duration is compared in seconds and is
// NEVER converted to/from reps.
// ----------------------------------------------------------------------------

export interface GoalContext {
  sessions: WorkoutSession[];
  profile: UserProfile;
  records: PersonalRecord[];
  exercisePerformances: ExercisePerformance[];
  exerciseBests: ExerciseBest[];
  measurements: BodyMeasurement[];
}

// The LOT F goal metrics + their display labels.
export const GOAL_METRICS: { metric: GoalMetric; label: string }[] = [
  { metric: 'reps', label: 'Répétitions' },
  { metric: 'duration', label: 'Durée' },
  { metric: 'sessions', label: 'Séances' },
  { metric: 'xp', label: 'XP' },
  { metric: 'streak', label: 'Série (streak)' },
  { metric: 'record', label: 'Records' },
  { metric: 'weight', label: 'Poids' },
  { metric: 'frequency', label: 'Fréquence' },
  { metric: 'custom', label: 'Personnalisé' },
];

// Maps a legacy category onto a goal metric (used to label old goals).
export function goalMetricFromCategory(category: Goal['category']): GoalMetric {
  switch (category) {
    case 'frequency':
      return 'frequency';
    case 'record':
      return 'record';
    case 'weight':
      return 'weight';
    default:
      return 'custom';
  }
}

export function goalMetricLabel(metric: GoalMetric): string {
  const found = GOAL_METRICS.find((m) => m.metric === metric);
  return found ? found.label : 'Objectif';
}

// Display unit helper. Reps/sessions/xp/streak/record are plain counts (no unit
// suffix in display). Duration is stored in seconds internally but rendered as
// human-readable (seconds or minutes+seconds). Never mixes units with reps.
export function goalUnitSuffix(metric: GoalMetric | undefined): string {
  if (metric === 'duration') return 'sec';
  if (metric === 'weight') return 'kg';
  if (metric === 'xp') return 'XP';
  if (metric === 'sessions') return 'séance';
  if (metric === 'streak') return 'jour';
  if (metric === 'record') return 'record';
  return '';
}

// Human-friendly rendering of a value in the goal's own metric. Duration keeps
// its unit in seconds internally and is only reformatted for display.
export function goalValueText(metric: GoalMetric | undefined, value: number): string {
  if (!Number.isFinite(value)) return '—';
  const label = goalUnitSuffix(metric);
  if (metric === 'duration') {
    if (!Number.isFinite(value) || value <= 0) return '0 sec';
    const s = Math.round(value);
    if (s < 60) return `${s} sec`;
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return ss === 0 ? `${mm} min` : `${mm} min ${ss} s`;
  }
  const display = Math.round(value) === value ? String(value) : value.toFixed(1);
  return label ? `${display} ${label}` : display;
}

// Compact block-character progress bar for the visual goal rendering, e.g.
// "20 / 30 ████████░░ 67 %". 10 blocks wide, clamped to 0..100; NaN / invalid
// inputs produce an empty bar (never a crash, never Infinity).
export function buildBlockBar(percent: number): string {
  const safe = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  const filled = Math.round(safe / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

// The current reachable value of a goal derived from REAL SportTrack data.
// Returns null when the goal cannot be resolved to real data (e.g. a custom
///manual goal without a tracked metric). Never invents a value.
export function computeGoalCurrentValue(goal: Goal, ctx: GoalContext): number | null {
  const metric = goal.goalMetric || goalMetricFromCategory(goal.category);
  switch (metric) {
    case 'reps': {
      if (goal.exerciseId) {
        const best = ctx.exerciseBests.find((b) => b.exerciseId === goal.exerciseId);
        if (best?.bestReps?.value != null) return best.bestReps.value;
      }
      const perfs = ctx.exercisePerformances.filter((p) => !goal.exerciseId || p.exerciseId === goal.exerciseId);
      let best = 0;
      let found = false;
      for (const e of perfs) {
        if (e.mode !== 'timer' && e.totalReps > 0) {
          found = true;
          if (e.totalReps > best) best = e.totalReps;
        }
      }
      return found ? best : null; // no reps data → null (never reads timer values)
    }
    case 'duration': {
      if (goal.exerciseId) {
        const best = ctx.exerciseBests.find((b) => b.exerciseId === goal.exerciseId);
        if (best?.bestDurationSec?.value != null) return best.bestDurationSec.value;
      }
      const perfs = ctx.exercisePerformances.filter((p) => !goal.exerciseId || p.exerciseId === goal.exerciseId);
      let best = 0;
      let found = false;
      for (const e of perfs) {
        if (e.mode === 'timer' && e.totalDurationSec > 0) {
          found = true;
          if (e.totalDurationSec > best) best = e.totalDurationSec;
        }
      }
      return found ? best : null; // no timer data → null (never reads reps values)
    }
    case 'sessions':
      return ctx.sessions.length;
    case 'xp':
      // F5 — an XP goal is CUMULATIVE: progress is measured on the grand total
      // XP (all levels, including the current level's residual), so a target
      // like "1000 XP total" is reachable at any level. This is the exact same
      // value exposed by social ("XP totale") and derived from the existing
      // level curve — no second XP source, nothing stored.
      return totalXpFromProfile(ctx.profile);
    case 'streak':
      return computeStreak(ctx.sessions.map((s) => s.date));
    case 'record':
      return ctx.records.length;
    case 'weight': {
      const wm = ctx.measurements.filter((m) => typeof m.weightKg === 'number' && isFinite(m.weightKg)).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      if (wm.length === 0) return null;
      return wm[wm.length - 1].weightKg;
    }
    default:
      return null; // custom / frequency: manual (keep stored currentValue)
  }
}

// The latest measurement date available for a goal (real data-backed metrics).
export function goalCurrentDataDate(goal: Goal, ctx: GoalContext): string | null {
  const metric = goal.goalMetric || goalMetricFromCategory(goal.category);
  let date: string | null = null;
  const upd = (d: string | undefined | null) => {
    if (d && (date === null || d > date)) date = d;
  };
  if (metric === 'reps' || metric === 'duration') {
    const perfs = ctx.exercisePerformances.filter((p) => !goal.exerciseId || p.exerciseId === goal.exerciseId);
    for (const e of perfs) upd(e.date);
  } else if (metric === 'sessions' || metric === 'streak') {
    for (const s of ctx.sessions) upd(s.date);
  } else if (metric === 'record') {
    for (const r of ctx.records) upd(r.date);
  } else if (metric === 'weight') {
    for (const m of ctx.measurements) upd(m.date);
  }
  return date;
}

// Chronological history of a goal derived from real data. For reps/duration it
// uses the per-session exercise performances; for sessions/streak the sessions;
// for record the record dates; for xp a single synthetic point is omitted (XP is
// a live total → history shown from profile snapshots is not available, so an
// empty history is expected for xp). Duration values stay in seconds.
export function buildGoalHistory(goal: Goal, ctx: GoalContext): GoalMeasurement[] {
  const metric = goal.goalMetric || goalMetricFromCategory(goal.category);
  const out: GoalMeasurement[] = [];
  const push = (date: string, value: number) => {
    if (!Number.isFinite(value)) return;
    out.push({ date, value });
  };

  if (metric === 'reps' || metric === 'duration') {
    const perfs = ctx.exercisePerformances
      .filter((p) => !goal.exerciseId || p.exerciseId === goal.exerciseId)
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    for (const e of perfs) {
      if (metric === 'reps' && e.mode !== 'timer') push(e.date, e.totalReps);
      else if (metric === 'duration' && e.mode === 'timer') push(e.date, e.totalDurationSec);
    }
  } else if (metric === 'sessions') {
    // Count every session chronologically — matches computeGoalCurrentValue's
    // ctx.sessions.length so the progress value and the history line agree.
    const sorted = ctx.sessions.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    let count = 0;
    for (const s of sorted) {
      count++;
      push(s.date, count);
    }
  } else if (metric === 'streak') {
    const dates = Array.from(new Set(ctx.sessions.map((s) => s.date))).sort();
    for (const d of dates) {
      push(d, computeStreak([...new Set(ctx.sessions.filter((s) => s.date <= d).map((s) => s.date))], new Date(d + 'T12:00:00')));
    }
  } else if (metric === 'record') {
    const recs = ctx.records.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    recs.forEach((r, i) => push(r.date, i + 1));
  } else if (metric === 'weight') {
    const wm = ctx.measurements.filter((m) => typeof m.weightKg === 'number' && isFinite(m.weightKg)).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    for (const m of wm) push(m.date, m.weightKg);
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// Validation for the goal creation/edition form. target/initial/direction must be
// coherent (gain: initial < target ; perte: initial > target). Returns a list of
// French error messages (empty when valid).
export function validateGoalForm(input: {
  title: string;
  initialValue: number | null;
  targetValue: number;
  direction: GoalDirection;
  deadline?: string;
}): string[] {
  const errors: string[] = [];
  if (!input.title || !input.title.trim()) errors.push('Le nom de l’objectif est obligatoire.');
  if (!Number.isFinite(input.targetValue) || input.targetValue <= 0) errors.push('La valeur cible doit être un nombre positif.');
  if (input.initialValue != null && !Number.isFinite(input.initialValue)) errors.push('La valeur de départ doit être un nombre valide.');
  if (input.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(input.deadline)) errors.push('La date limite n’est pas valide.');
  if (input.initialValue != null && Number.isFinite(input.initialValue)) {
    const ini = input.initialValue;
    const tgt = input.targetValue;
    if (input.direction === 'gain' && Number.isFinite(tgt) && ini >= tgt) {
      errors.push('Pour un objectif en gain, la cible doit être supérieure à la valeur de départ (ou choisissez Perte).');
    }
    if (input.direction === 'perte' && Number.isFinite(tgt) && ini <= tgt) {
      errors.push('Pour un objectif en perte, la cible doit être inférieure à la valeur de départ (ou choisissez Gain).');
    }
  }
  return errors;
}