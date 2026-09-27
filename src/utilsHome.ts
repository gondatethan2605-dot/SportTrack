import { WorkoutProgram, WorkoutProgramDay, Goal, UserProfile, PersonalRecord, ExercisePerformance, ExerciseBest, BodyMeasurement, WorkoutSession } from './types';
import { getDayExerciseCount, getDayTotalSets, estimateDayDurationSec, estimateDayDurationMin } from './utilsProgram';
import { goalProgress, goalDirection, goalMetricFromCategory, goalValueText, computeGoalCurrentValue, GoalContext } from './utilsGoals';
import { filterSessionsByPeriod, computePeriodStats, StatsPeriod, SessionPeriodStats } from './utilsStats';

// ----------------------------------------------------------------------------
// LOT G — Pure read-side helpers for the HomePage dashboard.
// All logic is derived from real data by reusing the existing LOT D/E/F helpers.
// Nothing here mutates stored data, nothing converts reps <-> duration, and no
// statistic is invented. Duration stays internal (seconds / minutes as shown).
// ----------------------------------------------------------------------------

// The next day to train: today's planned day when one is scheduled for today,
// otherwise the program's first day. Reuses getDayExerciseCount / totals so the
// counts stay fully coherent with the rest of the app.
export interface DashboardDay {
  day: WorkoutProgramDay;
  programTitle: string;
  name: string;
  exerciseCount: number;
  setCount: number;
  durationMin: number;
  durationSec: number;
}

export function getNextProgramDay(program: WorkoutProgram | undefined, now: Date = new Date()): DashboardDay | null {
  if (!program) return null;
  const currentDayName = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][now.getDay()];
  const todayPlanned = program.days.find((d) => d.dayOfWeek === currentDayName);
  const day = todayPlanned || program.days[0];
  if (!day) return null;
  return {
    day,
    programTitle: program.title,
    name: day.name,
    exerciseCount: getDayExerciseCount(day),
    setCount: getDayTotalSets(day),
    durationMin: estimateDayDurationMin(day),
    durationSec: estimateDayDurationSec(day),
  };
}

// Dashboard scoped view of one active goal, reusing the LOT F progression
// formula and current-value derivation. Only returns 'Actif' goals (an expired
// goal is never presented as active; an achieved goal is excluded).
export interface DashboardGoal {
  goal: Goal;
  metric: Goal['goalMetric'];
  direction: Goal['direction'];
  current: number | null;
  target: number;
  percent: number; // 0..100
  remaining: number | null;
  color: 'emerald' | 'violet' | 'indigo' | 'amber';
  status: 'Actif';
}

const GOAL_COLORS: string[] = ['emerald', 'violet', 'indigo', 'amber'];

export function getActiveDashboardGoals(
  goals: Goal[],
  ctx: GoalContext,
  today: string | Date = new Date(),
  limit = 3
): DashboardGoal[] {
  const todayKey = typeof today === 'string' ? today : today.toISOString().slice(0, 10);
  const out: DashboardGoal[] = [];
  for (const goal of goals || []) {
    if (out.length >= limit) break;
    // Resolve the goal's real current value for smart metrics so the existing
    // LOT F goalProgress formula reflects real data (mirrors GoalsPage).
    const metric = goal.goalMetric || goalMetricFromCategory(goal.category);
    const current = computeGoalCurrentValue(goal, ctx);
    const withCurrent: Goal =
      (metric !== 'custom' && metric !== 'frequency' && current !== null)
        ? { ...goal, currentValue: current }
        : goal;
    const pro = goalProgress(withCurrent, todayKey);
    if (pro.status !== 'Actif') continue; // skip Atteint & Expiré
    const target = goal.targetValue || 0;
    out.push({
      goal,
      metric,
      direction: goalDirection(goal) === 'perte' ? 'perte' : 'gain',
      current: current !== null ? current : null,
      target,
      percent: pro.percent,
      remaining: pro.remaining,
      color: GOAL_COLORS[out.length % GOAL_COLORS.length] as DashboardGoal['color'],
      status: 'Actif',
    });
  }
  return out;
}

// Shorthand used by the dashboard + tests to format a goal value in its own unit.
export function homeGoalValueText(goal: Goal, value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const metric = goal.goalMetric || goalMetricFromCategory(goal.category);
  return goalValueText(metric, value);
}

// Quick "Cette semaine" stats, reusing the LOT E period helpers so the numbers
// are identical to StatsPage (no double counting, timers never become reps).
export function getWeeklyQuickStats(sessions: WorkoutSession[], period: StatsPeriod = 'week', now: Date = new Date()): SessionPeriodStats {
  return computePeriodStats(filterSessionsByPeriod(sessions, period, now));
}

// The last completed activity, derived purely from real sessions (no storage).
export interface LastActivity {
  id: string;
  title: string;
  date: string;
  exerciseNames: string[];
  exerciseCount: number;
  durationMinutes: number;
}

export function getLastActivity(sessions: WorkoutSession[]): LastActivity | null {
  if (!sessions || sessions.length === 0) return null;
  const sorted = [...sessions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const last = sorted[sorted.length - 1];
  const names = Array.from(new Set((last.exercises || []).map((e) => e.exerciseName).filter(Boolean))) as string[];
  return {
    id: last.id,
    title: last.title,
    date: last.date,
    exerciseNames: names,
    exerciseCount: names.length,
    durationMinutes: last.durationMinutes || 0,
  };
}

// Lightweight, purely presentational warm-up hint. It reads no persisted data
// and needs NO migration: it only suggests a short general warm-up before the
// main session. Real warm-up data would require a new store (out of scope).
export const WARM_UP_MINUTES = '3–5';
export interface WarmUpHint {
  minutes: string;
  label: string;
}

export function getWarmUpHint(): WarmUpHint {
  return { minutes: WARM_UP_MINUTES, label: 'Échauffement recommandé' };
}

// Convenience: build a GoalContext for a consumer that has the raw arrays.
export function buildHomeGoalContext(args: {
  sessions: WorkoutSession[];
  profile: UserProfile;
  records: PersonalRecord[];
  exercisePerformances: ExercisePerformance[];
  exerciseBests: ExerciseBest[];
  measurements: BodyMeasurement[];
}): GoalContext {
  return {
    sessions: args.sessions || [],
    profile: args.profile,
    records: args.records || [],
    exercisePerformances: args.exercisePerformances || [],
    exerciseBests: args.exerciseBests || [],
    measurements: args.measurements || [],
  };
}
