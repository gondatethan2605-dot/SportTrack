import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import {
  NavPage,
  UserProfile,
  WorkoutProgram,
  Exercise,
  WorkoutSession,
  PersonalRecord,
  Goal,
  BodyMeasurement,
  WorkoutProgramDay,
  StretchItem,
  MuscleGroup,
  ExercisePerformance,
  ExerciseBest,
  ProgramExerciseConfig,
} from './types';
import { SportTrackStorage } from './db/indexedDb';
import { getDefaultStretchesForDay } from './data/stretchesData';
import { computeSessionXp } from './utilsXp';
import { computeStreak } from './utilsStreak';
import { hasValidCompletedSet } from './utilsSession';
import {
  updateDayExerciseSetRestSec,
  updateDayExerciseTransitionRestSec,
  renameExerciseInPrograms,
  removeExerciseFromPrograms,
  countExerciseProgramUsages,
} from './utilsProgram';
import { buildSessionPerformances, computeExerciseBest } from './utilsProgression';
import { buildNewRecordItems, type NewRecordItem } from './utilsRecords';
import { computeLevelFromXp, applyXpToProfile } from './utilsLevels';
import { createReentrancyGate } from './utilsGuard';
import { toLocalDateKey } from './utilsCalendar';
import {
  computeChallengeProgress,
  computeWeekKey,
  settleWeeklyChallengeRewards,
  loadChallengeLedger,
  saveChallengeLedger,
  type ChallengeLedger,
} from './utilsChallenges';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { OnboardingModal } from './components/OnboardingModal';
import {
  isOnboardingDone,
  markOnboardingDone,
  skipOnboarding,
  type OnboardingGoal,
  type OnboardingMode,
} from './utilsOnboarding';
import type { QuickSessionMinutes } from './utilsQuickSession';
import type { LibraryFilterType } from './pages/ExercisesPage';

// Pages — LOT 8 (S1 — performance): HomePage stays in the initial chunk (it is
// the landing page); every other page is lazy-loaded into its own chunk and only
// fetched on first navigation. The build-time precache script
// (scripts/precache-sw.mjs) injects the hashed chunk list into dist/sw.js so the
// PWA keeps working fully offline after the first visit, exactly as before.
import { HomePage } from './pages/HomePage';
const ProgramsPage = React.lazy(() => import('./pages/ProgramsPage').then((m) => ({ default: m.ProgramsPage })));
const ExercisesPage = React.lazy(() => import('./pages/ExercisesPage').then((m) => ({ default: m.ExercisesPage })));
const StretchesPage = React.lazy(() => import('./pages/StretchesPage').then((m) => ({ default: m.StretchesPage })));
const WorkoutSessionPage = React.lazy(() => import('./pages/WorkoutSessionPage').then((m) => ({ default: m.WorkoutSessionPage })));
const CalendarPage = React.lazy(() => import('./pages/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const StatsPage = React.lazy(() => import('./pages/StatsPage').then((m) => ({ default: m.StatsPage })));
const GoalsPage = React.lazy(() => import('./pages/GoalsPage').then((m) => ({ default: m.GoalsPage })));
const ProgressPage = React.lazy(() => import('./pages/ProgressPage').then((m) => ({ default: m.ProgressPage })));
const SocialPage = React.lazy(() => import('./pages/SocialPage').then((m) => ({ default: m.SocialPage })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

import { initialProfile } from './data/initialData';
import { Trophy, X, AlertTriangle } from 'lucide-react';
import {
  getWorkoutSettings,
  resolveThemeMode,
  themeColorFor,
  feedbackStateFor,
  type ThemeModeValue,
  type AccentColorValue,
} from './utilsSettings';
import { playWorkoutSound } from './components/workout/workoutAudio';
import { vibrate, VIBRATION_PATTERNS } from './components/workout/workoutVibration';

// LOT I — Animations globales.
// Décoration du document: le `data-animations` sur <html> pilote le CSS.
// Consommé par index.css pour réduire/supprimer les animations purement
// décoratives quand animationsEnabled=false (ou prefers-reduced-motion).
function applyAnimationsAttribute(enabled: boolean) {
  const el = typeof document !== 'undefined' ? document.documentElement : null;
  if (el) el.setAttribute('data-animations', enabled ? 'on' : 'off');
}

// LOT 6 — item 16: write the effective visual theme on <html> (`data-theme` +
// `data-accent`) and refresh the browser-chrome theme-color meta tag. 'system'
// is resolved against the OS colour-scheme preference (`dark` | `light`), so
// index.css only ever has to handle the two concrete modes.
function applyAppearanceSettings(settings: { themeMode: ThemeModeValue; accentColor: AccentColorValue }) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)')?.matches ?? false;
  const resolved = resolveThemeMode(settings.themeMode, prefersLight);
  html.dataset.theme = resolved;
  html.dataset.accent = settings.accentColor;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColorFor(resolved));
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<NavPage>('accueil');
  // Bibliothèque UNIFIÉE : filtre de type de la page Exercices, piloté par le
  // hash (#etirements → Exercices / filtre Étirements), sans route séparée.
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilterType>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // LOT 9 — 9.1: onboarding done flag (localStorage only; modal shows at first
  // launch once loading has finished).
  const [onboardingDone, setOnboardingDone] = useState<boolean>(() => isOnboardingDone());
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(() => getWorkoutSettings().animationsEnabled);
  // LOT 6 — item 18: dashboard block order (settings-driven, re-read on change).
  const [dashboardBlocks, setDashboardBlocks] = useState<string[]>(() => getWorkoutSettings().dashboardBlocks);

  // LOT I — Keep the global animation flag in sync with the saved preference and
  // with the system reduced-motion preference (checked on the server-free client
  // side). Runs on mount and whenever the preference changes.
  useEffect(() => {
    applyAnimationsAttribute(animationsEnabled);
  }, [animationsEnabled]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      // Reduced-motion users get animations OFF regardless of the toggle.
      applyAnimationsAttribute(mq.matches ? false : animationsEnabled);
    };
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, [animationsEnabled]);

  // LOT 6 — item 16: keep the visual theme in sync with the saved preference
  // and the OS colour-scheme preference ('system' mode). Runs on mount and on
  // OS preference changes; preference edits re-apply via onSettingsChange.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const sync = () => applyAppearanceSettings(getWorkoutSettings());
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  // Core Data state
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [exercisePerformances, setExercisePerformances] = useState<ExercisePerformance[]>([]);
  const [exerciseBests, setExerciseBests] = useState<ExerciseBest[]>([]);

  // LOT 4 — Item 12: weekly-challenge claims ledger (localStorage). Loaded once
  // at startup; totalChallengeXpEarned is folded into the level computation so
  // a reload recomputes the same level. The per-week claims never award twice.
  const [challengeLedger, setChallengeLedger] = useState<ChallengeLedger>(() => loadChallengeLedger());

  // Active workout context if started from program
  const [activeSessionContext, setActiveSessionContext] = useState<{
    programTitle?: string;
    dayName?: string;
    programId?: string;
    dayId?: string;
    exerciseIds?: string[];
    exerciseConfigs?: import('./types').ProgramExerciseConfig[];
    stretches?: StretchItem[];
    dayOfWeek?: string;
    muscleGroups?: MuscleGroup[];
  } | null>(null);

  // F5 — guard state: set by WorkoutSessionPage while a real session is in
  // progress, used to confirm any in-app navigation that would leave it.
  const workoutActiveRef = useRef(false);
  const [leaveConfirmPage, setLeaveConfirmPage] = useState<NavPage | null>(null);
  const pendingLeaveRef = useRef<NavPage>('accueil');
  // F2 — reentrancy gate: collapses rapid repeated "Terminer" calls into one.
  const finishingSessionGateRef = useRef(createReentrancyGate());

  const handleWorkoutActivityChange = useCallback((active: boolean) => {
    workoutActiveRef.current = active;
  }, []);

  // LOT 13 — stable layout callbacks so Header / Navigation can memoize.
  const openMobileMenu = useCallback(() => setMobileMenuOpen(true), []);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const applyNavigate = useCallback((page: NavPage) => {
    setCurrentPage(page);
    window.location.hash = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Victory celebration modal
  const [completedSessionToast, setCompletedSessionToast] = useState<{
    title: string;
    volumeKg: number;
    earnedXp: number;
    newRecords?: NewRecordItem[];
  } | null>(null);

  // Calculate real profile stats from actual completed sessions. bonusXp is the
  // all-time challenge-reward XP (LOT 4 item 12) added on top of the session XP
  // so the level is fully deterministic from real data on every load.
  const syncProfileWithSessions = (rawProfile: UserProfile, allSessions: WorkoutSession[], bonusXp = 0): UserProfile => {
    if (!allSessions || allSessions.length === 0) {
      const base = computeLevelFromXp(bonusXp || 0);
      return {
        ...rawProfile,
        level: base.level,
        currentXp: base.currentXp,
        nextLevelXp: base.nextLevelXp,
        streakDays: 0,
        bestStreak: 0,
        weeklyCompletedSessions: 0,
        totalWorkouts: 0,
        totalVolumeKg: 0,
      };
    }

    // Calculate real streak from distinct session dates
    const streak = computeStreak(allSessions.map((s) => s.date));

    // Calculate current week completed sessions (Monday to Sunday)
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 is Sunday
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const mondayStr = toLocalDateKey(monday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    const sundayStr = toLocalDateKey(sunday);

    const thisWeekSessions = allSessions.filter((s) => s.date >= mondayStr && s.date <= sundayStr);
    const totalVolume = allSessions.reduce((acc, s) => acc + (s.totalVolumeKg || 0), 0);

    // Compute earned XP purely from real completed sessions + challenge rewards.
    const sessionXp = allSessions.reduce((acc, s) => {
      return acc + computeSessionXp(s.exercises?.length || 0, s.stretchesCount || 0);
    }, 0);
    const { level, currentXp, nextLevelXp } = computeLevelFromXp(sessionXp + (bonusXp || 0));

    return {
      ...rawProfile,
      level,
      currentXp,
      nextLevelXp,
      streakDays: streak,
      bestStreak: Math.max(rawProfile.bestStreak || 0, streak),
      weeklyCompletedSessions: thisWeekSessions.length,
      totalWorkouts: allSessions.length,
      totalVolumeKg: totalVolume,
    };
  };

  // Load from IndexedDB on startup
  const loadAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [
        loadedProfile,
        loadedPrograms,
        loadedExercises,
        loadedSessions,
        loadedRecords,
        loadedGoals,
        loadedMeasurements,
        loadedExercisePerformances,
        loadedExerciseBests,
      ] = await Promise.all([
        SportTrackStorage.getProfile(),
        SportTrackStorage.getPrograms(),
        SportTrackStorage.getExercises(),
        SportTrackStorage.getSessions(),
        SportTrackStorage.getRecords(),
        SportTrackStorage.getGoals(),
        SportTrackStorage.getMeasurements(),
        SportTrackStorage.getExercisePerformances(),
        SportTrackStorage.getExerciseBests(),
      ]);

      const syncedProfile = syncProfileWithSessions(loadedProfile, loadedSessions, challengeLedger.totalChallengeXpEarned);
      setProfile(syncedProfile);
      setPrograms(loadedPrograms);
      setExercises(loadedExercises);
      setSessions(loadedSessions);
      setRecords(loadedRecords);
      setGoals(loadedGoals);
      setMeasurements(loadedMeasurements);
      setExercisePerformances(loadedExercisePerformances);
      setExerciseBests(loadedExerciseBests);
    } catch (e) {
      console.error('Error loading IndexedDB data', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // LOT 4 — Item 12: settle weekly-challenge rewards exactly once. The ledger
  // (localStorage) records which challenges of the current week were already
  // credited, so reloads / re-renders never grant the same XP twice. When
  // nothing is pending, this effect is a pure no-op.
  useEffect(() => {
    const weekKey = computeWeekKey();
    const progress = computeChallengeProgress({ sessions, records, today: new Date() });
    const { ledger, pending } = settleWeeklyChallengeRewards(progress, challengeLedger, weekKey);
    const bonus = pending.reduce((acc, p) => acc + p.xp, 0);
    if (bonus <= 0) {
      if (challengeLedger.weekKey !== weekKey && ledger.weekKey === weekKey) {
        // Week rollover: persist the fresh claims map (unclaimed) so the next
        // settlement knows the week switched, without awarding XP here.
        saveChallengeLedger(ledger);
        setChallengeLedger(ledger);
      }
      return;
    }
    const updatedProfile = applyXpToProfile(profile, bonus);
    saveChallengeLedger(ledger);
    setChallengeLedger(ledger);
    setProfile(updatedProfile);
    SportTrackStorage.saveProfile(updatedProfile);
  }, [sessions, records, challengeLedger]);

  // Handle URL hash changes for deep links / shortcuts
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      const validPages: NavPage[] = [
        'accueil',
        'programme',
        'exercices',
        'etirements',
        'seance',
        'calendrier',
        'statistiques',
        'objectifs',
        'progression',
        'profil',
        'parametres',
      ];
      // Bibliothèque UNIFIÉE — les étirements vivent dans la bibliothèque d'exercices.
      // L'ancien hash #etirements ne déclenche plus une page séparée ; il ouvre la
      // page Exercices avec le filtre de type "Étirements" (les liens, raccourcis
      // et favoris existants restent valides).
      if (hash === 'etirements') {
        setCurrentPage('exercices');
        setLibraryFilter('stretch');
        return;
      }
      if (hash === 'exercices') {
        setCurrentPage('exercices');
        setLibraryFilter('all');
        return;
      }
      if (validPages.includes(hash as NavPage)) {
        setCurrentPage(hash as NavPage);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // F5 — intercept in-app navigation while a session is in progress. Finish and
  // cancel paths reset workoutActiveRef before navigating, so they never show
  // the confirmation again (no double confirmation, no navigation loops).
  const handleNavigate = useCallback((page: NavPage) => {
    if (page === 'seance' || page === currentPage) {
      applyNavigate(page);
      return;
    }
    if (workoutActiveRef.current) {
      pendingLeaveRef.current = page;
      setLeaveConfirmPage(page);
      return;
    }
    applyNavigate(page);
  }, [currentPage, applyNavigate]);

  const confirmLeaveSession = (page: NavPage) => {
    workoutActiveRef.current = false;
    setLeaveConfirmPage(null);
    applyNavigate(page);
  };

  const stayInSession = () => {
    setLeaveConfirmPage(null);
  };

  // Workout Session Triggers
  const handleStartSession = (programDayId?: string) => {
    if (programDayId) {
      const activeProg = programs.find((p) => p.isActive) || programs[0];
      const day = activeProg?.days.find((d) => d.id === programDayId);
      if (day) {
        setActiveSessionContext({
          programId: activeProg?.id,
          dayId: day.id,
          programTitle: activeProg?.title,
          dayName: day.name,
          exerciseIds: day.exerciseIds,
          exerciseConfigs: day.exercises,
          stretches: day.stretches || getDefaultStretchesForDay(day.dayOfWeek, day.name, day.muscleGroups),
          dayOfWeek: day.dayOfWeek,
          muscleGroups: day.muscleGroups,
        });
      } else {
        setActiveSessionContext(null);
      }
    } else {
      setActiveSessionContext(null);
    }
    handleNavigate('seance');
  };

  const handleStartSessionWithDay = (day: WorkoutProgramDay, program: WorkoutProgram) => {
    setActiveSessionContext({
      programId: program.id,
      dayId: day.id,
      programTitle: program.title,
      dayName: `${program.title} — ${day.name}`,
      exerciseIds: day.exerciseIds,
      exerciseConfigs: day.exercises,
      stretches: day.stretches || getDefaultStretchesForDay(day.dayOfWeek, day.name, day.muscleGroups),
      dayOfWeek: day.dayOfWeek,
      muscleGroups: day.muscleGroups,
    });
    handleNavigate('seance');
  };

  // LOT 9 — 9.8: quick session — a synthetic day that is NEVER persisted under
  // any identifier. programId/dayId are deliberately omitted so the session
  // rest write-backs stay off (guards in WorkoutSessionPage) and the draft
  // restore sees a brand-new context (replaces any previous saved draft).
  const handleStartQuickSession = async (minutes: QuickSessionMinutes) => {
    // 9.11: the plan builder (and with it the full exercise catalog) is lazily
    // fetched only on user action — it never inflates the initial chunk.
    const { buildQuickSessionPlan } = await import('./utilsQuickSession');
    const { day } = buildQuickSessionPlan(minutes);
    setActiveSessionContext({
      dayName: day.name,
      exerciseIds: day.exerciseIds,
      exerciseConfigs: day.exercises,
      stretches: day.stretches,
      dayOfWeek: day.dayOfWeek,
      muscleGroups: day.muscleGroups,
    });
    handleNavigate('seance');
  };

  // Save Completed Workout Session
  const handleFinishSession = async (session: WorkoutSession) => {
    // V7.8 P2 double-protection: refuse an empty/void session even on a
    // programmatic call. No Session, XP, totals, performances or records.
    if (hasValidCompletedSet(session.exercises) === false) {
      return;
    }

    // F2 — reentrancy guard: two rapid clicks (or a duplicate programmatic
    // call) must create exactly ONE session. tryAcquire is synchronous, so the
    // second call is ignored even before the first storage write completes.
    // XP, records, performances, streak, totals and the draft deletion all run
    // and are written exactly once; release() runs in all paths including error.
    if (!finishingSessionGateRef.current.tryAcquire()) {
      return;
    }

    try {

    // 1. Calculate XP & Level Up (including bonus for completed stretches)
    const earnedXp = computeSessionXp(session.exercises.length, session.stretchesCount || 0);
    let newXp = profile.currentXp + earnedXp;
    let newLevel = profile.level;
    let newNextXp = profile.nextLevelXp;

    if (newXp >= newNextXp) {
      newLevel += 1;
      newXp = newXp - newNextXp;
      newNextXp = Math.round(newNextXp * 1.35);
    }

    // Streak from distinct session dates (existing stored sessions + this one)
    const newStreak = computeStreak([...sessions.map((s) => s.date), session.date]);

    const updatedProfile: UserProfile = {
      ...profile,
      currentXp: newXp,
      level: newLevel,
      nextLevelXp: newNextXp,
      streakDays: newStreak,
      bestStreak: Math.max(profile.bestStreak || 0, newStreak),
      weeklyCompletedSessions: profile.weeklyCompletedSessions + 1,
      totalWorkouts: profile.totalWorkouts + 1,
      totalVolumeKg: profile.totalVolumeKg + session.totalVolumeKg,
    };

    // 2. Detect any new PR (one record per exercise, best completed set)
    const bestByExercise = new Map<string, PersonalRecord>();
    session.exercises.forEach((ex) => {
      ex.sets.forEach((set) => {
        if (set.completed && set.weightKg > 0) {
          const existingRec = records.find((r) => r.exerciseId === ex.exerciseId);
          if (!existingRec || set.weightKg > existingRec.weightKg) {
            const current = bestByExercise.get(ex.exerciseId);
            if (!current || set.weightKg > current.weightKg || (set.weightKg === current.weightKg && set.reps > current.reps)) {
              bestByExercise.set(ex.exerciseId, {
                id: `rec-${Date.now()}-${ex.exerciseId}`,
                exerciseId: ex.exerciseId,
                exerciseName: ex.exerciseName,
                weightKg: set.weightKg,
                reps: set.reps,
                date: session.date,
                previousWeightKg: existingRec ? existingRec.weightKg : undefined,
              });
            }
          }
        }
      });
    });
    const newRecordsToSave = Array.from(bestByExercise.values());

    // 3. Save to IndexedDB
    await SportTrackStorage.putItem('sessions', session);
    await SportTrackStorage.saveProfile(updatedProfile);

    // LOT 13: batching — all new records persist inside one single transaction
    // (same stores/keys as before, fully atomic) instead of N sequential writes.
    if (newRecordsToSave.length > 0) {
      await SportTrackStorage.putMany('records', newRecordsToSave);
    }

    // 3b. Per-exercise progression: build performances from recorded sets, merge,
    //     recompute bests for the affected exercises, persist and update state.
    const newEntries = buildSessionPerformances(session);
    const perfById = new Map<string, ExercisePerformance>();
    for (const p of exercisePerformances) perfById.set(p.id, p);
    for (const p of newEntries) perfById.set(p.id, p);
    const mergedPerformances = Array.from(perfById.values());

    const affectedIds = new Set(newEntries.map((p) => p.exerciseId));
    const byExercise = new Map<string, ExercisePerformance[]>();
    for (const p of mergedPerformances) {
      const list = byExercise.get(p.exerciseId);
      if (list) list.push(p);
      else byExercise.set(p.exerciseId, [p]);
    }
    const updatedBests: ExerciseBest[] = [];
    for (const exId of affectedIds) {
      const best = computeExerciseBest(exId, byExercise.get(exId) || []);
      if (best) updatedBests.push(best);
    }

    if (newEntries.length > 0) {
      await SportTrackStorage.saveExercisePerformances(newEntries);
    }
    if (updatedBests.length > 0) {
      await SportTrackStorage.saveExerciseBests(updatedBests);
    }

    // 4. Update memory state
    setSessions([session, ...sessions]);
    setProfile(updatedProfile);
    if (newRecordsToSave.length > 0) {
      setRecords([...newRecordsToSave, ...records]);
    }
    if (newEntries.length > 0) {
      setExercisePerformances(mergedPerformances);
    }
    if (updatedBests.length > 0) {
      setExerciseBests([...exerciseBests.filter((b) => !affectedIds.has(b.exerciseId)), ...updatedBests]);
    }

    // 5. Trigger victory toast (including any genuine NEW RECORD, rerun-proof:
    //    an identical session finished twice announces nothing the second time).
    const newRecordItems = buildNewRecordItems(newRecordsToSave, exerciseBests, updatedBests);
    setCompletedSessionToast({
      title: session.title,
      volumeKg: session.totalVolumeKg,
      earnedXp,
      newRecords: newRecordItems.length > 0 ? newRecordItems : undefined,
    });

    // LOT 6 — item 17: auditory + haptic completion feedback. A genuine new
    // personal record gets its own distinctive cue (record instead of the plain
    // end-of-session one, so the two never overlap). Single funnel: every
    // completed session of both classic and guided modes ends here, so the cue
    // fires exactly once, gated by the user's sound/vibration prefs.
    const finishPrefs = getWorkoutSettings();
    if (newRecordItems.length > 0) {
      const prState = feedbackStateFor(
        { sound: finishPrefs.soundEnabled, vibration: finishPrefs.vibrationEnabled },
        finishPrefs,
        'record'
      );
      if (prState.sound) playWorkoutSound('pr', true, prState.volume);
      if (prState.vibration) vibrate(VIBRATION_PATTERNS.record, true);
    } else {
      const endState = feedbackStateFor(
        { sound: finishPrefs.soundEnabled, vibration: finishPrefs.vibrationEnabled },
        finishPrefs,
        'workoutEnd'
      );
      if (endState.sound) playWorkoutSound('complete', true, endState.volume);
      if (endState.vibration) vibrate(VIBRATION_PATTERNS.workoutEnd, true);
    }

    setActiveSessionContext(null);
    // F5 — finishing a session is a deliberate exit: never re-confirm.
    workoutActiveRef.current = false;
    handleNavigate('accueil');
    } finally {
      // F2 — release the finalization lock on every path so a genuinely new
      // session started later can still be finished normally.
      finishingSessionGateRef.current.release();
    }
  };

  // Program Management
  const handleSelectActiveProgram = async (programId: string) => {
    const updated = programs.map((p) => ({
      ...p,
      isActive: p.id === programId,
    }));
    setPrograms(updated);
    // LOT 13: single batched transaction instead of N sequential writes.
    await SportTrackStorage.putMany('programs', updated);
  };

  const handleSaveProgram = async (program: WorkoutProgram) => {
    await SportTrackStorage.putItem('programs', program);
    setPrograms((prev) => {
      const exists = prev.some((p) => p.id === program.id);
      if (exists) {
        return prev.map((p) => (p.id === program.id ? program : p));
      }
      return [...prev, program];
    });
  };

  // Rest AFTER a SERIES (rest BETWEEN sets) edited from the session PREP screen:
  // persist the targeted restPlan[setIndex] back into the REAL program without
  // touching any other field of the config or of other programs/days. This
  // writes through the same storage used everywhere else (no new store, DB v8).
  const handleUpdateProgramSetRest = async (
    programId: string,
    dayId: string,
    exerciseId: string,
    setIndex: number,
    restSec: number
  ) => {
    const program = programs.find((p) => p.id === programId);
    if (!program) return;
    const updatedProgram = updateDayExerciseSetRestSec(program, dayId, exerciseId, setIndex, restSec);
    await SportTrackStorage.putItem('programs', updatedProgram);
    setPrograms((prev) => prev.map((p) => (p.id === programId ? updatedProgram : p)));
  };

  // Rest AFTER the LAST set of an exercise (before the next exercise), edited
  // from the session PREP screen: targeted transitionRestSec update only.
  const handleUpdateProgramTransitionRest = async (
    programId: string,
    dayId: string,
    exerciseId: string,
    transitionRestSec?: number
  ) => {
    const program = programs.find((p) => p.id === programId);
    if (!program) return;
    const updatedProgram = updateDayExerciseTransitionRestSec(program, dayId, exerciseId, transitionRestSec);
    await SportTrackStorage.putItem('programs', updatedProgram);
    setPrograms((prev) => prev.map((p) => (p.id === programId ? updatedProgram : p)));
  };

  const handleDeleteProgram = async (programId: string) => {
    // LOT D — Protection des programmes système (ex: MY_PROGRAM v2)
    const programToDelete = programs.find((p) => p.id === programId);
    if (programToDelete?.isSystem) {
      console.warn('Tentative de suppression d\'un programme système bloquée:', programId);
      return; // Bloqué silencieusement - l'UI doit prévenir avant
    }
    await SportTrackStorage.deleteItem('programs', programId);
    setPrograms((prev) => {
      const remaining = prev.filter((p) => p.id !== programId);
      if (remaining.length > 0 && !remaining.some((p) => p.isActive)) {
        const activated = { ...remaining[0], isActive: true };
        remaining[0] = activated;
        SportTrackStorage.putItem('programs', activated);
      }
      return remaining;
    });
  };

  // Exercise Management
  const handleAddExercise = async (exercise: Exercise) => {
    await SportTrackStorage.putItem('exercises', exercise);
    setExercises((prev) => [...prev, exercise]);
  };

  const handleUpdateExercise = async (exercise: Exercise) => {
    await SportTrackStorage.putItem('exercises', exercise);
    setExercises((prev) => prev.map((e) => (e.id === exercise.id ? exercise : e)));
    // LOT 5 — Item 15: propagate a renamed custom exercise into every program
    // so the denormalised exerciseName stays in sync. Only the display name is
    // touched: sets, reps, rest, target weight, notes... are preserved verbatim.
    const previous = exercises.find((e) => e.id === exercise.id);
    if (previous && previous.name !== exercise.name && exercise.isCustom) {
      const nextPrograms = renameExerciseInPrograms(programs, exercise.id, exercise.name);
      if (nextPrograms !== programs) {
        setPrograms(nextPrograms);
        await SportTrackStorage.putMany('programs', nextPrograms);
      }
    }
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    // System / built-in exercises can never be deleted (UI-level guard too).
    const target = exercises.find((e) => e.id === exerciseId);
    if (target && !target.isCustom) return;
    await SportTrackStorage.deleteItem('exercises', exerciseId);
    setExercises((prev) => prev.filter((e) => e.id !== exerciseId));
    // LOT 5 — Item 15: deleting must NEVER leave dead references inside saved
    // programs. Every config + legacy exerciseIds entry is removed.
    const { programs: nextPrograms, removedReferences } = removeExerciseFromPrograms(programs, exerciseId);
    if (removedReferences > 0) {
      setPrograms(nextPrograms);
      await SportTrackStorage.putMany('programs', nextPrograms);
    }
  };

  const handleToggleFavorite = useCallback(async (exerciseId: string) => {
    const target = exercises.find((e) => e.id === exerciseId);
    if (!target) return;
    const updated: Exercise = {
      ...target,
      isFavorite: !target.isFavorite,
    };
    await SportTrackStorage.putItem('exercises', updated);
    setExercises((prev) => prev.map((e) => (e.id === exerciseId ? updated : e)));
  }, [exercises]);

  // Add exercise to program (from library)
  const handleAddExerciseToProgram = async (exercise: Exercise, programId: string, dayId: string) => {
    const program = programs.find((p) => p.id === programId);
    if (!program) return;
    const day = program.days.find((d) => d.id === dayId);
    if (!day) return;

    const setsCount = Number(exercise.defaultSets) || 4;
    const repsN = Number(exercise.defaultReps) || 10;
    const newConfig: ProgramExerciseConfig = {
      id: `cfg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: setsCount,
      reps: repsN,
      repsPlan: Array.from({ length: setsCount }, () => repsN),
      durationPlan: Array.from({ length: setsCount }, () => 0),
      mode: 'reps',
      durationSec: 0,
      targetWeightKg: 0,
      restSec: exercise.defaultRestSec || 90,
      notes: '',
    };

    const updatedExercises = day.exercises ? [...day.exercises, newConfig] : [newConfig];
    const updatedDay: WorkoutProgramDay = {
      ...day,
      exercises: updatedExercises,
      exerciseIds: updatedExercises.map((e) => e.exerciseId),
    };

    const updatedDays = program.days.map((d) => (d.id === dayId ? updatedDay : d));
    const updatedProgram: WorkoutProgram = {
      ...program,
      days: updatedDays,
    };

    await SportTrackStorage.putItem('programs', updatedProgram);
    setPrograms((prev) => prev.map((p) => (p.id === programId ? updatedProgram : p)));
  };

  // Goals Management
  const handleAddGoal = async (goal: Goal) => {
    await SportTrackStorage.putItem('goals', goal);
    setGoals([...goals, goal]);
  };

  const handleUpdateGoal = async (goal: Goal) => {
    await SportTrackStorage.putItem('goals', goal);
    setGoals(goals.map((g) => (g.id === goal.id ? goal : g)));
  };

  const handleDeleteGoal = async (goalId: string) => {
    await SportTrackStorage.deleteItem('goals', goalId);
    setGoals(goals.filter((g) => g.id !== goalId));
  };

  // Progress Management
  const handleAddMeasurement = async (measurement: BodyMeasurement) => {
    await SportTrackStorage.putItem('measurements', measurement);
    setMeasurements([...measurements, measurement]);
  };

  const handleAddRecord = async (record: PersonalRecord) => {
    await SportTrackStorage.putItem('records', record);
    setRecords([record, ...records]);
  };

  // Profile update
  const handleUpdateProfile = async (updated: UserProfile) => {
    await SportTrackStorage.saveProfile(updated);
    setProfile(updated);
  };

  const activeProgram = programs.find((p) => p.isActive) || programs[0];

  // LOT 9 — 9.1: first-run welcome flow (writes only the two lightweight
  // localStorage preferences — never a Goal object, never IndexedDB).
  const handleOnboardingFinish = useCallback((goal: OnboardingGoal, mode: OnboardingMode) => {
    markOnboardingDone(goal, mode);
    setOnboardingDone(true);
  }, []);

  const handleOnboardingSkip = useCallback(() => {
    skipOnboarding();
    setOnboardingDone(true);
  }, []);

  // LOT 5 — Item 15: map exercise -> number of program DAYS referencing it.
  // Shown in the ExercisesPage deletion confirmation so the user knows exactly
  // what will be impacted before confirming. LOT 13: memoized — recomputed only
  // when the exercise or program collections actually change (not on every
  // App re-render caused by a streak, toast or menu toggle).
  const programUsage: Record<string, number> = useMemo(() => {
    const usage: Record<string, number> = {};
    for (const ex of exercises) {
      usage[ex.id] = countExerciseProgramUsages(programs, ex.id).dayCount;
    }
    return usage;
  }, [exercises, programs]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="sport-card p-8 flex flex-col items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center animate-bounce shadow-lg shadow-violet-600/40">
            <img src="/icon-192.png" alt="Logo SportTrack" className="w-full h-full object-cover" draggable={false} />
          </div>
          <span className="font-display text-2xl font-bold tracking-wider uppercase text-violet-300">
            Chargement de SportTrack...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans relative overflow-x-hidden">
      {/* Ambient background blurred glow orbs for authentic Frosted Glass refraction.
          LOT 13: radii reduced (130/160/140px → 70/95/70px) — gaussian-blur cost is
          proportional to the filtered area, and per-frame composited filters on large
          fixed layers are the #1 mobile-UI cost. The :content tint stays violet/indigo
          so the visual identity is unchanged; the orbs are promoted to a dedicated
          compositing layer (.ambient-orb) so their bitmap is cached and not re-blurred
          on every scroll/repaint, and they are hidden entirely for reduced-motion. */}
      <div className="ambient-orb fixed top-[-10%] left-[-10%] w-[45vw] h-[45vw] max-w-[600px] max-h-[600px] bg-violet-900/20 blur-[70px] rounded-full pointer-events-none -z-0" />
      <div className="ambient-orb fixed bottom-[-10%] right-[-10%] w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] bg-violet-600/10 blur-[95px] rounded-full pointer-events-none -z-0" />
      <div className="ambient-orb fixed top-[35%] right-[5%] w-[35vw] h-[35vw] max-w-[450px] max-h-[450px] bg-indigo-600/10 blur-[70px] rounded-full pointer-events-none -z-0" />

      {/* PWA Install Banner */}
      <PwaInstallBanner />

      {/* LOT 9 — 9.1: welcome flow on first launch (skippable, no DB writes) */}
      {!onboardingDone && (
        <OnboardingModal
          onFinish={handleOnboardingFinish}
          onSkip={handleOnboardingSkip}
        />
      )}

      {/* Main Top Header */}
      <Header
        profile={profile}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenMobileMenu={openMobileMenu}
      />

      {/* Main Layout Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto relative z-10">
        {/* Desktop Sidebar & Mobile Drawer Navigation */}
        <Navigation
          currentPage={currentPage}
          onNavigate={handleNavigate}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={closeMobileMenu}
          onOpenMobileMenu={openMobileMenu}
        />

        {/* Page Content View Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 pb-24 md:pb-8 overflow-y-auto flex flex-col justify-between">
          <div>
            {/* Workout Completed Modal / Toast */}
            {completedSessionToast && (
              <div className="mb-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-violet-500/40 p-4 sm:p-5 flex items-center justify-between gap-4 shadow-2xl animate-in slide-in-from-top">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-400/40 flex items-center justify-center shrink-0">
                    <Trophy className="w-6 h-6 text-amber-400 fill-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-xl font-bold text-white uppercase">
                        Séance Validée avec succès !
                      </span>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-800/40">
                        +{completedSessionToast.earnedXp} XP
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300">
                      {completedSessionToast.title} • {completedSessionToast.volumeKg.toLocaleString('fr-FR')} kg soulevés au total.
                    </p>

                    {completedSessionToast.newRecords && completedSessionToast.newRecords.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5" data-testid="session-new-records">
                        {completedSessionToast.newRecords.map((r) => (
                          <div
                            key={`${r.exerciseId}-${r.mode}`}
                            className="flex items-center justify-between gap-3 text-xs"
                          >
                            <span className="flex items-center gap-1.5 text-zinc-200 min-w-0">
                              <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <strong className="text-amber-300 uppercase text-[10px] tracking-wider shrink-0">
                                Nouveau record
                              </strong>
                              <span className="truncate font-semibold">
                                {r.exerciseName}
                                <span className="text-zinc-400 font-normal">
                                  {' '}({recordModeLabel(r.mode)})
                                </span>
                              </span>
                            </span>
                            <span className="shrink-0 font-mono font-bold text-amber-300" data-testid="session-new-record-value">
                              {r.previousValue != null
                                ? `${formatRecordValue(r.previousValue, r.unit)} → ${formatRecordValue(r.newValue, r.unit)}`
                                : `Premier : ${formatRecordValue(r.newValue, r.unit)}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setCompletedSessionToast(null)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Fermer la notification"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* F5 — Confirm leaving an in-progress session */}
            {leaveConfirmPage && (
              <div
                className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                data-testid="leave-session-overlay"
              >
                <div
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="leave-session-title"
                  className="sport-card p-6 sm:p-7 max-w-md w-full text-center"
                  data-testid="leave-session-modal"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 id="leave-session-title" className="font-display text-lg sm:text-xl font-bold text-white mb-2">
                    Séance en cours
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed mb-6">
                    Une séance est en cours. Votre progression sera conservée.
                    Voulez-vous vraiment quitter ?
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      id="btn-leave-session-stay"
                      onClick={stayInSession}
                      className="flex-1 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors"
                    >
                      Continuer la séance
                    </button>
                    <button
                      id="btn-leave-session-quit"
                      onClick={() => confirmLeaveSession(pendingLeaveRef.current)}
                      className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors"
                    >
                      Quitter
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 1. Page Accueil */}
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-24" aria-label="Chargement de la page">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-400/40 animate-pulse" />
                </div>
              }
            >
            {currentPage === 'accueil' && (
              <HomePage
                profile={profile}
                activeProgram={activeProgram}
                recentRecords={records}
                recentSessions={sessions}
                exercisePerformances={exercisePerformances}
                goals={goals}
                exerciseBests={exerciseBests}
                measurements={measurements}
                dashboardBlocks={dashboardBlocks}
                onNavigate={handleNavigate}
                onStartSession={handleStartSession}
                onStartQuickSession={handleStartQuickSession}
              />
            )}

            {/* 2. Page Programme */}
            {currentPage === 'programme' && (
              <ProgramsPage
                programs={programs}
                exercises={exercises}
                onSelectActiveProgram={handleSelectActiveProgram}
                onStartSessionWithDay={handleStartSessionWithDay}
                onSaveProgram={handleSaveProgram}
                onDeleteProgram={handleDeleteProgram}
              />
            )}

            {/* 3. Page Exercices */}
            {currentPage === 'exercices' && (
              <ExercisesPage
                exercises={exercises}
                exercisePerformances={exercisePerformances}
                exerciseBests={exerciseBests}
                programs={programs}
                programUsage={programUsage}
                onAddExercise={handleAddExercise}
                onUpdateExercise={handleUpdateExercise}
                onDeleteExercise={handleDeleteExercise}
                onToggleFavorite={handleToggleFavorite}
                onAddExerciseToProgram={handleAddExerciseToProgram}
                initialFilter={libraryFilter}
              />
            )}

            {/* 4. Page Étirements */}
            {currentPage === 'etirements' && (
              <StretchesPage />
            )}

            {/* 5. Page Séance */}
            {currentPage === 'seance' && (
              <WorkoutSessionPage
                availableExercises={exercises}
                initialDayName={activeSessionContext?.dayName}
                programTitle={activeSessionContext?.programTitle}
                programId={activeSessionContext?.programId}
                dayId={activeSessionContext?.dayId}
                initialExerciseIds={activeSessionContext?.exerciseIds}
                initialExerciseConfigs={activeSessionContext?.exerciseConfigs}
                initialStretches={activeSessionContext?.stretches}
                dayOfWeek={activeSessionContext?.dayOfWeek}
                muscleGroups={activeSessionContext?.muscleGroups}
                onFinishSession={handleFinishSession}
                onCancelSession={() => {
                  workoutActiveRef.current = false;
                  handleNavigate('accueil');
                }}
                onWorkoutActivityChange={handleWorkoutActivityChange}
                onUpdateProgramSetRest={handleUpdateProgramSetRest}
                onUpdateProgramTransitionRest={handleUpdateProgramTransitionRest}
                onLeaveSession={() => handleNavigate('accueil')}
              />
            )}

            {/* 5. Page Calendrier */}
            {currentPage === 'calendrier' && (
              <CalendarPage
                sessions={sessions}
                activeProgram={activeProgram}
                records={records}
                onStartSession={handleStartSession}
                onStartSessionWithDay={handleStartSessionWithDay}
              />
            )}

            {/* 6. Page Statistiques */}
            {currentPage === 'statistiques' && (
              <StatsPage
                profile={profile}
                sessions={sessions}
                records={records}
                goals={goals}
                exercisePerformances={exercisePerformances}
                exerciseBests={exerciseBests}
              />
            )}

            {/* 7. Page Objectifs */}
            {currentPage === 'objectifs' && (
              <GoalsPage
                goals={goals}
                onAddGoal={handleAddGoal}
                onUpdateGoal={handleUpdateGoal}
                onDeleteGoal={handleDeleteGoal}
                measurements={measurements}
                sessions={sessions}
                profile={profile}
                records={records}
                exercisePerformances={exercisePerformances}
                exerciseBests={exerciseBests}
              />
            )}

            {/* 8. Page Progression */}
            {currentPage === 'progression' && (
              <ProgressPage
                measurements={measurements}
                records={records}
                onAddMeasurement={handleAddMeasurement}
                onAddRecord={handleAddRecord}
                exercisePerformances={exercisePerformances}
                exerciseBests={exerciseBests}
                activeProgram={activeProgram}
                onSaveProgram={handleSaveProgram}
              />
            )}

            {/* 9. Page Profil & Social */}
            {currentPage === 'profil' && (
              <SocialPage
                profile={profile}
                sessions={sessions}
                records={records}
                goals={goals}
              />
            )}

            {/* 9. Page Paramètres */}
            {currentPage === 'parametres' && (
              <SettingsPage
                profile={profile}
                onUpdateProfile={handleUpdateProfile}
                onReloadAllData={loadAllData}
                onSettingsChange={(s) => {
                  setAnimationsEnabled(s.animationsEnabled);
                  setDashboardBlocks(s.dashboardBlocks);
                  applyAppearanceSettings(s);
                }}
              />
            )}
            </Suspense>
          </div>

          {/* Frosted Glass Footer matching theme */}
          <footer className="mt-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-zinc-400 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium text-zinc-300">PWA 100% Hors-Ligne (Stockage Local IndexedDB)</span>
            </div>
            <div className="text-zinc-400 text-[11px]">
              SportTrack • Suivi de musculation privé & autonome
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

function recordModeLabel(mode: NewRecordItem['mode']): string {
  return mode === 'poids' ? 'poids' : mode === 'reps' ? 'répétitions' : 'durée';
}

function formatRecordValue(value: number, unit: string): string {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  const label = unit === 'rep' ? 'reps' : unit === 'kg' ? 'kg' : 'sec';
  return `${text} ${label}`;
}
