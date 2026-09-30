import { WorkoutSession, ExercisePerformance, PersonalRecord, MuscleGroup, WorkoutSet, Exercise, ExerciseMode, ExercisePerformanceSet } from './types';
import { analyzeProgression, type ProgressionTrend } from './utilsProgression';
import { computeSessionXp } from './utilsXp';

// ----------------------------------------------------------------------------
// LOT E — Pure period statistics over real session data.
// All functions are read-only and deterministic. Rules follow the project
// conventions (see hasValidCompletedSet in utilsSession.ts):
//   - a "valid completed set" is completed === true AND (timer ? durationSec > 0
//     : reps > 0);
//   - reps are only ever counted from completed, non-timer sets (a timer set is
//     counted separately and is NEVER converted into repetitions);
//   - an exercise is counted once per period regardless of how many times it
//     appears across sessions / sets (no double counting).
// ----------------------------------------------------------------------------

export type StatsPeriod = 'week' | 'month' | 'global';

const toDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Monday-based start of the current calendar week (YYYY-MM-DD).
export function startOfWeek(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mondayOffset = (d.getDay() + 6) % 7; // Sunday=0..Saturday=6 -> Monday=0
  d.setDate(d.getDate() - mondayOffset);
  return toDateKey(d);
}

// First day of the current calendar month (YYYY-MM-DD).
export function startOfMonth(now: Date = new Date()): string {
  return toDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
}

// Inclusive start date for a period. Returns null for 'global' (no filter).
export function periodStartDate(period: StatsPeriod, now: Date = new Date()): string | null {
  switch (period) {
    case 'week':
      return startOfWeek(now);
    case 'month':
      return startOfMonth(now);
    case 'global':
    default:
      return null;
  }
}

// Filter sessions to a period using their real date (YYYY-MM-DD, lexical
// comparison is chronological).
export function filterSessionsByPeriod(sessions: WorkoutSession[], period: StatsPeriod, now: Date = new Date()): WorkoutSession[] {
  const start = periodStartDate(period, now);
  if (!start) return sessions;
  return sessions.filter((s) => s.date >= start);
}

const isTimerMode = (mode: WorkoutSession['exercises'][number]['sets'][number]['mode']) => mode === 'timer';

// Whether a single set counts as a validated effort for stats purposes.
export function isValidCompletedSet(set: { completed: boolean; mode?: 'reps' | 'timer'; reps?: number; durationSec?: number }): boolean {
  if (set.completed !== true) return false;
  if (isTimerMode(set.mode)) return (set.durationSec || 0) > 0;
  return (set.reps || 0) > 0;
}

export interface SessionPeriodStats {
  sessions: number;
  validatedSets: number;
  repCount: number;
  timerSetCount: number;
  uniqueExercises: number;
  stretchCount: number;
  durationMinutes: number;
  volumeKg: number;
  xpEarned: number;
  frequencyPerWeek: number;
}

export function emptyPeriodStats(): SessionPeriodStats {
  return {
    sessions: 0,
    validatedSets: 0,
    repCount: 0,
    timerSetCount: 0,
    uniqueExercises: 0,
    stretchCount: 0,
    durationMinutes: 0,
    volumeKg: 0,
    xpEarned: 0,
    frequencyPerWeek: 0,
  };
}

// Aggregate counts for a set of sessions (already period-scoped by the caller).
// Never produces negatives, NaN or division by zero. XP follows the single XP
// formula (computeSessionXp); frequency stays session/week over ACTIVE weeks
// (same rule as computeSessionsPerWeek: empty weeks are never invented).
export function computePeriodStats(sessions: WorkoutSession[]): SessionPeriodStats {
  const stats = emptyPeriodStats();
  const exerciseIds = new Set<string>();

  for (const s of sessions) {
    stats.sessions += 1;
    stats.stretchCount += s.stretchesCount || 0;
    stats.durationMinutes += s.durationMinutes || 0;
    stats.volumeKg += s.totalVolumeKg || 0;
    stats.xpEarned += computeSessionXp(s.exercises?.length || 0, s.stretchesCount || 0);

    for (const ex of s.exercises || []) {
      if (ex.exerciseId) exerciseIds.add(ex.exerciseId);
      for (const set of ex.sets || []) {
        if (!isValidCompletedSet(set)) continue;
        stats.validatedSets += 1;
        if (isTimerMode(set.mode)) {
          stats.timerSetCount += 1;
        } else {
          stats.repCount += set.reps || 0;
        }
      }
    }
  }

  stats.uniqueExercises = exerciseIds.size;
  stats.frequencyPerWeek = computeSessionsPerWeek(sessions);
  return stats;
}

export interface ExercisePopularity {
  exerciseId: string;
  name: string;
  sessionCount: number; // distinct sessions where the exercise appears
  validatedSetCount: number; // total valid completed sets for that exercise
}

// Distinct exercises with their practice frequency, sorted by most practiced
// (session count desc, then validated sets desc, then name). Reused for the
// "top exercises" list and as the basis of the per-exercise selector.
export function computeExercisePopularity(sessions: WorkoutSession[]): ExercisePopularity[] {
  const byExercise = new Map<string, { name: string; sessionIds: Set<string>; setCount: number }>();

  for (const s of sessions) {
    for (const ex of s.exercises || []) {
      if (!ex.exerciseId) continue;
      let record = byExercise.get(ex.exerciseId);
      if (!record) {
        record = { name: ex.exerciseName || ex.exerciseId, sessionIds: new Set(), setCount: 0 };
        byExercise.set(ex.exerciseId, record);
      }
      record.sessionIds.add(s.id);
      for (const set of ex.sets || []) {
        if (isValidCompletedSet(set)) record.setCount += 1;
      }
    }
  }

  return Array.from(byExercise.entries())
    .map(([exerciseId, r]) => ({
      exerciseId,
      name: r.name,
      sessionCount: r.sessionIds.size,
      validatedSetCount: r.setCount,
    }))
    .sort((a, b) => b.sessionCount - a.sessionCount || b.validatedSetCount - a.validatedSetCount || a.name.localeCompare(b.name, 'fr'));
}

// ----------------------------------------------------------------------------
// LOT III — Statistiques poussées (page Statistiques).
// Pure, read-only helpers. Same conventions as above: real dates, real
// completed sets, no invented data, no NaN / Infinity / division by zero.
// ----------------------------------------------------------------------------

// Local date from a YYYY-MM-DD key (avoids the UTC parsing pitfall of the
// date-only constructor on machines with a negative UTC offset).
const fromDateKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

// Monday-based calendar-week key (YYYY-MM-DD, the Monday) of a session date.
const weekKeyOf = (date: string): string => startOfWeek(fromDateKey(date));

// Month key YYYY-MM of a session date.
const monthKeyOf = (date: string): string => (date || '').slice(0, 7);

export interface BestSession {
  id: string;
  title: string;
  date: string;
  value: number;
}

export interface BestSessionsSummary {
  bestVolume: BestSession | null; // session with the largest total volume
  longest: BestSession | null; // session with the longest recorded duration
  count: number;
}

export function computeBestSessions(sessions: WorkoutSession[]): BestSessionsSummary {
  const list = Array.isArray(sessions) ? sessions : [];
  let bestVolume: BestSession | null = null;
  let longest: BestSession | null = null;
  for (const s of list) {
    if (!s) continue;
    const volume = s.totalVolumeKg || 0;
    const duration = s.durationMinutes || 0;
    if (!bestVolume || volume > bestVolume.value) {
      bestVolume = { id: s.id, title: s.title, date: s.date, value: volume };
    }
    if (!longest || duration > longest.value) {
      longest = { id: s.id, title: s.title, date: s.date, value: duration };
    }
  }
  return { bestVolume, longest, count: list.length };
}

export interface SessionAverages {
  avgDurationMinutes: number;
  avgVolumeKg: number;
  avgValidatedSets: number;
  avgReps: number;
}

export function computeSessionAverages(sessions: WorkoutSession[]): SessionAverages {
  const total = computePeriodStats(sessions);
  const n = total.sessions;
  if (n === 0) {
    return { avgDurationMinutes: 0, avgVolumeKg: 0, avgValidatedSets: 0, avgReps: 0 };
  }
  return {
    avgDurationMinutes: Math.round(total.durationMinutes / n),
    avgVolumeKg: Math.round((total.volumeKg / n) * 10) / 10,
    avgValidatedSets: Math.round(total.validatedSets / n),
    avgReps: Math.round(total.repCount / n),
  };
}

export interface ExerciseSummary {
  sessions: number;
  validatedSets: number;
  totalReps: number;
  totalDurationSec: number;
  totalVolumeKg: number;
  weightUsedKg: number;
  lastDate: string | null;
  mode: ExercisePerformance['mode'] | null;
}

// Aggregated real volume of one exercise across its recorded performances.
export function summarizeExercise(entries: ExercisePerformance[]): ExerciseSummary {
  const list = Array.isArray(entries) ? entries : [];
  let sessions = 0;
  let validatedSets = 0;
  let totalReps = 0;
  let totalDurationSec = 0;
  let totalVolumeKg = 0;
  let weightUsedKg = 0;
  let lastDate: string | null = null;
  let mode: ExercisePerformance['mode'] | null = null;
  for (const e of list) {
    if (!e) continue;
    sessions += 1;
    validatedSets += e.setsCompleted || 0;
    totalReps += e.totalReps || 0;
    totalDurationSec += e.totalDurationSec || 0;
    totalVolumeKg += e.totalVolumeKg || 0;
    if (!lastDate || e.date > lastDate) {
      lastDate = e.date;
      weightUsedKg = e.weightUsedKg || 0;
      mode = e.mode || mode;
    }
  }
  return {
    sessions,
    validatedSets,
    totalReps,
    totalDurationSec,
    totalVolumeKg,
    weightUsedKg,
    lastDate,
    mode,
  };
}

// Average number of sessions per active (non-empty) calendar week. Note: an
// empty week is never counted, so the average reflects real training cadence
// without inventing weeks the user simply did not train in.
export function computeSessionsPerWeek(sessions: WorkoutSession[]): number {
  if (!sessions || sessions.length === 0) return 0;
  const weeks = new Set<string>();
  for (const s of sessions) {
    if (!s.date) continue;
    weeks.add(weekKeyOf(s.date));
  }
  if (weeks.size === 0) return 0;
  return Math.round((sessions.length / weeks.size) * 10) / 10;
}

// Average number of sessions per active (non-empty) calendar month.
export function computeSessionsPerMonth(sessions: WorkoutSession[]): number {
  if (!sessions || sessions.length === 0) return 0;
  const months = new Set<string>();
  for (const s of sessions) {
    if (!s.date) continue;
    months.add(monthKeyOf(s.date));
  }
  if (months.size === 0) return 0;
  return Math.round((sessions.length / months.size) * 10) / 10;
}

// Sessions completed inside the current calendar week / month.
export function countSessionsThisWeek(sessions: WorkoutSession[], now: Date = new Date()): number {
  const start = startOfWeek(now);
  return sessions.filter((s) => s.date >= start).length;
}

export function countSessionsThisMonth(sessions: WorkoutSession[], now: Date = new Date()): number {
  const start = startOfMonth(now);
  return sessions.filter((s) => s.date >= start).length;
}

// Inclusive start date of the period that immediately precedes the given period
// (week -> the previous Monday-based week, month -> the previous calendar
// month). Returns null for 'global' (no reference period).
export function previousPeriodStartDate(period: StatsPeriod, now: Date = new Date()): string | null {
  if (period === 'global') return null;
  if (period === 'week') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const mondayOffset = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - mondayOffset - 7);
    return toDateKey(d);
  }
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return toDateKey(new Date(first.getFullYear(), first.getMonth() - 1, 1));
}

// Records (PRs) dated inside [start, end). end is exclusive; without end every
// record from start onward counts. Never counts records before the window.
export function countRecordsInPeriod(records: PersonalRecord[], start: string | null, end?: string): number {
  if (!start) return 0;
  let count = 0;
  for (const r of records || []) {
    if (!r || !r.date) continue;
    if (r.date < start) continue;
    if (end && r.date >= end) continue;
    count += 1;
  }
  return count;
}

// Same-period / previous-period aggregate comparison. Returns null for the
// 'global' period (no meaningful reference period). Temporal boundaries are
// REAL calendar weeks (Monday-based) and calendar months.
export interface PeriodComparison {
  current: SessionPeriodStats;
  previous: SessionPeriodStats;
  hasPrevious: boolean; // previous period contains at least one session
}

export function comparePeriodStats(
  sessions: WorkoutSession[],
  period: StatsPeriod,
  now: Date = new Date()
): PeriodComparison | null {
  if (period === 'global') return null;
  const start = periodStartDate(period, now);
  if (!start) return null;
  const prevStart = previousPeriodStartDate(period, now);
  if (!prevStart) return null;

  const current = computePeriodStats(sessions.filter((s) => s.date >= start));
  const previous = computePeriodStats(sessions.filter((s) => s.date >= prevStart && s.date < start));
  return { current, previous, hasPrevious: previous.sessions > 0 };
}

// Percentage evolution between a current and a previous value, protected against
// division by zero (returns null when not computable).
export function evolutionPercent(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

// Trend of one exercise, reused directly to classify exercises into
// progressing / stagnating / regressing overview lists.
export interface ExerciseTrendItem {
  exerciseId: string;
  name: string;
  trend: ProgressionTrend;
  unit: string;
  current: number; // last recorded value of the starred metric
  previous: number | null;
  best: number | null;
}

export interface ExerciseTrendGroups {
  progressing: ExerciseTrendItem[];
  stagnating: ExerciseTrendItem[];
  regressing: ExerciseTrendItem[];
}

// Classify every exercise with a comparable history (analyzeProgression already
// requires >= 2 comparable points before drawing any conclusion). Exercises with
// an "insufficient" history are simply omitted — never labelled.
export function classifyExerciseTrends(entries: ExercisePerformance[]): ExerciseTrendGroups {
  const groups: ExerciseTrendGroups = { progressing: [], stagnating: [], regressing: [] };
  const ids = new Set<string>();
  for (const p of entries || []) {
    if (p.exerciseId) ids.add(p.exerciseId);
  }
  for (const id of ids) {
    const analysis = analyzeProgression(entries || [], id);
    if (analysis.trend === 'insufficient') continue;
    const sample = (entries || []).filter((e) => e.exerciseId === id);
    const item: ExerciseTrendItem = {
      exerciseId: id,
      name: sample[sample.length - 1]?.exerciseName || id,
      trend: analysis.trend,
      unit: analysis.unit,
      current: analysis.current,
      previous: analysis.previous,
      best: analysis.best,
    };
    if (analysis.trend === 'progressing') groups.progressing.push(item);
    else if (analysis.trend === 'stagnating') groups.stagnating.push(item);
    else groups.regressing.push(item);
  }
  const byName = (a: ExerciseTrendItem, b: ExerciseTrendItem) => a.name.localeCompare(b.name, 'fr');
  return {
    progressing: groups.progressing.sort(byName),
    stagnating: groups.stagnating.sort(byName),
    regressing: groups.regressing.sort(byName),
  };
}

const MONTH_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export interface YearlyMonthTrend {
  key: string; // YYYY-MM
  label: string;
  volumeKg: number;
  sessions: number;
  validatedSets: number;
  durationMinutes: number;
  xpEarned: number;
}

// Monthly buckets (volume, sessions, validated sets, duration, XP) for one year,
// built ONLY from months that actually contain sessions. Chronologically ordered.
export function computeYearlyVolumeTrend(sessions: WorkoutSession[], year: number): YearlyMonthTrend[] {
  const buckets = new Map<string, YearlyMonthTrend>();
  for (const s of sessions || []) {
    const key = (s.date || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(key)) continue;
    if (Number(key.slice(0, 4)) !== year) continue;
    let b = buckets.get(key);
    if (!b) {
      b = {
        key,
        label: MONTH_SHORT[Number(key.slice(5, 7)) - 1] || key,
        volumeKg: 0,
        sessions: 0,
        validatedSets: 0,
        durationMinutes: 0,
        xpEarned: 0,
      };
      buckets.set(key, b);
    }
    b.sessions += 1;
    b.volumeKg += s.totalVolumeKg || 0;
    b.durationMinutes += s.durationMinutes || 0;
    b.xpEarned += computeSessionXp(s.exercises?.length || 0, s.stretchesCount || 0);
    for (const ex of s.exercises || []) {
      for (const set of ex.sets || []) {
        if (isValidCompletedSet(set)) b.validatedSets += 1;
      }
    }
  }
  return Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key));
}

// ----------------------------------------------------------------------------
// LOT E.2 — Statistiques par groupe musculaire.
// Pure, read-only, deterministic helpers. Work with the existing data model:
//   - WorkoutSession.exercises[] are SessionExerciseLog[],
//     each having muscleGroup: MuscleGroup | string.
//   - No IndexedDB, no data mutation, no NaN / Infinity.
// ----------------------------------------------------------------------------

// Les 8 groupes musculaires définis dans types.ts, dans l'ordre cohérent.
export const MuscleGroupList: readonly MuscleGroup[] = [
  'Pectoraux',
  'Dos',
  'Épaules',
  'Bras',
  'Jambes',
  'Abdos',
  'Full Body',
  'Cardio',
];

// Vérifie si une chaîne de caractères correspond à une valeur MuscleGroup valide.
export function isValidMuscleGroup(value: string): value is MuscleGroup {
  return MuscleGroupList.includes(value as MuscleGroup);
}

// Retourne le groupe musculaire lu depuis un SessionExerciseLog.
// Le champ muscleGroup est de type MuscleGroup | string; on normalise ici.
function readMuscleGroupFromLog(muscleGroup: MuscleGroup | string): MuscleGroup | undefined {
  if (typeof muscleGroup === 'string' && isValidMuscleGroup(muscleGroup)) {
    return muscleGroup as MuscleGroup;
  }
  return undefined;
}

// -------------------------------------------------------
// Volume total (kg) pour un groupe musculaire sur l'ensemble des séances.
// -------------------------------------------------------
export function computeMuscleGroupVolume(
  sessions: WorkoutSession[],
  muscleGroup: MuscleGroup
): number {
  let volume = 0;
  for (const session of sessions) {
    for (const log of session.exercises || []) {
      const logGroup = readMuscleGroupFromLog(log.muscleGroup);
      if (logGroup !== muscleGroup) continue;
      for (const set of log.sets || []) {
        if (set.completed && set.mode !== 'timer' && set.reps > 0 && set.weightKg > 0) {
          volume += set.weightKg * set.reps;
        }
      }
    }
  }
  return volume;
}

// -------------------------------------------------------
// Fréquence : nombre de séances distinctes où au moins une série
// du groupe musculaire a été réalisée en mode 'reps' completed.
// -------------------------------------------------------
export function computeMuscleGroupFrequency(
  sessions: WorkoutSession[],
  muscleGroup: MuscleGroup
): number {
  const sessionIds = new Set<string>();
  for (const session of sessions) {
    let found = false;
    for (const log of session.exercises || []) {
      const logGroup = readMuscleGroupFromLog(log.muscleGroup);
      if (logGroup !== muscleGroup) continue;
      for (const set of log.sets || []) {
        if (set.completed && set.mode !== 'timer' && set.reps > 0) {
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (found) sessionIds.add(session.id);
  }
  return sessionIds.size;
}

// -------------------------------------------------------
// Nombre d'exercices distincts (par id) ayant ce groupe musculaire.
// -------------------------------------------------------
export function computeMuscleGroupExerciseCount(
  sessions: WorkoutSession[],
  muscleGroup: MuscleGroup
): number {
  const exerciseIds = new Set<string>();
  for (const session of sessions) {
    for (const log of session.exercises || []) {
      const logGroup = readMuscleGroupFromLog(log.muscleGroup);
      if (logGroup !== muscleGroup) continue;
      exerciseIds.add(log.exerciseId);
    }
  }
  return exerciseIds.size;
}

// -------------------------------------------------------
// Détermine la tendance de progression pour un groupe musculaire.
// Réutilise analyzeProgression sur les exercices du groupe.
// Retourne l'un des 4 valeurs de ProgressionTrend.
// -------------------------------------------------------
export function computeMuscleGroupTrend(
  sessions: WorkoutSession[],
  muscleGroup: MuscleGroup
): 'progressing' | 'stagnating' | 'regressing' | 'insufficient' {
  const exercisePerformances: ExercisePerformance[] = [];
  for (const session of sessions) {
    for (const log of session.exercises || []) {
      const logGroup = readMuscleGroupFromLog(log.muscleGroup);
      if (logGroup !== muscleGroup) continue;
      const sets = log.sets || [];
      const completedSets = sets.filter((s) => s.completed);
      if (completedSets.length === 0) continue;

      let mode: ExerciseMode = 'reps';
      for (const s of completedSets) {
        if (s.mode === 'timer') {
          mode = 'timer';
          break;
        }
      }

      let totalReps = 0;
      let totalDuration = 0;
      let totalVolume = 0;
      let maxWeight = 0;
      for (const s of completedSets) {
        if (s.mode === 'reps') {
          totalReps += s.reps;
          totalVolume += s.weightKg * s.reps;
          if (s.weightKg > maxWeight) maxWeight = s.weightKg;
        } else if (s.mode === 'timer') {
          totalDuration += s.durationSec || 0;
          if (s.weightKg > maxWeight) maxWeight = s.weightKg;
        }
      }

      exercisePerformances.push({
        id: `${session.id}-${log.exerciseId}`,
        exerciseId: log.exerciseId,
        exerciseName: log.exerciseName,
        sessionId: session.id,
        sessionTitle: session.title,
        date: session.date,
        mode,
        setsPlanned: sets.length,
        setsCompleted: completedSets.length,
        totalReps,
        totalDurationSec: totalDuration,
        totalVolumeKg: totalVolume,
        weightUsedKg: maxWeight,
        sets: completedSets.map((s) => ({
          setNumber: s.setNumber,
          weightKg: s.weightKg,
          reps: s.reps,
          mode: s.mode || 'reps',
          durationSec: s.durationSec || 0,
          completed: s.completed,
        })),
        bestSet: completedSets.length > 0
          ? {
              setNumber: completedSets[0].setNumber,
              weightKg: maxWeight,
              reps: totalReps > 0 ? totalReps : completedSets[0].reps,
              durationSec: mode === 'timer' ? totalDuration : undefined,
            }
          : null,
      });
    }
  }

  if (exercisePerformances.length === 0) return 'insufficient';

  const groupedByExercise = new Map<string, ExercisePerformance[]>();
  for (const p of exercisePerformances) {
    const key = p.exerciseId;
    if (!groupedByExercise.has(key)) groupedByExercise.set(key, []);
    groupedByExercise.get(key)!.push(p);
  }

  let progressing = 0;
  let stagnating = 0;
  let regressing = 0;
  let totalWithTrend = 0;

  for (const [, performances] of groupedByExercise) {
    const analysis = analyzeProgression(performances, performances[0].exerciseId);
    if (analysis.trend === 'insufficient') continue;
    totalWithTrend++;
    if (analysis.trend === 'progressing') progressing++;
    else if (analysis.trend === 'stagnating') stagnating++;
    else if (analysis.trend === 'regressing') regressing++;
  }

  if (totalWithTrend === 0) return 'insufficient';

  if (progressing > stagnating && progressing > regressing && progressing > 0) return 'progressing';
  if (stagnating > regressing && stagnating > 0) return 'stagnating';
  if (regressing > 0) return 'regressing';
  return 'insufficient';
}

// -------------------------------------------------------
// Retourne la liste des noms d'exercices principaux associés à un groupe.
// On utilise la bibliothèque d'exercices si disponible.
// -------------------------------------------------------
export function getMuscleGroupExerciseNames(
  sessions: WorkoutSession[],
  muscleGroup: MuscleGroup,
  exercisesById: Record<string, Exercise>
): string[] {
  const names = new Set<string>();
  for (const session of sessions) {
    for (const log of session.exercises || []) {
      const logGroup = readMuscleGroupFromLog(log.muscleGroup);
      if (logGroup !== muscleGroup) continue;
      const exercise = exercisesById[log.exerciseId];
      if (exercise && exercise.name) {
        names.add(exercise.name);
      } else {
        names.add(log.exerciseName || 'Exercice inconnu');
      }
    }
  }
  return Array.from(names);
}

// -------------------------------------------------------
// Point d'entrée : retourne les stats d'un groupe sous forme compacte.
// -------------------------------------------------------
export interface MuscleGroupStats {
  volume: number;
  frequency: number;
  exerciseCount: number;
  trend: 'progressing' | 'stagnating' | 'regressing' | 'insufficient';
}

// LOT E.3 — RPE helpers (pure, no React, no IndexedDB).
// RPE = Rate of Perceived Exertion, échelle 1 à 10, optionnelle.

// Validation simple : 1..10, nulle est acceptée (signifie "non renseigné").
export function isValidRPE(value: number): boolean {
  return Number.isFinite(value) && value >= 1 && value <= 10;
}

// Moyenne RPE sur un ensemble de séries, ignorant les valeurs undefined.
  // Si aucune série ne possède de RPE, retourne null.
  export function computeAverageRPE(sets: WorkoutSet[]): number | null {
    const validRpes = sets
      .map((s) => s.rpe)
      .filter((r): r is number => r !== undefined && isValidRPE(r));
    if (validRpes.length === 0) return null;
    const sum = validRpes.reduce((acc, val) => acc + val, 0);
    return Number((sum / validRpes.length).toFixed(1));
  }

// Statistiques RPE complètes sur un ensemble de séries.
  // Ignore les séries sans RPE (undefined).
  export function computeRPEStats(sets: WorkoutSet[]): {
    average: number | null;
    count: number; // nombre de séries ayant un RPE valide
    min: number | null;
    max: number | null;
  } {
    const validRpes = sets.map((s) => s.rpe).filter((r): r is number => r !== undefined && isValidRPE(r));
    const count = validRpes.length;
    if (count === 0) {
      return { average: null, count, min: null, max: null };
    }
    const sorted = [...validRpes].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    return {
      average: Number((sum / count).toFixed(1)),
      count,
      min: sorted[0],
      max: sorted[count - 1],
    };
  }

export function computeMuscleGroupStats(
  sessions: WorkoutSession[],
  muscleGroup: MuscleGroup,
  exercisesById: Record<string, Exercise>
): MuscleGroupStats {
  return {
    volume: computeMuscleGroupVolume(sessions, muscleGroup),
    frequency: computeMuscleGroupFrequency(sessions, muscleGroup),
    exerciseCount: computeMuscleGroupExerciseCount(sessions, muscleGroup),
    trend: computeMuscleGroupTrend(sessions, muscleGroup),
  };
}