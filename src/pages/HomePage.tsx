import React, { useMemo, Fragment } from 'react';
import { UserProfile, WorkoutProgram, PersonalRecord, NavPage, WorkoutSession, Goal, ExercisePerformance, ExerciseBest, BodyMeasurement, DayOfWeek } from '../types';
import { suggestNextTarget, sortPerformancesByDate } from '../utilsProgression';
import {
  getActiveDashboardGoals,
  getNextProgramDay,
  getWeeklyQuickStats,
  getLastActivity,
  getWarmUpHint,
  buildHomeGoalContext,
  homeGoalValueText,
  DashboardGoal,
} from '../utilsHome';
import { buildBlockBar } from '../utilsGoals';
import { computeBadges, mostRecentlyUnlockedBadge, nextBadgeToUnlock } from '../utilsBadges';
import { computeChallengeProgress } from '../utilsChallenges';
import { DASHBOARD_BLOCK_KEYS, DEFAULT_DASHBOARD_BLOCKS } from '../utilsSettings';
// Type-only on purpose: building the plan is lazy-loaded in App (9.11) so the
// exercise catalog never enters the initial chunk through the dashboard.
import type { QuickSessionMinutes } from '../utilsQuickSession';

// Presentational presets (the real builder lives in utilsQuickSession).
const QUICK_SESSION_PRESETS: readonly QuickSessionMinutes[] = [10, 20, 30];
import {
  Play,
  Flame,
  Zap,
  Trophy,
  Target,
  Calendar,
  ChevronRight,
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  Dumbbell,
  Sparkles,
  Activity,
  Layers,
  Flame as FlameIcon,
  X,
  Medal,
} from 'lucide-react';

interface HomePageProps {
  profile: UserProfile;
  activeProgram?: WorkoutProgram;
  recentRecords: PersonalRecord[];
  recentSessions: WorkoutSession[];
  exercisePerformances?: ExercisePerformance[];
  goals?: Goal[];
  exerciseBests?: ExerciseBest[];
  measurements?: BodyMeasurement[];
  onNavigate: (page: NavPage) => void;
  onStartSession: (programDayId?: string) => void;
  onStartQuickSession?: (minutes: QuickSessionMinutes) => void;
  // LOT 6 — item 18: ordered list of visible dashboard blocks (from settings).
  dashboardBlocks?: string[];
}

const WEEKDAY_NAMES_MAP: Record<number, DayOfWeek> = {
  0: 'Dimanche',
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
};

const STATUS_COLORS: Record<DashboardGoal['color'], string> = {
  emerald: 'from-emerald-500 to-teal-400',
  violet: 'from-violet-500 to-indigo-400',
  indigo: 'from-indigo-500 to-sky-400',
  amber: 'from-amber-500 to-orange-400',
};

const STATUS_TEXT: Record<DashboardGoal['color'], string> = {
  emerald: 'text-emerald-400',
  violet: 'text-violet-300',
  indigo: 'text-indigo-300',
  amber: 'text-amber-300',
};

export const HomePage: React.FC<HomePageProps> = ({
  profile,
  activeProgram,
  recentRecords,
  recentSessions,
  exercisePerformances,
  goals,
  exerciseBests,
  measurements,
  onNavigate,
  onStartSession,
  onStartQuickSession,
  dashboardBlocks,
}) => {
  const [quickModalOpen, setQuickModalOpen] = React.useState(false);
  const currentDayOfWeekName = WEEKDAY_NAMES_MAP[new Date().getDay()];
  const todayPlannedDay = activeProgram?.days.find((d) => d.dayOfWeek === currentDayOfWeekName);

  // LOT G: next session info derived via the shared program helpers.
  const nextSession = useMemo(
    () => getNextProgramDay(activeProgram, new Date()),
    [activeProgram]
  );

  // LOT G: active goals via LOT F helpers (max 3, no expired/achieved).
  const goalContext = useMemo<ReturnType<typeof buildHomeGoalContext>>(
    () => buildHomeGoalContext({
      sessions: recentSessions || [],
      profile,
      records: recentRecords || [],
      exercisePerformances: exercisePerformances || [],
      exerciseBests: exerciseBests || [],
      measurements: measurements || [],
    }),
    [profile, recentSessions, recentRecords, exercisePerformances, exerciseBests, measurements]
  );
  const activeGoals = useMemo(
    () => getActiveDashboardGoals(goals || [], goalContext, new Date(), 3),
    [goals, goalContext]
  );

  // LOT G: quick weekly stats via LOT E helpers.
  const weeklyStats = useMemo(
    () => getWeeklyQuickStats(recentSessions || [], 'week', new Date()),
    [recentSessions]
  );

  // LOT G: last activity derived from real sessions.
  const lastActivity = useMemo(
    () => getLastActivity(recentSessions || []),
    [recentSessions]
  );

  // LOT G: presentational warm-up hint (no persisted data, no migration).
  const warmUp = useMemo(() => getWarmUpHint(), []);

  const weeklyPercent = profile.weeklyTargetSessions > 0
    ? Math.min(100, Math.round((profile.weeklyCompletedSessions / profile.weeklyTargetSessions) * 100))
    : 0;
  const xpPercent = profile.nextLevelXp > 0
    ? Math.min(100, Math.round((profile.currentXp / profile.nextLevelXp) * 100))
    : 0;

  // LOT 4 — Item 11: badges are a pure function of the real data (no IDB).
  const badges = useMemo(
    () => computeBadges({
      sessions: recentSessions || [],
      records: recentRecords || [],
      exercisePerformances: exercisePerformances || [],
      goals: goals || [],
      profile,
    }),
    // computeBadges reads raw data only, never the derived displayed profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recentSessions, recentRecords, exercisePerformances, goals, profile.streakDays, profile.bestStreak]
  );
  const unlockedBadges = useMemo(() => badges.filter((b) => b.unlocked), [badges]);
  const lastBadge = useMemo(() => mostRecentlyUnlockedBadge(badges), [badges]);
  const nextBadge = useMemo(() => nextBadgeToUnlock(badges), [badges]);

  // LOT 4 — Item 12: weekly challenges (deterministic Monday-based week).
  const challengeProgress = useMemo(
    () => computeChallengeProgress({ sessions: recentSessions || [], records: recentRecords || [] }),
    [recentSessions, recentRecords]
  );
  const completedChallengesCount = useMemo(
    () => challengeProgress.filter((c) => c.completed).length,
    [challengeProgress]
  );

  // LOT D: a short next-target teaser for the most recently performed exercise
  // that has a qualified recommendation. Purely derived, no storage/migration.
  const homeRecommendation = useMemo(() => {
    const perfs = exercisePerformances && exercisePerformances.length > 0 ? exercisePerformances : undefined;
    if (!perfs) return null;
    const byExercise = new Map<string, ExercisePerformance[]>();
    for (const p of perfs) {
      const list = byExercise.get(p.exerciseId);
      if (list) list.push(p);
      else byExercise.set(p.exerciseId, [p]);
    }
    let best: { name: string; text: string; date: string } | null = null;
    for (const [id, entries] of byExercise) {
      const rec = suggestNextTarget(entries, id);
      if (!rec || rec.last <= 0) continue;
      const lastDate = sortPerformancesByDate(entries)[entries.length - 1]?.date || '';
      const label = rec.unit === 'kg' ? 'kg' : rec.unit === 'sec' ? 's' : 'reps';
      const fmt = Number.isInteger(rec.target) ? String(rec.target) : rec.target.toFixed(1);
      const candidate = {
        name: entries[entries.length - 1]?.exerciseName || id,
        text: `${fmt} ${label}`,
        date: lastDate,
      };
      if (!best || lastDate > best.date) best = candidate;
    }
    return best;
  }, [exercisePerformances]);

  // LOT 6 — item 18: the dashboard renders its blocks in the SAVED order. An
  // absent/empty prop falls back to the full default dashboard; unknown keys
  // from an external/old settings object are ignored. The hero START action is
  // always rendered above the blocks and is never part of this list.
  const orderedBlocks = useMemo(
    () =>
      (dashboardBlocks ?? [...DEFAULT_DASHBOARD_BLOCKS]).filter((k) =>
        (DASHBOARD_BLOCK_KEYS as readonly string[]).includes(k)
      ),
    [dashboardBlocks]
  );

  // Renders one dashboard block. Each block keeps its ORIGINAL markup (and its
  // data-testid / behaviour); only the outer grid classes change so the blocks
  // flow inside the shared responsive 12-column grid (sm:2 / lg:12).
  const renderDashboardBlock = (key: string): React.ReactNode => {
    switch (key) {
      case 'streak':
        return (
          <div data-testid="home-streak" className="sport-card rounded-3xl p-5 flex items-center gap-4 lg:col-span-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
              <Flame className="w-6 h-6 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <div className="text-xs text-zinc-400 font-medium">Série en cours</div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-3xl font-bold text-amber-300 leading-none">
                  {profile.streakDays}
                </span>
                <span className="text-xs text-zinc-300 font-semibold">jours d'affilée</span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Record : {profile.bestStreak} jours 🔥</div>
            </div>
          </div>
        );

      case 'level':
        return (
          <div data-testid="home-xp" className="sport-card rounded-3xl p-5 flex items-center gap-4 lg:col-span-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-violet-400 fill-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>Niveau {profile.level}</span>
                <span className="text-violet-300 font-bold">{profile.currentXp} / {profile.nextLevelXp} XP</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 mt-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-violet-500 to-indigo-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">
                +{profile.nextLevelXp - profile.currentXp} XP avant le Niveau {profile.level + 1}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1 tracking-wider tabular-nums" data-testid="home-xp-blocks">
                {buildBlockBar(xpPercent)}
              </div>
            </div>
          </div>
        );

      case 'volume':
        return (
          <div data-testid="home-volume" className="sport-card rounded-3xl p-5 flex items-center gap-4 lg:col-span-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="text-xs text-zinc-400 font-medium">Volume soulevé</div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-3xl font-bold text-indigo-300 leading-none">
                  {(profile.totalVolumeKg / 1000).toFixed(1)}k
                </span>
                <span className="text-xs text-zinc-300 font-semibold">kg cumulés</span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">{profile.totalWorkouts} séances validées</div>
            </div>
          </div>
        );

      case 'weekly':
        return (
          <div data-testid="home-weekly-progress" className="sport-card rounded-3xl p-5 flex flex-col justify-center gap-1.5 lg:col-span-3">
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Objectif semaine</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-3xl font-bold text-emerald-300 leading-none">{weeklyPercent}%</span>
              <span className="text-xs text-zinc-300 font-semibold">
                {profile.weeklyCompletedSessions} / {profile.weeklyTargetSessions} séances
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 mt-1 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${weeklyPercent}%` }}
              />
            </div>
          </div>
        );

      case 'badges':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:col-span-2 lg:col-span-12">
            {/* LOT 4 — Item 11 & 12: badges + weekly challenges (pure derived UI) */}
            <div data-testid="home-badges" className="sport-card rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
                  <Medal className="w-4 h-4 text-amber-300" />
                  <span>Badges débloqués ({unlockedBadges.length} / {badges.length})</span>
                </div>
                <button
                  onClick={() => onNavigate('statistiques')}
                  className="text-[11px] font-semibold text-violet-300 hover:text-violet-200 underline-offset-2 hover:underline"
                >
                  Voir tout
                </button>
              </div>
              {lastBadge ? (
                <div className="rounded-2xl bg-white/5 border border-amber-500/25 p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-amber-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-200/80">Dernier badge</div>
                    <div className="text-sm font-bold text-white truncate">{lastBadge.name}</div>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-zinc-500">
                  Terminez votre première séance validée pour débloquer votre premier badge.
                </div>
              )}
              {nextBadge && (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-zinc-400 min-w-0">
                      Prochain : <span className="text-zinc-100 font-semibold">{nextBadge.name}</span>
                    </span>
                    <span className="font-bold text-violet-300 shrink-0">
                      {nextBadge.progress?.current} / {nextBadge.progress?.target}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-400 to-orange-400 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${nextBadge.progress ? Math.min(100, Math.round((nextBadge.progress.current / nextBadge.progress.target) * 100)) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div data-testid="home-challenges" className="sport-card rounded-3xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span>Défis de la semaine ({completedChallengesCount} / {challengeProgress.length})</span>
              </div>
              {challengeProgress.slice(0, 4).map((c) => (
                <div key={c.definition.id} data-testid={`home-challenge-${c.definition.id}`} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className={c.completed ? 'text-emerald-300 font-semibold' : 'text-zinc-300'}>
                      {c.completed && <CheckCircle2 className="w-3 h-3 inline mr-1 text-emerald-400" />}
                      {c.definition.name}
                    </span>
                    <span className="text-zinc-400 shrink-0">
                      {Math.min(c.current, c.definition.target)} / {c.definition.target}{' '}
                      <span className="text-violet-300">+{c.definition.rewardXp} XP</span>
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`${c.completed ? 'bg-emerald-400' : 'bg-violet-400'} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${c.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'stats':
        return (
          <div data-testid="home-stats" className="sport-card rounded-3xl p-6 sm:col-span-2 lg:col-span-12">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-violet-400" />
                <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">Cette semaine</h2>
              </div>
              <button
                onClick={() => onNavigate('statistiques')}
                data-testid="home-view-stats"
                className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1 min-h-[36px]"
              >
                Voir les statistiques <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="font-display text-3xl font-bold text-white" data-testid="home-stats-sessions">
                  {weeklyStats.sessions}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1 uppercase tracking-wide">Séances</div>
              </div>
              <div className="text-center">
                <div className="font-display text-3xl font-bold text-white" data-testid="home-stats-sets">
                  {weeklyStats.validatedSets}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1 uppercase tracking-wide">Séries</div>
              </div>
              <div className="text-center">
                <div className="font-display text-3xl font-bold text-white" data-testid="home-stats-reps">
                  {weeklyStats.repCount}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1 uppercase tracking-wide">Répétitions</div>
              </div>
              <div className="text-center">
                <div className="font-display text-3xl font-bold text-white" data-testid="home-stats-exercises">
                  {weeklyStats.uniqueExercises}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1 uppercase tracking-wide">Exercices</div>
              </div>
            </div>
            {weeklyStats.timerSetCount > 0 && (
              <p className="text-[11px] text-zinc-500 mt-3 text-center">
                dont {weeklyStats.timerSetCount} série(s) chronométrée(s) &bull; durée jamais convertie en répétitions
              </p>
            )}
          </div>
        );

      case 'recommendation':
        return homeRecommendation ? (
          <button
            onClick={() => onNavigate('progression')}
            data-testid="home-progression"
            className="w-full sport-card rounded-3xl p-4 flex items-center justify-between gap-3 text-left hover:border-violet-500/40 transition-colors sm:col-span-2 lg:col-span-12"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 text-violet-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Prochaine cible recommandée</div>
                <div className="text-sm font-bold text-white truncate" data-testid="home-progression-exercise">{homeRecommendation.name}</div>
              </div>
            </div>
            <span className="font-display text-2xl font-bold text-violet-300 shrink-0" data-testid="home-progression-target">{homeRecommendation.text}</span>
            <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
          </button>
        ) : (
          // LOT 9 — 9.2: the priority block always renders (stable dashboard
          // hierarchy); an empty state guides to the progression page instead of
          // silently hiding a whole row.
          <button
            onClick={() => onNavigate('progression')}
            data-testid="home-progression-empty"
            className="w-full sport-card rounded-3xl p-4 flex items-center justify-between gap-3 text-left hover:border-violet-500/40 transition-colors sm:col-span-2 lg:col-span-12"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Prochaine cible recommandée</div>
                <div className="text-sm text-zinc-300 truncate">Complétez une séance pour obtenir une cible personnalisée</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
          </button>
        );

      case 'next-session':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:col-span-2 lg:col-span-12">
            {/* Next Workout Card */}
            <div data-testid="home-next-session" className="lg:col-span-7 sport-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse" />
                  <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">
                    Prochaine Séance
                  </h2>
                </div>
                <span className="text-xs font-semibold text-violet-300 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1 rounded-xl">
                  {activeProgram?.title || 'Programme Personnalisé'}
                </span>
              </div>

              {nextSession ? (
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-white">{nextSession.name}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {nextSession.day.muscleGroups.map((mg) => (
                          <span
                            key={mg}
                            className="text-[11px] font-medium bg-violet-500/15 text-violet-300 px-2.5 py-0.5 rounded-lg border border-violet-500/20"
                          >
                            {mg}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-xs text-zinc-400 shrink-0">
                      <span className="flex items-center gap-1 font-semibold text-zinc-200">
                        <Clock className="w-3.5 h-3.5 text-violet-400" /> ~{nextSession.durationMin} min
                      </span>
                      <span className="text-[11px] text-zinc-400 block mt-1">
                        {nextSession.exerciseCount} {nextSession.exerciseCount > 1 ? 'exercices' : 'exercice'}
                      </span>
                      <span className="text-[11px] text-zinc-400 flex items-center gap-1 justify-end mt-0.5">
                        <Layers className="w-3 h-3 text-violet-400" /> {nextSession.setCount} {nextSession.setCount > 1 ? 'séries' : 'série'}
                      </span>
                    </div>
                  </div>

                  {/* Warm-up hint (LOT G, presentational, no migration) */}
                  <div data-testid="home-warm-up" className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                    <FlameIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="text-[11px] text-emerald-200">
                      <span className="font-bold">{warmUp.label}</span>
                      <span className="mx-1.5 text-emerald-400/60">•</span>
                      <span data-testid="home-warm-up-minutes">{warmUp.minutes} min</span>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-3.5 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-xs text-zinc-400">
                      <span className="text-zinc-300 font-medium">{nextSession.day.muscleGroups.join(', ')}</span>
                      {nextSession.day.stretches && nextSession.day.stretches.length > 0 && (
                        <span className="text-violet-300"> • +{nextSession.day.stretches.length} étirements</span>
                      )}
                    </div>
                    <button
                      id="btn-start-next-day"
                      onClick={() => onStartSession(nextSession.day.id)}
                      data-testid="home-start-session-day"
                      className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>Commencer</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-zinc-400">
                  <p className="text-sm">Aucune séance programmée.</p>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => onNavigate('programme')}
                      data-testid="home-create-program"
                      className="text-xs text-violet-400 underline font-semibold"
                    >
                      Choisir un programme
                    </button>
                    {onStartQuickSession && (
                      <button
                        onClick={() => setQuickModalOpen(true)}
                        data-testid="home-empty-quick-session"
                        className="text-xs text-amber-400 underline font-semibold"
                      >
                        ou partir sur une séance rapide
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Quick links inside Next Workout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => onNavigate('exercices')}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold text-zinc-300 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-violet-400" />
                    Bibliothèque d'exercices
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </button>

                <button
                  onClick={() => onNavigate('calendrier')}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold text-zinc-300 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-violet-400" />
                    Planning & Séances
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </button>
              </div>
            </div>

            {/* Active goals card (LOT F reuse) */}
            <div data-testid="home-goals" className="lg:col-span-5 sport-card rounded-3xl p-6 space-y-4 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-violet-400" />
                  <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">
                    Mes Objectifs
                  </h2>
                </div>
                <button
                  onClick={() => onNavigate('objectifs')}
                  data-testid="home-view-goals"
                  className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center min-h-[36px]"
                >
                  Voir tout &rarr;
                </button>
              </div>

              {activeGoals.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-6 px-4 rounded-2xl bg-white/5 border border-white/5">
                  <Target className="w-8 h-8 mx-auto mb-2 text-zinc-500 opacity-60" />
                  <p className="text-xs text-zinc-300 font-semibold">Aucun objectif actif.</p>
                  <button
                    onClick={() => onNavigate('objectifs')}
                    data-testid="home-create-goal"
                    className="mt-2 text-xs text-violet-400 underline font-semibold"
                  >
                    Créer un objectif
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeGoals.map((g) => (
                    <div
                      key={g.goal.id}
                      data-testid="home-goal-card"
                      className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-zinc-100 truncate">{g.goal.title}</span>
                        <span className={`text-xs font-bold ${STATUS_TEXT[g.color]}`} data-testid="home-goal-percent">
                          {g.percent}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span data-testid="home-goal-current">
                          {g.current !== null ? homeGoalValueText(g.goal, g.current) : '—'}
                          <span className="text-zinc-500"> / {g.target}</span>
                        </span>
                        {g.goal.deadline && <span className="text-zinc-500">avant le {g.goal.deadline}</span>}
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden p-0.5 border border-white/5">
                        <div
                          className={`bg-gradient-to-r ${STATUS_COLORS[g.color]} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${g.percent}%` }}
                          role="progressbar"
                          aria-valuenow={g.percent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Progression de ${g.goal.title} : ${g.percent} pour cent`}
                        />
                      </div>
                      {g.remaining !== null && g.remaining > 0 && (
                        <div className="text-[11px] text-zinc-400">
                          Plus que <span className="font-bold text-violet-300">{homeGoalValueText(g.goal, g.remaining)}</span> pour la cible
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => onNavigate('objectifs')}
                data-testid="home-view-progress"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-violet-200 transition-colors"
              >
                <span>Gérer mes objectifs et records</span>
                <ChevronRight className="w-4 h-4 text-violet-400" />
              </button>
            </div>
          </div>
        );

      case 'records':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:col-span-2 lg:col-span-12">
            {/* Derniers Records Personnels (PR) */}
            <div className="sport-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-violet-400" />
                  <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">
                    Derniers Records (PR)
                  </h2>
                </div>
                <button
                  onClick={() => onNavigate('progression')}
                  data-testid="home-view-records"
                  className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center min-h-[36px]"
                >
                  Historique &rarr;
                </button>
              </div>

              <div className="space-y-2.5">
                {recentRecords.length === 0 ? (
                  <div className="text-center py-6 px-4 rounded-2xl bg-white/5 border border-white/5 text-zinc-400 text-xs">
                    <Award className="w-8 h-8 mx-auto mb-2 text-zinc-500 opacity-60" />
                    <p className="font-semibold text-zinc-300">Aucun record personnel pour le moment.</p>
                    <p className="text-[11px] text-zinc-500 mt-1">Vos records (PR) s’enregistreront automatiquement dès votre première séance validée !</p>
                  </div>
                ) : (
                  recentRecords.slice(0, 3).map((rec) => {
                    const diff = rec.previousWeightKg ? rec.weightKg - rec.previousWeightKg : null;
                    return (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/20 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-sm text-zinc-100">{rec.exerciseName}</div>
                          <div className="text-[11px] text-zinc-400">
                            {new Date(rec.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} • {rec.reps} répétitions
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-display text-2xl font-bold text-violet-300 leading-none">
                            {rec.weightKg} <span className="text-xs text-zinc-400 font-normal">kg</span>
                          </div>
                          {diff !== null && diff > 0 && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded-lg border border-emerald-800/40">
                              +{diff} kg
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Dernière activité */}
            <div data-testid="home-last-activity" className="sport-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-violet-400" />
                  <h2 className="font-display text-2xl font-bold uppercase tracking-wider text-white">
                    Dernière Activité
                  </h2>
                </div>
                <button
                  onClick={() => onNavigate('calendrier')}
                  className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center min-h-[36px]"
                >
                  Tout voir &rarr;
                </button>
              </div>

              <div className="space-y-2.5">
                {lastActivity === null ? (
                  <div className="text-center py-6 px-4 rounded-2xl bg-white/5 border border-white/5 text-zinc-400 text-xs">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 text-zinc-500 opacity-60" />
                    <p className="font-semibold text-zinc-300">Aucune séance réalisée pour le moment.</p>
                    <p className="text-[11px] text-zinc-500 mt-1">Cliquez sur « Commencer la séance » pour enregistrer votre tout premier entraînement !</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
                      <div className="space-y-1 min-w-0">
                        <div className="font-semibold text-sm text-zinc-100 truncate">{lastActivity.title}</div>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-2 flex-wrap">
                          <span>{new Date(lastActivity.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                          <span>•</span>
                          <span>{lastActivity.durationMinutes} min</span>
                          <span>•</span>
                          <span>{lastActivity.exerciseCount} exercices</span>
                        </div>
                        {lastActivity.exerciseNames.length > 0 && (
                          <div className="text-[11px] text-zinc-500 mt-1 truncate">
                            {lastActivity.exerciseNames.slice(0, 3).join(', ')}
                            {lastActivity.exerciseNames.length > 3 ? '…' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div id="page-home" data-testid="home-page" className="space-y-6 max-w-5xl mx-auto pb-8">
      {/* Hero Action: Motivating Header + Big START WORKOUT Button */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-6 sm:p-8 shadow-2xl shadow-violet-900/25">
        {/* Background frosted glow circles */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-900/30 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/20">
                <Sparkles className="w-3.5 h-3.5 text-white" />
                Prêt pour l'effort
              </span>
              <span className="text-xs text-white/80 font-medium capitalize">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-wide text-white leading-tight">
              Dépasse tes limites, {profile.name}
            </h1>
            <p className="text-sm text-white/85 max-w-lg leading-relaxed">
              Votre progression se construit chaque jour. Données privées stockées localement sur votre téléphone ou ordinateur.
            </p>
          </div>

          {/* Primary CTA: COMMENCER LA SÉANCE */}
          <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-3">
            <button
              id="btn-start-session-hero"
              data-testid="home-start-session"
              onClick={() => onStartSession(nextSession?.day.id)}
              className="group relative flex items-center justify-center gap-3 bg-white text-violet-700 hover:bg-zinc-100 font-bold text-base uppercase tracking-wider px-8 py-4 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                <Play className="w-4 h-4 fill-violet-700 text-violet-700 group-hover:scale-110 transition-transform" />
              </div>
                            <span className="font-display text-xl font-bold tracking-widest text-violet-900">COMMENCER LA SÉANCE</span>
            </button>

            <button
              id="btn-quick-session-hero"
              onClick={() => setQuickModalOpen(true)}
              data-testid="home-open-quick-session"
              className="group relative flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold text-sm uppercase tracking-wider px-6 py-3 rounded-2xl border border-white/30 backdrop-blur-md transition-all"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Séance rapide</span>
            </button>

            <button
              id="btn-quick-program"
              onClick={() => onNavigate('programme')}
              className="text-xs text-white/90 hover:text-white text-center font-semibold py-1 underline-offset-4 hover:underline inline-flex items-center min-h-[36px]"
            >
              Voir le programme complet &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* LOT 9 — 9.8: quick-session modal (10/20/30 min). Launches a synthetic
          session without a program; it never persists as a program day. */}
      {quickModalOpen && onStartQuickSession && (
        <div className="fixed inset-0 z-[85] bg-black/85 backdrop-blur-md flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Séance rapide">
          <div className="w-full max-w-sm sport-card rounded-3xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold uppercase tracking-wider text-white">Séance rapide</h2>
                  <p className="text-[11px] text-zinc-400">Sans programme — ne modifie aucun plan.</p>
                </div>
              </div>
              <button
                onClick={() => setQuickModalOpen(false)}
                aria-label="Fermer"
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2" data-testid="quick-session-durations">
              {QUICK_SESSION_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { onStartQuickSession(m); setQuickModalOpen(false); }}
                  data-testid={`quick-session-${m}`}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-bold text-white">{m} minutes</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Le contenu est proposé automatiquement (groupes musculaires adaptés à la durée). Vous pourrez en ajuster les exercices pendant la séance.
            </p>
          </div>
        </div>
      )}

      {/* LOT 6 — item 18: dashboard blocks rendered in the SAVED order (the hero
          START action above is always visible; blocks can be hidden/reordered
          in the Paramètres page). On large screens the blocks tile in a 12-col
          grid; on mobile (grid-cols-1) they simply stack in the same order. */}
      <div data-testid="home-blocks-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5">
        {orderedBlocks.map((key) => (
          <Fragment key={key}>{renderDashboardBlock(key)}</Fragment>
        ))}
      </div>
    </div>
  );
};