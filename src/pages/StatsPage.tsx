import React, { useMemo, useState } from 'react';
import { UserProfile, WorkoutSession, PersonalRecord, ExercisePerformance, ExerciseBest, Goal, MuscleGroup, Exercise } from '../types';
import { computeMuscleGroupVolume, computeMuscleGroupFrequency, computeMuscleGroupTrend, computeMuscleGroupStats, getMuscleGroupExerciseNames, MuscleGroupList, computeAverageRPE, computeRPEStats } from '../utilsStats';
import { initialExercises } from '../data/initialExercises';
import { LIBRARY_EXPANSION_EXERCISES } from '../data/libraryExpansion';
import { computeBadges, nextBadgeToUnlock, mostRecentlyUnlockedBadge } from '../utilsBadges';
import { computeChallengeProgress, computeWeekKey } from '../utilsChallenges';
import {
  BarChart3,
  TrendingUp,
  Trophy,
  Flame,
  Clock,
  Dumbbell,
  Zap,
  Target,
  Award,
  Sparkles,
  ChevronDown,
  Activity,
  Medal,
  CalendarDays,
  CheckCircle2,
} from 'lucide-react';
import {
  sortPerformancesByDate,
  performanceMetricValue,
  primaryProgressionMetric,
  analyzeProgression,
  suggestNextTarget,
  computeHistoryDeltas,
  metricUnit,
  type ProgressionDelta,
} from '../utilsProgression';
import { computeStreak } from '../utilsStreak';
import { compareLatestPerformances } from '../utilsCompare';
import {
  computePeriodStats,
  computeExercisePopularity,
  filterSessionsByPeriod,
  comparePeriodStats,
  computeSessionsPerWeek,
  computeSessionsPerMonth,
  countSessionsThisWeek,
  countSessionsThisMonth,
  classifyExerciseTrends,
  computeYearlyVolumeTrend,
  computeBestSessions,
  computeSessionAverages,
  summarizeExercise,
  evolutionPercent,
  periodStartDate,
  previousPeriodStartDate,
  countRecordsInPeriod,
  type StatsPeriod,
  type ExerciseTrendItem,
  type YearlyMonthTrend,
} from '../utilsStats';
import { ProgressChart } from '../components/ProgressChart';
import { toLocalDateKey } from '../utilsCalendar';

interface StatsPageProps {
  profile: UserProfile;
  sessions: WorkoutSession[];
  records: PersonalRecord[];
  goals: Goal[];
  exercisePerformances: ExercisePerformance[];
  exerciseBests: ExerciseBest[];
}

export const StatsPage: React.FC<StatsPageProps> = ({
  profile,
  sessions,
  records,
  goals,
  exercisePerformances,
  exerciseBests,
}) => {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [period, setPeriod] = useState<StatsPeriod>('global');

  // LOT E: period-scoped sessions via real calendar boundaries.
  const scopedSessions = useMemo(
    () => filterSessionsByPeriod(sessions, period),
    [sessions, period]
  );

  // Scoped performances (for per-exercise history/analysis).
  const periodStart = useMemo(() => {
    if (period === 'global') return null;
    const now = new Date();
    if (period === 'week') {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const mondayOffset = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - mondayOffset);
      return toLocalDateKey(d);
    }
    return toLocalDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
  }, [period]);

  const scopedPerformances = useMemo(
    () => (periodStart ? exercisePerformances.filter((p) => p.date >= periodStart) : exercisePerformances),
    [exercisePerformances, periodStart]
  );

  // LOT E: period aggregate stats (validated sets, reps, timer, exercises, stretches).
  const periodStats = useMemo(
    () => computePeriodStats(scopedSessions),
    [scopedSessions]
  );

  // LOT E: exercise popularity ranking.
  const exercisePopularity = useMemo(
    () => computeExercisePopularity(scopedSessions),
    [scopedSessions]
  );

  // Existing streak / frequency (recomputed on the new period).
  const streak = useMemo(
    () => computeStreak(scopedSessions.map((s) => s.date)),
    [scopedSessions]
  );

  const weeklyFrequency = useMemo(() => {
    if (scopedSessions.length === 0) return 0;
    const dates = scopedSessions.map((s) => s.date).sort();
    const first = dates[0];
    const last = dates[dates.length - 1];
    const days = Math.max(1, Math.ceil((new Date(last).getTime() - new Date(first).getTime()) / 86400000) + 1);
    return +((scopedSessions.length / days) * 7).toFixed(1);
  }, [scopedSessions]);

  // LOT III: cadence — sessions this week / this month + averages per active week / month.
  const sessionsThisWeek = useMemo(() => countSessionsThisWeek(sessions), [sessions]);
  const sessionsThisMonth = useMemo(() => countSessionsThisMonth(sessions), [sessions]);
  const sessionsAvgPerWeek = useMemo(() => computeSessionsPerWeek(sessions), [sessions]);
  const sessionsAvgPerMonth = useMemo(() => computeSessionsPerMonth(sessions), [sessions]);

  // LOT III: current period vs previous period comparison (week / month only).
  const periodComparison = useMemo(() => comparePeriodStats(sessions, period), [sessions, period]);

  // LOT 5 — Item 14: records & frequency compared across the same boundaries.
  // Records (PRs) carry their own date and are counted inside [prev start, cur start)
  // for the previous period and [cur start, +∞) for the current one.
  const recordPeriodStart = useMemo(() => (period !== 'global' ? periodStartDate(period) : null), [period]);
  const recordPrevStart = useMemo(() => (period !== 'global' ? previousPeriodStartDate(period) : null), [period]);
  const currentPeriodRecords = useMemo(
    () => (recordPeriodStart ? countRecordsInPeriod(records, recordPeriodStart) : records.length),
    [recordPeriodStart, records]
  );
  const previousPeriodRecords = useMemo(
    () => (recordPeriodStart && recordPrevStart ? countRecordsInPeriod(records, recordPrevStart, recordPeriodStart) : 0),
    [recordPeriodStart, recordPrevStart, records]
  );

  // LOT III: exercises classified by their real trajectory.
  const trendGroups = useMemo(() => classifyExerciseTrends(exercisePerformances), [exercisePerformances]);
  const totalTrendItems = trendGroups.progressing.length + trendGroups.stagnating.length + trendGroups.regressing.length;

  // LOT 4 — Item 11: badges are a pure function of the real data (no IDB).
  const badges = useMemo(
    () => computeBadges({
      sessions: sessions || [],
      records: records || [],
      exercisePerformances: exercisePerformances || [],
      goals: goals || [],
      profile: { streakDays: profile.streakDays || 0, bestStreak: profile.bestStreak || 0 },
    }),
    // computeBadges reads the raw stored data, never the derived profile object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, records, goals, profile.streakDays, profile.bestStreak]
  );
  const unlockedBadges = useMemo(() => badges.filter((b) => b.unlocked), [badges]);
  const nextBadge = useMemo(() => nextBadgeToUnlock(badges), [badges]);

  // LOT 4 — Item 12: weekly challenges (deterministic Monday-based week).
  const challengeProgress = useMemo(
    () => computeChallengeProgress({ sessions: sessions || [], records: records || [] }),
    [sessions, records]
  );
  const completedChallengesCount = useMemo(
    () => challengeProgress.filter((c) => c.completed).length,
    [challengeProgress]
  );

  // LOT III: annual evolution — months of the current year that contain sessions.
  const currentYear = new Date().getFullYear();
  const yearlyTrend = useMemo(() => computeYearlyVolumeTrend(sessions, currentYear), [sessions, currentYear]);

  // Item 19.1: best sessions (largest volume / longest) + per-session averages.
  const bestSessions = useMemo(() => computeBestSessions(scopedSessions), [scopedSessions]);
  const sessionAverages = useMemo(() => computeSessionAverages(scopedSessions), [scopedSessions]);

  // Item 19.6: best performances across every exercise (one dominant metric each).
  const bestPerformances = useMemo(() => {
    const rows: { id: string; name: string; label: string; value: number; unit: string; date: string }[] = [];
    for (const b of exerciseBests) {
      if (!b) continue;
      if (b.bestDurationSec?.value != null && b.bestDurationSec.value > 0) {
        rows.push({ id: b.exerciseId, name: b.exerciseName, label: 'Durée', value: b.bestDurationSec.value, unit: 'sec', date: b.bestDurationSec.date });
      } else if (b.bestWeightKg?.value != null && b.bestWeightKg.value > 0) {
        rows.push({ id: b.exerciseId, name: b.exerciseName, label: 'Poids', value: b.bestWeightKg.value, unit: 'kg', date: b.bestWeightKg.date });
      } else if (b.bestReps?.value != null && b.bestReps.value > 0) {
        rows.push({ id: b.exerciseId, name: b.exerciseName, label: 'Reps', value: b.bestReps.value, unit: 'rep', date: b.bestReps.date });
      }
    }
    return rows.sort((a, b) => b.value - a.value).slice(0, 5);
  }, [exerciseBests]);

  // Existing volume / duration aggregates + muscle-group frequency.
  // LOT 13: grouped into one useMemo so a lower-frequency object change
  // (state refresh, period switch) reuses the previous computations.
  const { totalVolume, totalMinutes, avgDuration, muscleEntries, maxMuscleCount } = useMemo(() => {
    const volume = scopedSessions.reduce((acc, s) => acc + s.totalVolumeKg, 0);
    const minutes = scopedSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    const muscleCounts: Record<string, number> = {};
    scopedSessions.forEach((s) => {
      s.exercises.forEach((ex) => {
        muscleCounts[ex.muscleGroup] = (muscleCounts[ex.muscleGroup] || 0) + 1;
      });
    });
    const entries = Object.entries(muscleCounts).sort((a, b) => b[1] - a[1]);
    return {
      totalVolume: volume,
      totalMinutes: minutes,
      avgDuration: scopedSessions.length ? Math.round(minutes / scopedSessions.length) : 0,
      muscleEntries: entries,
      maxMuscleCount: entries[0]?.[1] || 1,
    };
  }, [scopedSessions]);

// LOT E.2 — Selected muscle group for detailed stats.
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<MuscleGroup | null>(null);

  // Exercice ID → Exercise (library), built from the exercise library.
  // Required by computeMuscleGroupStats / getMuscleGroupExerciseNames.
  const exercisesById = useMemo(() => {
    const map: Record<string, Exercise> = {};
    for (const ex of initialExercises) {
      if (ex.id && !map[ex.id]) map[ex.id] = ex;
    }
    for (const ex of LIBRARY_EXPANSION_EXERCISES) {
      if (ex.id && !map[ex.id]) map[ex.id] = ex;
    }
    return map;
  }, []);

  // Detailed stats for the selected muscle group (computed from period-filtered sessions).
  const muscleGroupStats = useMemo(() => {
    if (!selectedMuscleGroup) return null;
    return computeMuscleGroupStats(scopedSessions, selectedMuscleGroup, exercisesById);
  }, [selectedMuscleGroup, scopedSessions, exercisesById]);

  // List of muscle group pills for the selector (deterministic order from the enum).
  const muscleGroupOptions = useMemo(() => MuscleGroupList, []);

  // Per-exercise selector (exercises present in scoped performances).
  const exerciseOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of scopedPerformances) {
      if (!p.exerciseId) continue;
      if (!map.has(p.exerciseId)) map.set(p.exerciseId, p.exerciseName || p.exerciseId);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1], 'fr'))
      .map(([id, name]) => ({ id, name }));
  }, [scopedPerformances]);

  const activeSelection = selectedExerciseId || exerciseOptions[0]?.id || '';

  const selectedEntries = useMemo(
    () => sortPerformancesByDate(scopedPerformances.filter((p) => p.exerciseId === activeSelection)),
    [scopedPerformances, activeSelection]
  );

  // Item 19.4: real per-exercise aggregate + conservative next-target recommendation.
  const selectedSummary = useMemo(() => summarizeExercise(selectedEntries), [selectedEntries]);
  const selectedRecommendation = useMemo(
    () => suggestNextTarget(exercisePerformances, activeSelection),
    [exercisePerformances, activeSelection]
  );

  // Item 19.5: per-row evolution deltas for the history table.
  const selectedDeltas = useMemo(
    () => computeHistoryDeltas(scopedPerformances, activeSelection),
    [scopedPerformances, activeSelection]
  );

  // LOT 9 — Item 9.4: vs dernière séance comparable (même exercice, même
  // métrique réelle). null => comparaison indisponible (métrique incomparable).
  const selectedComparison = useMemo(
    () => compareLatestPerformances(scopedPerformances, activeSelection) || null,
    [scopedPerformances, activeSelection]
  );

  const selectedAnalysis = useMemo(
    () => analyzeProgression(exercisePerformances, activeSelection),
    [exercisePerformances, activeSelection]
  );

  const selectedBest = useMemo(() => {
    if (!periodStart) return exerciseBests.find((b) => b.exerciseId === activeSelection) || null;
    const entries = scopedPerformances.filter((p) => p.exerciseId === activeSelection);
    if (entries.length === 0) return null;
    let bestWeightKg: any = null, bestReps: any = null, bestVolumeKg: any = null, bestDurationSec: any = null, lastDate = '';
    for (const e of entries) {
      if (e.date > lastDate) lastDate = e.date;
      for (const s of e.sets) {
        if (!s.completed) continue;
        if (!bestWeightKg || s.weightKg > bestWeightKg.value || (s.weightKg === bestWeightKg.value && s.reps > (bestWeightKg.reps || 0))) bestWeightKg = { value: s.weightKg, reps: s.reps, date: e.date };
        if (s.mode === 'reps') {
          if (!bestReps || s.reps > bestReps.value || (s.reps === bestReps.value && s.weightKg > (bestReps.weightKg || 0))) bestReps = { value: s.reps, weightKg: s.weightKg, date: e.date };
          const vol = (s.weightKg || 0) * s.reps;
          if (!bestVolumeKg || vol > bestVolumeKg.value) bestVolumeKg = { value: vol, date: e.date };
        } else if (s.mode === 'timer') {
          if (!bestDurationSec || s.durationSec > bestDurationSec.value) bestDurationSec = { value: s.durationSec, weightKg: s.weightKg, date: e.date };
        }
      }
    }
    return { exerciseId: activeSelection, exerciseName: selectedEntries[selectedEntries.length - 1]?.exerciseName || activeSelection, bestWeightKg, bestReps, bestVolumeKg, bestDurationSec, lastPerformedDate: lastDate || null, timesPerformed: new Set(entries.map((e) => e.id)).size, updatedAt: lastDate ? lastDate + 'T00:00:00' : new Date().toISOString() };
  }, [periodStart, scopedPerformances, activeSelection, exerciseBests, selectedEntries]);

  const selectedName = selectedEntries[selectedEntries.length - 1]?.exerciseName || selectedBest?.exerciseName || 'Exercice';

  // Chart data: convert selectedEntries to shared ProgressChart points.
  const chartPoints = useMemo(() => {
    if (selectedEntries.length === 0) return [];
    return selectedEntries.map((e) => ({
      date: e.date,
      value: performanceMetricValue(e, primaryProgressionMetric(e)),
    }));
  }, [selectedEntries]);

  const chartMetricLabel = useMemo(() => {
    if (selectedEntries.length === 0) return 'Répétitions';
    const m = primaryProgressionMetric(selectedEntries[selectedEntries.length - 1]);
    switch (m) {
      case 'duration': return 'Durée (sec)';
      case 'weight': return 'Poids max (kg)';
      case 'volume': return 'Volume (kg)';
      default: return 'Répétitions';
    }
  }, [selectedEntries]);

  const periodLabel: Record<StatsPeriod, string> = {
    week: 'Semaine',
    month: 'Mois',
    global: 'Global',
  };

  return (
    <div id="page-stats" className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-violet-400" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider text-white">
            Statistiques & Analyses
          </h1>
        </div>
        <p className="text-sm text-zinc-400 mt-1">
          Suivez l'évolution de vos charges, de votre volume et la répartition de vos entraînements.
        </p>
      </div>

      {/* LOT E: Period navigation — Semaine / Mois / Global */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Période
        </span>
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 p-1 rounded-2xl" role="group" aria-label="Filtrer par période">
          {([
            ['week', 'Semaine'],
            ['month', 'Mois'],
            ['global', 'Global'],
          ] as [StatsPeriod, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              aria-pressed={period === key}
              data-testid={`stats-period-${key}`}
              className={`px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                period === key ? 'bg-violet-600 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* LOT E: Period aggregate stats cards */}
      <div className="space-y-3">
        {/* Séances — large card */}
        <div className="sport-card rounded-3xl p-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Séances — {periodLabel[period]}</span>
            <div className="w-7 h-7 rounded-lg bg-violet-600/20 flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-violet-400" />
            </div>
          </div>
          <div className="font-display text-3xl font-bold text-white" data-testid="stats-sessions">
            {periodStats.sessions}
          </div>
          <div className="text-[11px] text-zinc-400 font-medium">
            {periodStats.sessions === 0 ? 'Aucune séance sur cette période' : `séance${periodStats.sessions > 1 ? 's' : ''} validée${periodStats.sessions > 1 ? 's' : ''}`}
          </div>
        </div>

        {/* 2-col: Séries + Répétitions */}
        <div className="grid grid-cols-2 gap-4">
          <div className="sport-card rounded-3xl p-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Séries validées</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div className="font-display text-3xl font-bold text-emerald-300" data-testid="stats-sets">
              {periodStats.validatedSets}
            </div>
            <div className="text-[11px] text-zinc-400 font-medium">
              {periodStats.timerSetCount > 0 ? `dont ${periodStats.timerSetCount} timer` : ''}
            </div>
          </div>

          <div className="sport-card rounded-3xl p-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Répétitions</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div className="font-display text-3xl font-bold text-amber-300" data-testid="stats-reps">
              {periodStats.repCount.toLocaleString('fr-FR')}
            </div>
            <div className="text-[11px] text-zinc-400 font-medium">
              {periodStats.timerSetCount > 0 ? 'séries timer exclues' : 'total répétitions'}
            </div>
          </div>
        </div>

        {/* 2-col: Exercices + Étirements */}
        <div className="grid grid-cols-2 gap-4">
          <div className="sport-card rounded-3xl p-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Exercices</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Activity className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <div className="font-display text-3xl font-bold text-indigo-300" data-testid="stats-exercises">
              {periodStats.uniqueExercises}
            </div>
            <div className="text-[11px] text-zinc-400 font-medium">exercices réalisés</div>
          </div>

          <div className="sport-card rounded-3xl p-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Étirements</span>
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-sky-400" />
              </div>
            </div>
            <div className="font-display text-3xl font-bold text-sky-300" data-testid="stats-stretches">
              {periodStats.stretchCount}
            </div>
            <div className="text-[11px] text-zinc-400 font-medium">étirements réalisés</div>
          </div>
        </div>
      </div>

      {/* LOT 5 — Item 14: current period vs previous period comparison (week / month only) */}
      {period !== 'global' && periodComparison && (
        <div className="sport-card rounded-3xl p-5 sm:p-6 space-y-4" data-testid="stats-comparison">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-400" />
              <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">
                {periodLabel[period]} en cours vs {periodLabel[period].toLowerCase()} précédente
              </h2>
            </div>
            <span className="text-[11px] text-zinc-500 font-medium">
              Différence absolue & évolution en % — protection 0 / NaN / ∞.
            </span>
          </div>
          {!periodComparison.hasPrevious && currentPeriodRecords === 0 ? (
            <div className="text-center py-6 px-4 rounded-2xl bg-white/5 border border-white/5 text-xs text-zinc-400">
              Pas encore de séance ni de record sur la période précédente : la comparaison sera disponible dès la prochaine.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <ComparisonCell
                label="Séances"
                current={periodComparison.current.sessions}
                previous={periodComparison.previous.sessions}
              />
              <ComparisonCell
                label="Séries validées"
                current={periodComparison.current.validatedSets}
                previous={periodComparison.previous.validatedSets}
              />
              <ComparisonCell
                label="Répétitions"
                current={periodComparison.current.repCount}
                previous={periodComparison.previous.repCount}
                format={(v) => v.toLocaleString('fr-FR')}
              />
              <ComparisonCell
                label="Volume"
                unit="kg"
                current={periodComparison.current.volumeKg}
                previous={periodComparison.previous.volumeKg}
                format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`)}
              />
              <ComparisonCell
                label="Durée"
                unit="min"
                current={periodComparison.current.durationMinutes}
                previous={periodComparison.previous.durationMinutes}
                format={(v) => formatMinutes(v)}
              />
              <ComparisonCell
                label="Exercices"
                current={periodComparison.current.uniqueExercises}
                previous={periodComparison.previous.uniqueExercises}
              />
              <ComparisonCell
                label="Étirements"
                current={periodComparison.current.stretchCount}
                previous={periodComparison.previous.stretchCount}
              />
              <ComparisonCell
                label="XP gagnés"
                current={periodComparison.current.xpEarned}
                previous={periodComparison.previous.xpEarned}
                format={(v) => v.toLocaleString('fr-FR')}
              />
              <ComparisonCell
                label="Records (PR)"
                current={currentPeriodRecords}
                previous={previousPeriodRecords}
              />
              <ComparisonCell
                label="Fréquence"
                unit="/sem"
                current={periodComparison.current.frequencyPerWeek}
                previous={periodComparison.previous.frequencyPerWeek}
                format={(v) => (Math.round(v * 10) / 10).toFixed(1)}
              />
            </div>
          )}
        </div>
      )}

      {/* Streak + frequency (existing, recomputed on the new period) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="frequency-card">
        <div className="sport-card rounded-3xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
          </div>
          <div>
            <div className="text-[11px] text-zinc-400 font-medium">Série en cours</div>
            <div className="font-display text-2xl font-bold text-amber-300 leading-none" data-testid="stat-streak">
              {streak} <span className="text-xs text-zinc-400 font-normal">jour{streak > 1 ? 's' : ''}</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Record : {profile.bestStreak} jours</div>
          </div>
        </div>

        <div className="sport-card rounded-3xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-[11px] text-zinc-400 font-medium">Volume Total</div>
            <div className="font-display text-2xl font-bold text-emerald-300 leading-none" data-testid="stat-volume">
              {(totalVolume / 1000).toFixed(1)}k <span className="text-xs text-zinc-400 font-normal">kg</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">{period === 'global' ? 'Cumulé' : `Sur ${periodLabel[period].toLowerCase()}`}</div>
          </div>
        </div>

        <div className="sport-card rounded-3xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <div className="text-[11px] text-zinc-400 font-medium">Fréquence hebdo</div>
            <div className="font-display text-2xl font-bold text-violet-300 leading-none" data-testid="stat-weekly-freq">
              {weeklyFrequency}<span className="text-xs text-zinc-400 font-normal">/sem</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Moyenne sur la période</div>
          </div>
        </div>
      </div>

      {/* LOT III: cadence — this week / this month + averages */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stats-cadence">
        <div className="sport-card rounded-3xl p-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Séances cette semaine</span>
            <div className="w-7 h-7 rounded-lg bg-violet-600/20 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-violet-400" />
            </div>
          </div>
          <div className="font-display text-3xl font-bold text-white" data-testid="stats-sessions-week">
            {sessionsThisWeek}
          </div>
          <div className="text-[11px] text-zinc-400 font-medium">du lundi à aujourd'hui</div>
        </div>

        <div className="sport-card rounded-3xl p-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Séances ce mois</span>
            <div className="w-7 h-7 rounded-lg bg-violet-600/20 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-violet-400" />
            </div>
          </div>
          <div className="font-display text-3xl font-bold text-white" data-testid="stats-sessions-month">
            {sessionsThisMonth}
          </div>
          <div className="text-[11px] text-zinc-400 font-medium">mois en cours</div>
        </div>

        <div className="sport-card rounded-3xl p-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Séances / semaine (moy.)</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="font-display text-3xl font-bold text-indigo-300" data-testid="stats-avg-week">
            {sessionsAvgPerWeek}
          </div>
          <div className="text-[11px] text-zinc-400 font-medium">sur les semaines actives</div>
        </div>

        <div className="sport-card rounded-3xl p-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Séances / mois (moy.)</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="font-display text-3xl font-bold text-indigo-300" data-testid="stats-avg-month">
            {sessionsAvgPerMonth}
          </div>
          <div className="text-[11px] text-zinc-400 font-medium">sur les mois actifs</div>
        </div>
      </div>

      {/* Item 19.1: best sessions + per-session averages */}
      {scopedSessions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="stats-best-sessions">
          <div className="sport-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h2 className="font-display text-xl font-bold uppercase tracking-wider text-white">
                Meilleures séances
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="text-[11px] font-semibold text-zinc-400">Plus gros volume</div>
                <div className="font-display text-xl font-bold text-emerald-300" data-testid="stats-best-session-volume">
                  {bestSessions.bestVolume ? formatVolume(bestSessions.bestVolume.value) : '—'}
                  <span className="text-xs text-zinc-400 font-normal"> kg</span>
                </div>
                <div className="text-[10px] text-zinc-500">
                  {bestSessions.bestVolume
                    ? `${bestSessions.bestVolume.title} · ${formatDate(bestSessions.bestVolume.date)}`
                    : 'Aucune séance'}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="text-[11px] font-semibold text-zinc-400">Séance la plus longue</div>
                <div className="font-display text-xl font-bold text-sky-300" data-testid="stats-best-session-duration">
                  {bestSessions.longest ? formatMinutes(bestSessions.longest.value) : '—'}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {bestSessions.longest
                    ? `${bestSessions.longest.title} · ${formatDate(bestSessions.longest.date)}`
                    : 'Aucune séance'}
                </div>
              </div>
            </div>
          </div>

          <div className="sport-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-violet-400" />
              <h2 className="font-display text-xl font-bold uppercase tracking-wider text-white">
                Moyennes par séance
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                <div className="text-[11px] font-semibold text-zinc-400">Durée</div>
                <div className="font-display text-xl font-bold text-white" data-testid="stats-avg-duration">
                  {formatMinutes(sessionAverages.avgDurationMinutes)}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                <div className="text-[11px] font-semibold text-zinc-400">Volume</div>
                <div className="font-display text-xl font-bold text-emerald-300" data-testid="stats-avg-volume">
                  {formatVolume(sessionAverages.avgVolumeKg)}
                  <span className="text-xs text-zinc-400 font-normal"> kg</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                <div className="text-[11px] font-semibold text-zinc-400">Séries validées</div>
                <div className="font-display text-xl font-bold text-violet-300" data-testid="stats-avg-sets">
                  {sessionAverages.avgValidatedSets}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOT III: total training duration + personal records count */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sport-card rounded-3xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="text-[11px] text-zinc-400 font-medium">Durée totale d'entraînement</div>
            <div className="font-display text-2xl font-bold text-sky-300 leading-none" data-testid="stat-duration">
              {formatMinutes(totalMinutes)}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              {scopedSessions.length > 0 ? `en moyenne ${formatMinutes(avgDuration)} / séance` : 'Aucune séance enregistrée'}
            </div>
          </div>
        </div>

        <div className="sport-card rounded-3xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-[11px] text-zinc-400 font-medium">Records personnels (PR)</div>
            <div className="font-display text-2xl font-bold text-amber-300 leading-none" data-testid="stat-records">
              {records.length}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              {records.length > 0 ? 'meilleurs charges enregistrées (poids)' : 'Aucun record pour le moment'}
            </div>
          </div>
        </div>
      </div>

      {/* LOT E: Exercices les plus pratiqués */}
      {exercisePopularity.length > 0 && (
        <div className="sport-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-violet-400" />
            <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">
              Exercices les plus pratiqués
            </h2>
          </div>
          <div className="space-y-2">
            {exercisePopularity.slice(0, 5).map((ep, idx) => {
              const pct = exercisePopularity[0]?.sessionCount
                ? Math.round((ep.sessionCount / exercisePopularity[0].sessionCount) * 100)
                : 0;
              return (
                <div key={ep.exerciseId} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-zinc-200">
                      {idx === 0 && <Medal className="inline w-3.5 h-3.5 text-amber-400 mr-1.5" />}
                      {ep.name}
                    </span>
                    <span className="text-violet-300">{ep.sessionCount} séance{ep.sessionCount > 1 ? 's' : ''}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-violet-600 to-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Item 19.6: best performances across all exercises */}
      {bestPerformances.length > 0 && (
        <div className="sport-card rounded-3xl p-6 space-y-4" data-testid="stats-best-performances">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">
              Meilleures performances
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {bestPerformances.map((bp, idx) => (
              <div
                key={bp.id}
                className={`p-4 rounded-2xl border space-y-1.5 ${
                  idx === 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  {idx === 0 && <Medal className="inline w-3.5 h-3.5 text-amber-400 mr-1.5" />}
                  {bp.name}
                </div>
                <div className="font-display text-xl font-bold text-amber-300">
                  {formatMetric(bp.value, bp.unit)}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {bp.label} · {formatDate(bp.date)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LOT E + existing: Exercise history / progression section */}
      <div className="sport-card rounded-3xl p-6 space-y-4" data-testid="ex-progression-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet-400" />
            <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">
              Historique de l'exercice
            </h2>
          </div>
          <span className="text-xs text-zinc-400">Performances réelles</span>
        </div>

        {/* Exercise selector */}
        <div className="relative">
          <select
            value={activeSelection}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            className="w-full appearance-none bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 cursor-pointer pr-10"
            aria-label="Sélectionner un exercice"
            data-testid="stats-exercise-selector"
          >
            {exerciseOptions.length === 0 && <option value="">Aucun exercice enregistré</option>}
            {exerciseOptions.map((o) => (
              <option key={o.id} value={o.id} className="bg-zinc-900 text-white">
                {o.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {exerciseOptions.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl bg-white/5 border border-white/5 text-zinc-400 space-y-2" data-testid="stats-exercise-history">
            <TrendingUp className="w-8 h-8 mx-auto text-zinc-500 opacity-60" />
            <p className="font-semibold text-zinc-300 text-sm">Aucune performance enregistrée.</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Terminez des séances avec des séries validées pour commencer à suivre la progression de chaque exercice.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="font-display text-2xl font-bold text-white" data-testid="stats-exercise-history">{selectedName}</div>
                <div className="text-[11px] text-zinc-400">
                  {selectedEntries.length} séance{selectedEntries.length > 1 ? 's' : ''} · dernière le{' '}
                  {selectedEntries[selectedEntries.length - 1]
                    ? new Date(selectedEntries[selectedEntries.length - 1].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '—'}
                </div>
              </div>
            </div>

            {/* Analysis summary (LOT D reuse, no conversion) */}
            {selectedAnalysis && selectedAnalysis.historyCount > 0 && (
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span>
                  Tendance : <strong className={
                    selectedAnalysis.trend === 'progressing' ? 'text-emerald-400' :
                    selectedAnalysis.trend === 'regressing' ? 'text-rose-400' :
                    selectedAnalysis.trend === 'stagnating' ? 'text-amber-300' : 'text-zinc-300'
                  }>
                    {selectedAnalysis.trend === 'progressing' ? 'Progression' :
                     selectedAnalysis.trend === 'regressing' ? 'Régression' :
                     selectedAnalysis.trend === 'stagnating' ? 'Stagnation' : 'Insuffisant'}
                  </strong>
                </span>
                <span>Dernière : <strong className="text-white">{selectedAnalysis.current} {selectedAnalysis.unit}</strong></span>
                {selectedAnalysis.best != null && <span>Record : <strong className="text-amber-300">{selectedAnalysis.best} {selectedAnalysis.unit}</strong></span>}
              </div>
            )}

            {/* Item 19.4: real aggregate + conservative next-target recommendation */}
            {selectedSummary.sessions > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5" data-testid="stats-exercise-analysis">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Séances</div>
                  <div className="font-display text-lg font-bold text-white" data-testid="stats-analysis-sessions">{selectedSummary.sessions}</div>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Séries validées</div>
                  <div className="font-display text-lg font-bold text-white" data-testid="stats-analysis-sets">{selectedSummary.validatedSets}</div>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    {selectedSummary.mode === 'timer' ? 'Durée totale' : 'Répétitions'}
                  </div>
                  <div className="font-display text-lg font-bold text-white" data-testid="stats-analysis-reps">
                    {selectedSummary.mode === 'timer'
                      ? `${selectedSummary.totalDurationSec} s`
                      : selectedSummary.totalReps.toLocaleString('fr-FR')}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Poids utilisé</div>
                  <div className="font-display text-lg font-bold text-white" data-testid="stats-analysis-weight">
                    {selectedSummary.weightUsedKg > 0 ? `${selectedSummary.weightUsedKg} kg` : '—'}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Volume total</div>
                  <div className="font-display text-lg font-bold text-emerald-300" data-testid="stats-analysis-volume">
                    {selectedSummary.mode === 'timer' ? '—' : formatVolume(selectedSummary.totalVolumeKg)}
                  </div>
                </div>
              </div>
            )}

            {selectedRecommendation && (
              <div className="rounded-2xl bg-violet-600/10 border border-violet-500/30 px-4 py-3 text-xs text-zinc-300" data-testid="stats-exercise-recommendation">
                <span className="font-bold text-violet-300 uppercase tracking-wider text-[10px] mr-2">Objectif suggéré</span>
                {selectedRecommendation.trend === 'insufficient' ? (
                  'Historique trop court : quelques séances de plus donneront une recommandation fiable.'
                ) : (
                  <>
                    {selectedRecommendation.last} → <strong className="text-white">{selectedRecommendation.target} {selectedRecommendation.unit}</strong>
                    <span className="text-zinc-500"> · {selectedRecommendation.reason}</span>
                  </>
                )}
              </div>
            )}

            {/* Best performance cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
                  <Medal className="w-3.5 h-3.5 text-amber-400" /> Meilleur Poids
                </div>
                {selectedBest?.bestWeightKg?.value != null ? (
                  <div className="font-display text-2xl font-bold text-amber-300" data-testid="ex-best-weight">
                    {formatMetric(selectedBest.bestWeightKg.value, 'kg')}
                  </div>
                ) : (
                  <div className="font-display text-2xl font-bold text-zinc-600" data-testid="ex-best-weight">—</div>
                )}
                <div className="text-[10px] text-zinc-500" data-testid="ex-best-weight-date">
                  {selectedBest?.bestWeightKg?.date ? formatDate(selectedBest.bestWeightKg.date) : '—'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Meilleures Reps
                </div>
                {selectedBest?.bestReps?.value != null ? (
                  <div className="font-display text-2xl font-bold text-emerald-300" data-testid="ex-best-reps">
                    {selectedBest.bestReps.value} <span className="text-xs text-zinc-400 font-normal">reps</span>
                  </div>
                ) : (
                  <div className="font-display text-2xl font-bold text-zinc-600" data-testid="ex-best-reps">—</div>
                )}
                <div className="text-[10px] text-zinc-500" data-testid="ex-best-reps-date">
                  {selectedBest?.bestReps?.date ? formatDate(selectedBest.bestReps.date) : '—'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
                  <Trophy className="w-3.5 h-3.5 text-violet-400" /> Meilleur Volume
                </div>
                {selectedBest?.bestVolumeKg?.value != null ? (
                  <div className="font-display text-2xl font-bold text-violet-300" data-testid="ex-best-volume">
                    {formatMetric(selectedBest.bestVolumeKg.value, 'kg')}
                  </div>
                ) : (
                  <div className="font-display text-2xl font-bold text-zinc-600" data-testid="ex-best-volume">—</div>
                )}
                <div className="text-[10px] text-zinc-500" data-testid="ex-best-volume-date">
                  {selectedBest?.bestVolumeKg?.date ? formatDate(selectedBest.bestVolumeKg.date) : '—'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
                  <Clock className="w-3.5 h-3.5 text-sky-400" /> Meilleure Durée
                </div>
                {selectedBest?.bestDurationSec?.value != null ? (
                  <div className="font-display text-2xl font-bold text-sky-300" data-testid="ex-best-duration">
                    {selectedBest.bestDurationSec.value} <span className="text-xs text-zinc-400 font-normal">sec</span>
                  </div>
                ) : (
                  <div className="font-display text-2xl font-bold text-zinc-600" data-testid="ex-best-duration">—</div>
                )}
                <div className="text-[10px] text-zinc-500" data-testid="ex-best-duration-date">
                  {selectedBest?.bestDurationSec?.date ? formatDate(selectedBest.bestDurationSec.date) : '—'}
                </div>
              </div>
            </div>

            {/* LOT 9 — Item 9.4: progression vs dernière séance comparable */}
            <div
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
              data-testid="stats-comparison-latest"
            >
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
                Progression — dernière performance comparable
              </div>
              {!selectedComparison || selectedEntries.length < 2 ? (
                <div className="text-xs text-zinc-500">
                  Comparaison indisponible : il faut au moins deux performances
                  comparables de cet exercice ({selectedEntries.length} enregistrée{selectedEntries.length > 1 ? 's' : ''}).
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                  <div className="text-zinc-400">
                    <span className="font-semibold text-zinc-300">{selectedComparison.previousValue} {selectedComparison.unit}</span>
                    <span className="text-zinc-500"> — {formatDate(selectedComparison.previousDate)}</span>
                  </div>
                  <span className="text-zinc-500">→</span>
                  <div>
                    <span className="font-bold text-white">{selectedComparison.currentValue} {selectedComparison.unit}</span>
                    <span className="text-zinc-500"> — {formatDate(selectedComparison.currentDate)}</span>
                  </div>
                  <span
                    className={`font-bold ${
                      Math.abs(selectedComparison.deltaAbs) < 1e-9
                        ? 'text-zinc-400'
                        : selectedComparison.deltaAbs > 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {Math.abs(selectedComparison.deltaAbs) < 1e-9
                      ? '='
                      : `${selectedComparison.deltaAbs > 0 ? '▲ +' : '▼ '}${selectedComparison.deltaAbs}`}
                  </span>
                  {selectedComparison.deltaPercent !== null && (
                    <span
                      className={`font-bold ${
                        selectedComparison.deltaPercent === 0
                          ? 'text-zinc-400'
                          : selectedComparison.deltaPercent > 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      ({selectedComparison.deltaPercent > 0 ? '+' : ''}{selectedComparison.deltaPercent}%)
                    </span>
                  )}
                  {selectedComparison.isNewBest && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                      <Medal className="w-3 h-3" /> Record
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* LOT E: shared chart */}
            {chartPoints.length > 0 ? (
              <div className="pt-1" data-testid="stats-chart">
                <ProgressChart
                  points={chartPoints}
                  metricLabel={chartMetricLabel}
                  title={`Évolution — ${selectedName}`}
                />
              </div>
            ) : (
              <div className="pt-1 text-center py-6 rounded-2xl bg-white/5 border border-white/5 text-xs text-zinc-500">
                Pas encore de courbe pour cet exercice.
              </div>
            )}
          {/* Item 19.5: history table (mode-aware, real values only) */}
            {selectedEntries.length > 0 && (
              <HistoryTable entries={selectedEntries} deltas={selectedDeltas} />
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Muscle group distribution (7 Cols) */}
        <div className="lg:col-span-7 sport-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">
                Répartition par Groupe Musculaire
              </h2>
            </div>
            <span className="text-xs text-zinc-400">Fréquence</span>
          </div>

<div className="space-y-3 pt-2">
            {muscleEntries.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-2xl bg-white/5 border border-white/5 text-zinc-400 text-xs">
                <Dumbbell className="w-8 h-8 mx-auto mb-2 text-zinc-500 opacity-60" />
                <p className="font-semibold text-zinc-300">Aucune donnée musculaire disponible.</p>
                <p className="text-[11px] text-zinc-500 mt-1">La répartition de vos groupes musculaires s'affichera dès votre première séance enregistrée.</p>
              </div>
            ) : (
              muscleEntries.map(([muscle, count]) => {
                const percent = Math.round((count / maxMuscleCount) * 100);
                return (
                  <div key={muscle} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-zinc-200">{muscle}</span>
                      <span className="text-violet-300">{count} sollicitations</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-violet-600 to-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
</div>
        </div>

        {/* LOT E.2 — Detailed muscle group stats */}
        <div className="lg:col-span-12 mt-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            {/* Muscle group selector pills */}
            <div className="lg:w-80 flex flex-wrap gap-2">
              <span className="text-xs text-zinc-400 uppercase tracking-wider">Groupe musculaire</span>
              {muscleGroupOptions.map((mg) => (
                <button
                  key={mg}
                  type="button"
                  onClick={() => setSelectedMuscleGroup(mg)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedMuscleGroup === mg
                      ? 'bg-violet-600 text-white shadow'
                      : 'text-zinc-400 hover:text-white border border-white/10'
                  }`}
                  aria-label={`Afficher les stats pour ${mg}`}
                >
                  {mg}
                </button>
              ))}
            </div>

            {/* Detailed stats card for selected group */}
            <div className="lg:w-[] sport-card rounded-3xl p-6 min-w-0">
              {selectedMuscleGroup ? (
                <div className="space-y-4">
                  <h3 className="font-display text-lg font-bold uppercase tracking-wider text-white">
                    {selectedMuscleGroup}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-zinc-400 text-xs uppercase tracking-wider">Volume</div>
                      <div className="font-display text-3xl font-bold text-white">{muscleGroupStats?.volume} kg</div>
                    </div>
                    <div>
                      <div className="text-zinc-400 text-xs uppercase tracking-wider">Fréquence</div>
                      <div className="font-display text-3xl font-bold text-white">{muscleGroupStats?.frequency} séances</div>
                    </div>
<div>
                      <div className="text-zinc-400 text-xs uppercase tracking-wider">Tendance</div>
                      <div className={`font-display text-3xl font-bold text-white ${muscleGroupStats?.trend === 'progressing' ? 'text-emerald-400' : muscleGroupStats?.trend === 'stagnating' ? 'text-violet-300' : muscleGroupStats?.trend === 'regressing' ? 'text-rose-300' : 'text-zinc-500'}`}>
                        {muscleGroupStats?.trend === 'progressing'
                          ? 'Progression'
                          : muscleGroupStats?.trend === 'stagnating'
                            ? 'Stagnation'
                            : muscleGroupStats?.trend === 'regressing'
                              ? 'Régression'
                              : 'Données insuffisantes'}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-400 text-xs uppercase tracking-wider">Exercices</div>
                      <div className="space-y-1 line-clamp-3">
                        {muscleGroupStats &&
                        muscleGroupStats.exerciseCount > 0 &&
                        (
                          getMuscleGroupExerciseNames(scopedSessions, selectedMuscleGroup, exercisesById).map((name, i) => (
                            <span key={i} className="text-zinc-300 text-xs">
                              • {name}
                            </span>
                          ))
                        )}
                        {muscleGroupStats?.exerciseCount === 0 && (
                          <span className="text-zinc-500 text-xs">Aucun exercice</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-wider">Sélectionnez un groupe musculaire ci-dessus pour afficher les statistiques détaillées.</p>
                  <p className="text-zinc-400 text-xs mt-1">Choisissez parmi : {MuscleGroupList.map((g) => g).join(', ')}</p>
                </div>
              )}
            </div>
          </div>
</div>

        {/* LOT E.3 — RPE par série */}
        <div className="lg:col-span-12 mt-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            {/* RPE summary card */}
            <div className="lg:w-[] sport-card rounded-3xl p-6 min-w-0">
              <h3 className="font-display text-lg font-bold uppercase tracking-wider text-white">
                RPE perçue (RPE)
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-zinc-400 text-xs uppercase tracking-wider">Moyenne</div>
                  <div className="font-display text-3xl font-bold text-white">
{scopedSessions.length > 0
                      ? computeAverageRPE(
                        scopedSessions.flatMap((s) => s.exercises.map((log) => log.sets)).flat()
                      )
                      : null}
                </div>
                <div>
                  <div className="text-zinc-400 text-xs uppercase tracking-wider">Séries renseignées</div>
                  <div className="font-display text-3xl font-bold text-white">
                    {scopedSessions.length > 0
                      ? computeRPEStats(
                        scopedSessions.flatMap((s) => s.exercises.map((log) => log.sets)).flat()
                      ).count
                    : '0'}
                </div>
<div>
                  <div className="text-zinc-400 text-xs uppercase tracking-wider">Minimum</div>
                  <div className={`font-display text-3xl font-bold text-white ${computeRPEStats(scopedSessions.flatMap((s) => s.exercises.map((log) => log.sets)).flat()).min !== null ? 'text-emerald-400' : 'text-zinc-500'}`}>{computeRPEStats(scopedSessions.flatMap((s) => s.exercises.map((log) => log.sets)).flat()).min ?? '—'}</div>
                </div>
<div>
                  <div className="text-zinc-400 text-xs uppercase tracking-wider">Maximum</div>
                  <div className={`font-display text-3xl font-bold text-white ${computeRPEStats(scopedSessions.flatMap((s) => s.exercises.map((log) => log.sets)).flat()).max !== null ? 'text-emerald-400' : 'text-zinc-500'}`}>{computeRPEStats(scopedSessions.flatMap((s) => s.exercises.map((log) => log.sets)).flat()).max ?? '—'}</div>
                </div>
              </div>
{scopedSessions.length > 0 &&
              computeRPEStats(
                scopedSessions.flatMap((s) => s.exercises.map((log) => log.sets)).flat()
              ).count === 0 && (
                <p className="text-zinc-500 text-xs mt-2">Aucun RPE renseigné</p>
              )}
            </div>
          </div>
        </div>
        </div>

{/* Level Progression & Gamification Ladder (5 Cols) */}
        <div className="lg:col-span-5 sport-card rounded-3xl p-6 space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-violet-900/50">
              <Zap className="w-8 h-8 text-white fill-white" />
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-violet-400">Grade Athlète</div>
              <div className="font-display text-3xl font-bold text-white">Niveau {profile.level}</div>
            </div>

            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="bg-violet-500 h-full rounded-full"
                style={{ width: profile.nextLevelXp > 0 ? (profile.currentXp / profile.nextLevelXp) * 100 + '%' : '0%' }}
              />
            </div>
            <div className="text-xs text-zinc-400 font-semibold">
              {profile.currentXp} / {profile.nextLevelXp} XP ({profile.nextLevelXp > 0 ? Math.round((profile.currentXp / profile.nextLevelXp) * 100) : 0}%)
            </div>
          </div>

          {/* LOT 4 — Item 11: badges computed live from real data */}
          <div className="space-y-2" data-testid="stats-badges">
            <div className="flex items-center gap-2 pt-1">
              <Medal className="w-4 h-4 text-amber-300" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-200/80">
                Badges débloqués — {unlockedBadges.length} / {badges.length}
              </span>
            </div>
            {unlockedBadges.length === 0 && (
              <div className="text-[11px] text-zinc-500 pb-1">
                Terminez votre première séance validée pour débloquer votre premier badge.
              </div>
            )}
            {unlockedBadges.slice(-3).reverse().map((b) => (
              <div
                key={b.id}
                data-testid={"badge-" + b.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-100 truncate">{b.name}</div>
                    <div className="text-[10px] text-zinc-500 truncate">
                      {b.unlockedAt ? 'Débloqué le ' + new Date(b.unlockedAt).toLocaleDateString('fr-FR') : 'Débloqué'}
                    </div>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
            ))}
            {nextBadge && unlockedBadges.length > 0 && (
              <div
                data-testid="stats-next-badge"
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="min-w-0">
                  <div className="text-[11px] text-zinc-400">Prochain badge</div>
                  <div className="text-xs font-semibold text-zinc-100 truncate">{nextBadge.name}</div>
                </div>
                <span className="text-[11px] font-bold text-violet-300 shrink-0">
                  {nextBadge.progress?.current} / {nextBadge.progress?.target}
                </span>
              </div>
            )}
          </div>

          {/* LOT 4 — Item 12: weekly challenges */}
          <div className="space-y-2" data-testid="stats-weekly-challenges">
            <div className="flex items-center gap-2 pt-1">
              <Sparkles className="w-4 h-4 text-violet-300" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-200/80">
                Défis de la semaine ({completedChallengesCount} / {challengeProgress.length} réussis)
              </span>
            </div>
            {challengeProgress.map((c) => (
              <div key={c.definition.id} data-testid={"challenge-" + c.definition.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className={"font-semibold " + (c.completed ? 'text-emerald-300' : 'text-zinc-300')}>
                    {c.completed && <CheckCircle2 className="w-3 h-3 inline mr-1 text-emerald-400" />}
                    {c.definition.name}
                  </span>
                  <span className="text-zinc-400 font-medium shrink-0">
                    {Math.min(c.current, c.definition.target)} / {c.definition.target}{' '}
                    <span className="text-violet-300">+{c.definition.rewardXp} XP</span>
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={"bg-emerald-400 " + (c.completed ? '' : 'bg-violet-400') + " h-full rounded-full transition-all duration-500"}
                    style={{ width: c.percent + '%' }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-xs text-zinc-300">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <span>Séance terminée</span>
              <span className="font-bold text-violet-300">+250 XP</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <span>Nouveau record personnel (PR)</span>
              <span className="font-bold text-amber-300">+100 XP</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <span>Série de 7 jours consécutifs</span>
              <span className="font-bold text-emerald-400">+500 XP</span>
            </div>
</div>
        </div>
      </div>
      </div>

      {/* LOT III: exercises classified by real trajectory */}
      {totalTrendItems > 0 && (
        <div className="sport-card rounded-3xl p-6 space-y-4" data-testid="stats-trends">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">
              Tendances des exercices
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TrendList
              title="En progression"
              tone="emerald"
              toneText="text-emerald-300"
              items={trendGroups.progressing}
            />
            <TrendList
              title="Stagnants"
              tone="amber"
              toneText="text-amber-300"
              items={trendGroups.stagnating}
            />
            <TrendList
              title="En régression"
              tone="rose"
              toneText="text-rose-300"
              items={trendGroups.regressing}
            />
          </div>
          <p className="text-[11px] text-zinc-500">
            Classement fondé sur la dernière performance comparable de chaque exercice (jamais de conversion
            répétitions ↔ secondes).
          </p>
        </div>
      )}

      {/* LOT III: annual evolution (current year, only months with real data) */}
      {yearlyTrend.length >= 2 && (
        <div className="sport-card rounded-3xl p-6 space-y-4" data-testid="stats-yearly">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-violet-400" />
              <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">
                Évolution — {currentYear}
              </h2>
            </div>
            <span className="text-xs text-zinc-400">Volume mensuel</span>
          </div>
          <YearlyBars months={yearlyTrend} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1" data-testid="stats-yearly-charts">
            <div data-testid="stats-yearly-sessions">
              <ProgressChart
                points={yearlyTrend.map((m) => ({ date: m.key + '-15', value: m.sessions }))}
                metricLabel="Séances"
                title="Séances / mois"
              />
            </div>
            <div data-testid="stats-yearly-duration">
              <ProgressChart
                points={yearlyTrend.map((m) => ({ date: m.key + '-15', value: Math.round(m.durationMinutes) }))}
                metricLabel="Durée"
                title="Durée / mois"
              />
            </div>
            <div data-testid="stats-yearly-xp">
              <ProgressChart
                points={yearlyTrend.map((m) => ({ date: m.key + '-15', value: m.xpEarned }))}
                metricLabel="XP"
                title="XP / mois"
              />
            </div>
          </div>
          <p className="text-[11px] text-zinc-500">
            Uniquement les mois du {currentYear} contenant des séances enregistrées.
          </p>
        </div>
      )}
    </div>
  );
};

function formatMetric(value: number, unit: string): string {
  return Number.isFinite(value) && Math.round(value) !== value ? value.toFixed(1) + ' ' + unit : value + ' ' + unit;
}

function formatDate(date: string): string {
  try {
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return date;
  }
}

// LOT III — helpers for the comparison, trends and annual cards. All guarded
// against NaN / division by zero; never invent a value.

function formatMinutes(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return '0 min';
  const rounded = Math.round(min);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return h > 0 ? (m > 0 ? h + ' h ' + m : h + ' h') : m + ' min';
}

function formatVolume(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) return '0';
  return kg >= 1000 ? (kg / 1000).toFixed(1) + 'k' : String(Math.round(kg));
}

interface ComparisonCellProps {
  label: string;
  current: number;
  previous: number;
  unit?: string;
  format?: (v: number) => string;
}

function ComparisonCell({ label, current, previous, unit, format }: ComparisonCellProps) {
  const fmt = format || ((v: number) => v.toLocaleString('fr-FR'));
  const pct = evolutionPercent(current, previous);
  const delta = Number.isFinite(current) && Number.isFinite(previous) ? current - previous : null;
  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
      <div className="text-[11px] font-semibold text-zinc-400">{label}</div>
      <div className="font-display text-2xl font-bold text-white">
        {fmt(current)}
        {unit && <span className="text-xs text-zinc-400 font-normal"> {unit}</span>}
      </div>
<div className="text-[11px] text-zinc-500 flex items-center gap-1.5 flex-wrap">
<span>
          {pct === null
            ? (delta === null ? '—' : 'précédente : ' + fmt(previous))
            : pct === 0 && delta === 0
              ? fmt(previous) + ' · ='
              : delta === null
                ? fmt(previous)
                : 'vs ' + fmt(previous)}
        </span>
        {delta !== null && delta !== 0 && (
          <span className={"font-bold " + (delta > 0 ? 'text-emerald-400' : 'text-rose-400')}>
            {delta > 0 ? '▲ +' : '▼ '}{formatSignedNumber(delta)}
          </span>
        )}
        {pct !== null && pct !== 0 && (
          <span className={"font-bold " + (pct > 0 ? 'text-emerald-400' : 'text-rose-400')}>
            ({pct > 0 ? '+' : ''}{pct}%)
          </span>
        )}
      </div>
    </div>
  );
}

function formatSignedNumber(v: number): string {
  const rounded = Math.round(v * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

interface TrendListProps {
  title: string;
  tone: 'emerald' | 'amber' | 'rose';
  toneText: string;
  items: ExerciseTrendItem[];
}

function TrendList({ title, tone, toneText, items }: TrendListProps) {
  const dot =
    tone === 'emerald' ? 'bg-emerald-400' : tone === 'amber' ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
<div className={"flex items-center gap-2 text-xs font-bold uppercase tracking-wider " + toneText}>
        <span className={"w-1.5 h-1.5 rounded-full " + dot}></span>
        {title}
      </div>
      {items.length === 0 ? (
        <div className="text-[11px] text-zinc-500 py-3 text-center">Aucun exercice</div>
      ) : (
        items.map((item) => (
          <div key={item.exerciseId} className="space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-zinc-200 truncate">{item.name}</span>
              <span className="shrink-0 text-[11px] font-bold text-zinc-300">
                {item.current} {item.unit}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500">
              {item.previous !== null
                ? formatTrendDelta(item.current, item.previous) + ' vs ' + item.previous + ' ' + item.unit
                : 'dernière performance enregistrée'}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function formatTrendDelta(current: number, previous: number): string {
  const delta = Math.round((current - previous) * 10) / 10;
  return delta === 0 ? 'stable' : (delta > 0 ? '+' : '') + delta;
}

function YearlyBars({ months }: { months: YearlyMonthTrend[] }) {
  const max = months.reduce((acc, m) => Math.max(acc, m.volumeKg || 0), 0);
  return (
    <div className="flex items-end gap-3 pt-2" data-testid="stats-yearly-bars">
      {months.map((m) => {
        const height = max > 0 ? Math.max(4, (m.volumeKg / max) * 100) : 4;
        return (
          <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-bold text-zinc-300 truncate max-w-full">{formatVolume(m.volumeKg)}</span>
            <div
              className="w-full rounded-t-lg bg-gradient-to-t from-violet-600 to-indigo-500"
              style={{ height: height + 'px' }}
            />
            <span className="text-[10px] text-zinc-500">{m.label}</span>
            <span className="text-[10px] text-zinc-500">{m.sessions} séc.</span>
          </div>
        );
      })}
    </div>
  );
}

// Item 19.5 — compact, mode-aware history table. Reps exercises show
// Date | Performance | Poids | Mode | Volume; timer exercises show the same
// columns with a duration "Performance" and no volume (never converted).
function HistoryTable({
  entries,
  deltas,
}: {
  entries: ExercisePerformance[];
  deltas: Map<string, ProgressionDelta>;
}) {
  const rows = [...entries].reverse();
  return (
    <div className="overflow-x-auto" role="region" aria-label="Historique des performances" data-testid="stats-history-table">
      <table className="w-full min-w-0 text-xs">
        <thead>
          <tr className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            <th className="text-left py-2 pr-3 font-semibold">Date</th>
            <th className="text-left py-2 pr-3 font-semibold">Performance</th>
            <th className="text-left py-2 pr-3 font-semibold">Poids</th>
            <th className="text-left py-2 pr-3 font-semibold">Mode</th>
            <th className="text-left py-2 pr-3 font-semibold">Volume</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => {
            const metric = primaryProgressionMetric(entry);
            const perfValue = performanceMetricValue(entry, metric);
            const delta = deltas.get(entry.sessionId) || null;
            return (
              <tr key={entry.id} className="border-t border-white/5" data-testid="stats-history-row">
                <td className="py-2 pr-3 whitespace-nowrap text-zinc-300">{formatDate(entry.date)}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  <span className="font-bold text-white">
                    {Number.isInteger(perfValue) ? perfValue : perfValue.toFixed(1)} {metricUnit(metric)}
                  </span>
                  {delta && delta.delta !== null && Math.abs(delta.delta) > 1e-9 && (
                    <span className={"ml-1.5 font-bold " + (delta.delta > 0 ? 'text-emerald-400' : 'text-rose-400')}>
                      {delta.delta > 0 ? '▲ +' : '▼ '}
                      {Math.round(delta.delta * 10) / 10}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap text-zinc-300">
                  {entry.weightUsedKg > 0 ? entry.weightUsedKg + ' kg' : '—'}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap text-zinc-400">
                  {entry.mode === 'timer' ? 'Timer' : 'Reps'}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap text-violet-300">
                  {entry.mode === 'timer' || entry.totalVolumeKg <= 0 ? '—' : formatVolume(entry.totalVolumeKg)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

