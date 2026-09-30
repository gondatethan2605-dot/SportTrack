import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Exercise,
  ProgramExerciseConfig,
  ExerciseMode,
  WorkoutSession,
  SessionExerciseLog,
  PersonalRecord,
  StretchItem,
  StretchSideType,
  DayOfWeek,
  MuscleGroup,
  WorkoutDraft,
  WorkoutDraftGuided,
} from '../types';
import { SportTrackStorage } from '../db/indexedDb';
import { getDefaultStretchesForDay } from '../data/stretchesData';
import { formatDuration } from '../utilsExerciseMode';
import { computeSessionXp } from '../utilsXp';
import { toLocalDateKey } from '../utilsCalendar';
import { hasValidCompletedSet } from '../utilsSession';
import { getWorkoutSettings, feedbackStateFor } from '../utilsSettings';
import { appendSetRestSec, removeSetRestSec } from '../utilsProgram';
import { resolveSetRestSec, resolveTransitionRestSec } from '../components/workout/workoutGuidedEngine';
import {
  getExerciseAlternatives,
  buildAlternativeConfig,
  alternativeWillSwitchMode,
  parseDefaultReps,
} from '../utilsAlternatives';
import { buildWarmUpSuggestion, warmUpTotalDuration, WARM_UP_LABEL, COOL_DOWN_LABEL } from '../utilsWarmUp';
import { playWorkoutSound } from '../components/workout/workoutAudio';
import { vibrate, VIBRATION_PATTERNS } from '../components/workout/workoutVibration';
import { WorkoutGuidedSession } from '../components/workout/WorkoutGuidedSession';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Check,
  Clock,
  Dumbbell,
  Trophy,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  SkipForward,
  Heart,
  Volume2,
  VolumeX,
  Flame,
  ArrowRight,
  Activity,
  Layers,
  Repeat,
  Timer,
  Shuffle,
  X,
  Info,
  Calculator,
} from 'lucide-react';
import { OneRMModal } from '../components/OneRMModal';

const WORKOUT_CARD_WIDTH = 350;
const WORKOUT_CARD_HEIGHT = 500;

interface WorkoutSessionPageProps {
  availableExercises: Exercise[];
  initialDayName?: string;
  programTitle?: string;
  programId?: string;
  dayId?: string;
  initialExerciseIds?: string[];
  initialExerciseConfigs?: ProgramExerciseConfig[];
  initialStretches?: StretchItem[];
  dayOfWeek?: DayOfWeek | string;
  muscleGroups?: MuscleGroup[];
  onFinishSession: (session: WorkoutSession, newRecords?: PersonalRecord[]) => void;
  onCancelSession: () => void;
  // F5 — lets App know a real (in-progress) session exists so navigation away
  // can be confirmed. False when nothing has been done yet.
  onWorkoutActivityChange?: (active: boolean) => void;
  // Per-set rest BETWEEN sets edited on the PREP screen: persist it back into the
  // real program's day config (targeted restPlan[setIndex] update only).
  onUpdateProgramSetRest?: (programId: string, dayId: string, exerciseId: string, setIndex: number, restSec: number) => void;
  // Per-exercise rest AFTER the last set (transitionRestSec) edited on the PREP
  // screen: persist it back into the real program's day config (targeted update,
  // nothing else changes).
  onUpdateProgramTransitionRest?: (programId: string, dayId: string, exerciseId: string, transitionRestSec?: number) => void;
  // Guided mode: exit via App navigation so the F5 confirmation modal still
  // applies (quitting a guided session preserves the draft, never double-confirms).
  onLeaveSession?: () => void;
}

type SessionPhase = 'musculation' | 'stretching' | 'summary';

// LOT 6 — item 17: the classic stretch-finish chime now rides the SHARED audio
// engine (the duplicated local AudioContext was removed): it obeys the per-session
// `audioEnabled` toggle, the global sound/vibration masters, the volume and the
// per-category (set) toggles. No-op everywhere when audio is unavailable.
// LOT 9 — 9.5: display label of an exercise's native mode (from its default).
function parseDefaultModeLabel(alt: Exercise): string {
  const native = parseDefaultReps(alt.defaultReps as number | string);
  return native.kind === 'duration' ? 'Timer' : 'Répétitions';
}

function playStretchChime(audioEnabled: boolean): void {
  const prefs = getWorkoutSettings();
  const state = feedbackStateFor(
    { sound: audioEnabled, vibration: prefs.vibrationEnabled },
    prefs,
    'set'
  );
  if (state.sound) playWorkoutSound('end', true, state.volume);
  if (state.vibration) vibrate(VIBRATION_PATTERNS.setEnd, true);
}

// True when the document itself loaded straight onto the workout session page,
// i.e. the user (re)loaded/reopened the browser while a session route was open.
// Only that case auto-restores the auto-saved draft; a normal in-app navigation
// into #seance merely offers it (the module is statically imported, so this
// constant reflects the hash of the initial page load, not later hash changes).
const didLoadDirectlyOntoSession = typeof window !== 'undefined' && window.location.hash.startsWith('#seance');

export const WorkoutSessionPage: React.FC<WorkoutSessionPageProps> = ({
  availableExercises,
  initialDayName,
  programTitle,
  programId,
  dayId,
  initialExerciseIds = [],
  initialExerciseConfigs,
  initialStretches,
  dayOfWeek,
  muscleGroups,
  onFinishSession,
  onCancelSession,
  onWorkoutActivityChange,
  onUpdateProgramSetRest,
  onUpdateProgramTransitionRest,
  onLeaveSession,
}) => {
  // Navigation between workout phases
  const [currentPhase, setCurrentPhase] = useState<SessionPhase>('musculation');

  // Session details
  const [sessionTitle, setSessionTitle] = useState(initialDayName || 'Séance Libre');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Bodybuilding Rest Timer
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  // LOT 6 — item 17: remember the PREVIOUS committed rest value so the "rest is
  // over" cue fires exactly once when the countdown crosses to 0 (a state
  // updater would be impure and could double-fire under StrictMode).
  const prevRestSecondsRef = useRef<number | null>(null);

  // Per-exercise quick "Repos" panel (restPlan editor), one index or null when closed
  const [restPanelOpen, setRestPanelOpen] = useState<number | null>(null);

  // LOT 9 — 9.6: presentational warm-up intro (session-local, never persisted,
  // zero XP impact). Skippable; it does not change the training data at all.
  const [warmupIntroDismissed, setWarmupIntroDismissed] = useState(false);
  const warmUpSuggestion = React.useMemo(
    () => buildWarmUpSuggestion(muscleGroups),
    // muscleGroups is a stable prop; recompute only when it changes identity.
    [muscleGroups]
  );

  // Feeling and notes
  const [feeling, setFeeling] = useState<'🔥 Top forme' | '⚡ Normal' | '😴 Difficile' | '💪 Puissant'>('💪 Puissant');
  const [notes, setNotes] = useState('');

  // Guided mode (mode guidé) — opt-in overlay that drives the same session state.
  const [guidedMode, setGuidedMode] = useState(false);
  const [guidedCheckpoint, setGuidedCheckpoint] = useState<WorkoutDraftGuided | null>(null);

  // Exercise logs in the active session
  const [sessionExercises, setSessionExercises] = useState<SessionExerciseLog[]>(() => {
    if (initialExerciseConfigs && initialExerciseConfigs.length > 0) {
      return initialExerciseConfigs.map((cfg) => {
        const found = availableExercises.find((e) => e.id === cfg.exerciseId);
        const mode: ExerciseMode = cfg.mode === 'timer' ? 'timer' : 'reps';
        const repsFallback = Number(cfg.reps) || Number(found?.defaultReps) || 10;
        const durationFallback = Number(cfg.durationSec) || 0;
        const repsPlan = Array.isArray(cfg.repsPlan) && cfg.repsPlan.length > 0 ? cfg.repsPlan : null;
        const durationPlan = Array.isArray(cfg.durationPlan) && cfg.durationPlan.length > 0 ? cfg.durationPlan : null;
        const setsCount = cfg.sets || (repsPlan ? repsPlan.length : durationPlan ? durationPlan.length : 3);
        return {
          exerciseId: cfg.exerciseId,
          exerciseName: cfg.exerciseName || found?.name || 'Exercice',
          muscleGroup: found?.muscleGroup || 'Full Body',
          restSec: cfg.restSec,
          restPlan: Array.isArray(cfg.restPlan) ? [...cfg.restPlan] : undefined,
          transitionRestSec: cfg.transitionRestSec,
          sets: Array.from({ length: setsCount }, (_, i) => ({
            setNumber: i + 1,
            weightKg: Number(cfg.targetWeightKg) || 0,
            reps: Number(repsPlan?.[i] ?? repsFallback) || 10,
            mode,
            durationSec: Number(durationPlan?.[i] ?? durationFallback) || 0,
            completed: false,
          })),
        };
      });
    }

    if (initialExerciseIds.length > 0) {
      return initialExerciseIds.map((id) => {
        const found = availableExercises.find((e) => e.id === id);
        const name = found ? found.name : 'Exercice';
        const mg = found ? found.muscleGroup || 'Full Body' : 'Full Body';
        const setsCount = found ? found.defaultSets : 3;
        const reps = found ? found.defaultReps : 10;
        return {
          exerciseId: id,
          exerciseName: name,
          muscleGroup: mg,
          sets: Array.from({ length: setsCount }, (_, i) => ({
            setNumber: i + 1,
            weightKg: 0,
            reps: Number(reps) || 10,
            mode: 'reps',
            durationSec: 0,
            completed: false,
          })),
        };
      });
    }
    return [];
  });

  // Finish guard: a session can only be ended once a real completed set exists.
  // While no valid set is completed the finish button is visually disabled
  // (aria-disabled + pointer-events) and the guard below refuses any attempt.
  const canFinish = useMemo(() => hasValidCompletedSet(sessionExercises), [sessionExercises]);

  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState('');
  const [activeTimedSet, setActiveTimedSet] = useState<{ exIndex: number; setIndex: number } | null>(null);
  const [timedSecondsLeft, setTimedSecondsLeft] = useState(0);

  // LOT 9 — 9.5: smart exercise replacement inside the current session.
  const [replaceExerciseTarget, setReplaceExerciseTarget] = useState<number | null>(null);
  const [replaceSelectionId, setReplaceSelectionId] = useState('');

  // LOT E.1 — 1RM Calculator Modal
  const [oneRMModalOpen, setOneRMModalOpen] = useState(false);
  const [oneRMModalExercise, setOneRMModalExercise] = useState<Exercise | null>(null);
  const [oneRMModalExIndex, setOneRMModalExIndex] = useState<number | null>(null);
  const [oneRMModalMode, setOneRMModalMode] = useState<'estimate' | 'percentage' | 'plates'>('estimate');

  const handleOpenOneRMModal = (exIdx: number, initialMode: 'estimate' | 'percentage' | 'plates' = 'estimate') => {
    const exercise = availableExercises.find((e) => e.id === sessionExercises[exIdx]?.exerciseId);
    if (exercise) {
      setOneRMModalExercise(exercise);
      setOneRMModalExIndex(exIdx);
      setOneRMModalMode(initialMode);
      setOneRMModalOpen(true);
    }
  };

  const handleOneRMApply = (weightKg: number) => {
    if (oneRMModalExIndex !== null && weightKg > 0) {
      setSessionExercises((prev) =>
        prev.map((log, i) =>
          i === oneRMModalExIndex ? { ...log, sets: log.sets.map((s) => ({ ...s, weightKg })) } : log
        )
      );
    }
    setOneRMModalOpen(false);
    setOneRMModalExIndex(null);
  };

  // LOT E.4 — Export session image
  const handleExportSession = () => {
    // Prepare session data for image generation (compute from live state)
    const totalSets = sessionExercises.reduce((acc, log) => acc + log.sets.length, 0);
    const completedSets = sessionExercises.reduce(
      (acc, log) => acc + log.sets.filter((s) => s.completed).length,
      0
    );
    // Compute volume from completed sets (SessionExerciseLog doesn't have totalVolumeKg)
    const volume = sessionExercises.reduce((acc, log) => {
      const logVolume = log.sets
        .filter((s) => s.completed && s.mode !== 'timer' && s.reps > 0 && s.weightKg > 0)
        .reduce((sum, s) => sum + s.weightKg * s.reps, 0);
      return acc + logVolume;
    }, 0);
    const durationMinutes = Math.round(elapsedSeconds / 60);
    const exercisesCount = sessionExercises.length;
    const date = new Date();
    const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

    // Calculate XP
    const totalXP = completedStretchesCount > 0
      ? 250 + completedSets * 20 + completedStretchesCount * 25
      : 0;

    // RPE stats - extract rpe values from WorkoutSet objects
    const rpeValues = sessionExercises
      .flatMap((log) => log.sets.filter((s) => s.rpe !== undefined && s.rpe !== null))
      .map((s) => s.rpe!);
    const averageRPE = rpeValues.length > 0 ? rpeValues.reduce((a, r) => a + r, 0) / rpeValues.length : null;
    const rpeCount = rpeValues.length;

    // Best exercises
    const bestExercises = sessionExercises
      .filter((log) => log.sets.some((s) => s.completed))
      .map((log) => ({
        name: log.exerciseName,
        weight: Math.max(...log.sets.filter((s) => s.completed && s.weightKg > 0).map((s) => s.weightKg), 0),
        reps: Math.max(...log.sets.filter((s) => s.completed && s.reps > 0).map((s) => s.reps), 0),
      }));

    // Export options (match WorkoutShareCard defaults)
    const showXP = true;
    const showRPE = true;

    // Generate image
    const canvas = document.createElement('canvas');
    canvas.width = WORKOUT_CARD_WIDTH;
    canvas.height = WORKOUT_CARD_HEIGHT;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#0f0f15';
    ctx.fillRect(0, 0, WORKOUT_CARD_WIDTH, WORKOUT_CARD_HEIGHT);

    // Header
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, WORKOUT_CARD_WIDTH, 80);
    ctx.fillStyle = 'white';
    ctx.fillRect(40, 20, 40, 40); // placeholder icon
    ctx.fillStyle = 'white';
    ctx.fillText('SportTrack', 80, 40);
    ctx.fillText(sessionTitle || 'Séance', 80, 60);

    // Date
    ctx.fillStyle = 'white';
    ctx.fillText(formattedDate, 40, 100);

    // Summary
    ctx.fillStyle = 'white';
    ctx.fillText(`${exercisesCount} exercices`, 40, 130);
    ctx.fillText(`${completedSets} séries`, 40, 150);
    if (volume > 0) {
      ctx.fillText(`${volume} kg`, 40, 170);
    }
    if (showXP && totalXP > 0) {
      ctx.fillText(`${totalXP} XP`, 40, 190);
    }
    if (showRPE && averageRPE !== null && rpeCount > 0) {
      ctx.fillText(`RPE ${averageRPE.toFixed(1)} / 10`, 40, 210);
    }

    // Convert to blob and trigger download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sporttrack-seance-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      }
    }, 'image/png');
  };

  const handleRequestReplace = (exIdx: number) => {
    setReplaceSelectionId('');
    setReplaceExerciseTarget(exIdx);
  };

  const handleConfirmReplace = (exIdx: number, alternativeId: string) => {
    const target = sessionExercises[exIdx];
    const alternative = availableExercises.find((e) => e.id === alternativeId);
    if (!target || !alternative) {
      setReplaceExerciseTarget(null);
      return;
    }
    const existingMode: 'reps' | 'timer' = target.sets[0]?.mode === 'timer' ? 'timer' : 'reps';
    const pseudo: ProgramExerciseConfig = {
      id: `cfg-${target.exerciseId}-session`,
      exerciseId: target.exerciseId,
      exerciseName: target.exerciseName,
      sets: target.sets.length,
      reps: Number(target.sets[0]?.reps) || 0,
      mode: existingMode,
      durationSec: target.sets[0]?.durationSec || 0,
      targetWeightKg: 0,
      restSec: target.restSec ?? getWorkoutSettings().defaultRestSec,
      transitionRestSec: target.transitionRestSec,
    };
    const { config, modePreserved } = buildAlternativeConfig(pseudo, alternative);
    const newLog: SessionExerciseLog = {
      exerciseId: config.exerciseId,
      exerciseName: config.exerciseName,
      // muscleGroup comes from the alternative itself; keep the old one only as
      // a fallback (it never drives data, just grouping in the current session).
      muscleGroup: alternative.muscleGroup || target.muscleGroup,
      restSec: config.restSec,
      transitionRestSec: config.transitionRestSec,
      sets: Array.from({ length: config.sets }, (_, i) => ({
        setNumber: i + 1,
        weightKg: Number(config.targetWeightKg) || 0,
        reps: Number(config.repsPlan?.[i] ?? config.reps) || (config.mode === 'timer' ? 0 : 10),
        mode: config.mode === 'timer' ? 'timer' : 'reps',
        durationSec: Number(config.durationPlan?.[i] ?? config.durationSec) || 0,
        completed: false,
      })),
    };
    // The mode change is reported to the user BEFORE the confirm (the modal
    // shows it); this handler only applies the user-validated replacement.
    setSessionExercises((prev) => prev.map((log, i) => (i === exIdx ? newLog : log)));
    setReplaceExerciseTarget(null);
    setReplaceSelectionId('');
    void modePreserved;
  };

  // Per-set exercise timer
  useEffect(() => {
    if (!activeTimedSet || timedSecondsLeft <= 0) return;
    const timer = window.setInterval(() => setTimedSecondsLeft((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [activeTimedSet, timedSecondsLeft]);

  useEffect(() => {
    if (!activeTimedSet || timedSecondsLeft !== 0) return;
    const { exIndex, setIndex } = activeTimedSet;
    const target = sessionExercises[exIndex]?.sets[setIndex];
    if (target && !target.completed) handleToggleSet(exIndex, setIndex);
    setActiveTimedSet(null);
  }, [timedSecondsLeft, activeTimedSet]);

  // Stretching state (declared early: draft restore/clear logic touches it)
  const [currentStretchIdx, setCurrentStretchIdx] = useState(0);
  // Current active side: 1 = First side (Gauche), 2 = Second side (Droite)
  const [currentSideIndex, setCurrentSideIndex] = useState<1 | 2>(1);
  const [completedStretchesCount, setCompletedStretchesCount] = useState<number>(0);

  // ==========================================
  // SESSION DRAFT (auto-save / restore in-progress session)
  // ==========================================
  const [draftState, setDraftState] = useState<{ kind: 'applied' | 'offered'; draft: WorkoutDraft } | null>(null);
  const draftLoadedRef = useRef(false);
  const draftDeletedRef = useRef(false);
  const draftSaveTimerRef = useRef<number | null>(null);
  const liveSnapshotRef = useRef<WorkoutDraft | null>(null);

  const defaultTitle = initialDayName || 'Séance Libre';

  const applyDraft = (draft: WorkoutDraft) => {
    setSessionExercises(draft.exercises || []);
    setSessionTitle(draft.title || defaultTitle);
    setNotes(draft.notes || '');
    setFeeling(draft.feeling || '💪 Puissant');
    setElapsedSeconds(draft.elapsedSeconds || 0);
    setIsTimerRunning(false);
    if (draft.phase === 'stretching' || draft.phase === 'summary') {
      setCurrentPhase(draft.phase);
    } else {
      setCurrentPhase('musculation');
    }
    setCompletedStretchesCount(draft.completedStretchesCount || 0);
    setCurrentStretchIdx(draft.currentStretchIdx || 0);
    setCurrentSideIndex(draft.currentSideIndex === 2 ? 2 : 1);
    if (draft.guided) {
      setGuidedCheckpoint(draft.guided);
      setGuidedMode(true);
    } else {
      setGuidedCheckpoint(null);
      setGuidedMode(false);
    }
    setRestSecondsLeft(draft.restSecondsLeft ?? null);
    setTimedSecondsLeft(draft.timedSecondsLeft || 0);
    setActiveTimedSet(draft.activeTimedSet ?? null);
  };

  const resetDraftCleared = () => {
    setSessionExercises([]);
    setSessionTitle(defaultTitle);
    setNotes('');
    setElapsedSeconds(0);
    setIsTimerRunning(false);
    setCompletedStretchesCount(0);
    setCurrentStretchIdx(0);
    setCurrentSideIndex(1);
    setFeeling('💪 Puissant');
    setCurrentPhase('musculation');
    setGuidedMode(false);
    setGuidedCheckpoint(null);
    setRestSecondsLeft(null);
    setActiveTimedSet(null);
    setTimedSecondsLeft(0);
  };

  const draftHasActivity = (d: Pick<WorkoutDraft, 'exercises' | 'notes' | 'elapsedSeconds' | 'completedStretchesCount' | 'phase' | 'title'>) =>
    d.exercises.length > 0 ||
    d.notes.trim().length > 0 ||
    d.elapsedSeconds > 10 ||
    d.completedStretchesCount > 0 ||
    d.phase !== 'musculation' ||
    d.title !== defaultTitle;

  const scheduleDraftSave = () => {
    if (draftDeletedRef.current || !draftLoadedRef.current) return;
    if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = window.setTimeout(() => {
      if (draftDeletedRef.current) return;
      const snap = liveSnapshotRef.current;
      if (snap && draftHasActivity(snap)) {
        SportTrackStorage.saveSessionDraft(snap).catch(() => {});
      }
    }, 800);
  };

  // Keep a live snapshot of the current session state (fresh even when the global
  // timer ticks every second, which is deliberately not a save trigger).
  useEffect(() => {
    liveSnapshotRef.current = {
      id: 'active_draft',
      title: sessionTitle,
      exercises: sessionExercises,
      elapsedSeconds,
      isTimerRunning: false,
      feeling,
      notes,
      phase: currentPhase,
      completedStretchesCount,
      currentStretchIdx,
      currentSideIndex,
      guided: guidedCheckpoint || undefined,
      restSecondsLeft,
      activeTimedSet,
      timedSecondsLeft,
      updatedAt: new Date().toISOString(),
    };
  });

  // F5 — report whether a real session is in progress so App can guard in-app
  // navigation. Mirrors the draft-activity heuristic (0 exercises, no notes, no
  // timer, still on the warm-up phase, untouched title => inactive).
  useEffect(() => {
    const active =
      sessionExercises.length > 0 ||
      notes.trim().length > 0 ||
      elapsedSeconds > 0 ||
      completedStretchesCount > 0 ||
      currentPhase !== 'musculation' ||
      sessionTitle !== defaultTitle;
    onWorkoutActivityChange?.(active);
  }, [
    sessionExercises.length,
    notes,
    elapsedSeconds,
    completedStretchesCount,
    currentPhase,
    sessionTitle,
    onWorkoutActivityChange,
  ]);

  // Load any saved draft once at mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const draft = await SportTrackStorage.getSessionDraft().catch(() => null);
      if (cancelled) return;
      const hasNewContext = !!(initialExerciseConfigs && initialExerciseConfigs.length > 0) || (initialExerciseIds || []).length > 0;
      if (draft) {
        if (hasNewContext) {
          // A new session was explicitly started: the previous draft is superseded.
          await SportTrackStorage.deleteSessionDraft().catch(() => {});
        } else if (didLoadDirectlyOntoSession) {
          applyDraft(draft);
          setDraftState({ kind: 'applied', draft });
        } else {
          setDraftState({ kind: 'offered', draft });
        }
      }
      draftLoadedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced save on any meaningful change. LOT 13: the countdown states
  // (restSecondsLeft / activeTimedSet / timedSecondsLeft) are deliberately NOT
  // save triggers — they tick every second and previously produced ~1 complete
  // IndexedDB write per second while a timer ran. They are kept fresh in the
  // live snapshot by the patch effect below, and the pagehide/beforeunload
  // flush persists the exact current countdown whenever a real save fires.
  useEffect(() => {
    if (draftLoadedRef.current && !draftDeletedRef.current && liveSnapshotRef.current && draftHasActivity(liveSnapshotRef.current)) {
      scheduleDraftSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionExercises, sessionTitle, notes, feeling, currentPhase, completedStretchesCount, currentStretchIdx, currentSideIndex, guidedCheckpoint]);

  // Capture the exact rest / timed countdown into the live snapshot as it elapses
  // (not a save trigger, but keeps the draft accurate when a real save fires).
  useEffect(() => {
    if (restSecondsLeft !== null) {
      liveSnapshotRef.current = liveSnapshotRef.current
        ? { ...liveSnapshotRef.current, restSecondsLeft, activeTimedSet, timedSecondsLeft }
        : liveSnapshotRef.current;
    } else if (activeTimedSet) {
      liveSnapshotRef.current = liveSnapshotRef.current
        ? { ...liveSnapshotRef.current, activeTimedSet, timedSecondsLeft }
        : liveSnapshotRef.current;
    }
  }, [restSecondsLeft, activeTimedSet, timedSecondsLeft]);

  // Flush the pending draft on tab close / component unmount (navigation away).
  useEffect(() => {
    const flush = () => {
      if (draftSaveTimerRef.current) {
        window.clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }
      if (draftDeletedRef.current) return;
      const snap = liveSnapshotRef.current;
      if (snap && draftHasActivity(snap)) {
        SportTrackStorage.saveSessionDraft(snap).catch(() => {});
      }
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTitle]);

  const handleResumeDraft = () => {
    const d = draftState?.draft;
    if (!d) return;
    applyDraft(d);
    setDraftState({ kind: 'applied', draft: d });
  };

  const handleDismissDraft = async () => {
    draftDeletedRef.current = true;
    await SportTrackStorage.deleteSessionDraft().catch(() => {});
    draftDeletedRef.current = false;
    setDraftState(null);
  };

  const handleDiscardDraft = async () => {
    draftDeletedRef.current = true;
    await SportTrackStorage.deleteSessionDraft().catch(() => {});
    draftDeletedRef.current = false;
    setDraftState(null);
    resetDraftCleared();
  };

  const handleCancelSession = async () => {
    draftDeletedRef.current = true;
    if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current);
    await SportTrackStorage.deleteSessionDraft().catch(() => {});
    onCancelSession();
  };

  // ==========================================
  // STRETCHING PHASE STATE
  // ==========================================
  const activeStretches: StretchItem[] = React.useMemo(() => {
    // An explicitly supplied empty array means this session has no extra end-of-session stretches.
    // Only fall back to automatic presets when no stretch list was supplied at all.
    if (initialStretches !== undefined) {
      return initialStretches;
    }
    return getDefaultStretchesForDay(dayOfWeek, initialDayName, muscleGroups);
  }, [initialStretches, dayOfWeek, initialDayName, muscleGroups]);

  const [stretchSecondsLeft, setStretchSecondsLeft] = useState<number>(30);
  const [isStretchTimerRunning, setIsStretchTimerRunning] = useState<boolean>(false);
  const [completedSidesMap, setCompletedSidesMap] = useState<Record<string, boolean>>({});
  const [audioEnabled, setAudioEnabled] = useState(true);

  const currentStretch = activeStretches[currentStretchIdx] || activeStretches[0];

  // Initialize/reset stretch timer when active stretch changes
  useEffect(() => {
    if (currentStretch) {
      setStretchSecondsLeft(currentStretch.durationSec);
      setIsStretchTimerRunning(false);
      setCurrentSideIndex(1);
    }
  }, [currentStretchIdx]);

  // Global Elapsed timer
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Bodybuilding Rest countdown timer
  useEffect(() => {
    let timer: any = null;
    if (restSecondsLeft !== null && restSecondsLeft > 0) {
      timer = setInterval(() => {
        setRestSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [restSecondsLeft]);

  // LOT 6 — item 17: "fin de repos" cue, fired exactly once when the rest
  // countdown reaches 0 (or is skipped to 0). Pure state transition detection —
  // no side-effects inside an updater, so no double-fire under StrictMode.
  useEffect(() => {
    const prev = prevRestSecondsRef.current;
    prevRestSecondsRef.current = restSecondsLeft;
    if (prev !== null && prev > 0 && restSecondsLeft === 0) {
      const prefs = getWorkoutSettings();
      const state = feedbackStateFor(
        { sound: audioEnabled, vibration: prefs.vibrationEnabled },
        prefs,
        'rest'
      );
      if (state.sound) playWorkoutSound('restEnd', true, state.volume);
      if (state.vibration) vibrate(VIBRATION_PATTERNS.restEnd, true);
    }
  }, [restSecondsLeft, audioEnabled]);

  // Stretch Countdown Timer
  useEffect(() => {
    let timer: any = null;
    if (isStretchTimerRunning && stretchSecondsLeft > 0) {
      timer = setInterval(() => {
        setStretchSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (isStretchTimerRunning && stretchSecondsLeft === 0) {
      // Timer finished!
      playStretchChime(audioEnabled);
      handleAdvanceStretchAuto();
    }
    return () => clearInterval(timer);
  }, [isStretchTimerRunning, stretchSecondsLeft, currentStretchIdx, currentSideIndex, audioEnabled]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ==========================================
  // BODYBUILDING EXERCISES HANDLERS
  // ==========================================
  const handleToggleSet = (exIndex: number, setIndex: number) => {
    const targetSet = sessionExercises[exIndex]?.sets[setIndex];
    if (!targetSet) return;
    // A timer set cannot be validated without a configured duration.
    if (targetSet.mode === 'timer' && (targetSet.durationSec || 0) <= 0) return;
    const updated = [...sessionExercises];
    updated[exIndex].sets[setIndex].completed = !targetSet.completed;
    const newStatus = updated[exIndex].sets[setIndex].completed;
    if (!newStatus && activeTimedSet?.exIndex === exIndex && activeTimedSet?.setIndex === setIndex) {
      setActiveTimedSet(null);
      setTimedSecondsLeft(0);
    }
    setSessionExercises(updated);

    // LOT 6 — item 17: "fin de série" cue when a set is validated. Goes through
    // the per-session audioEnabled + global sound/vibration/volume/category gates.
    if (newStatus) {
      const prefs = getWorkoutSettings();
      const setState = feedbackStateFor(
        { sound: audioEnabled, vibration: prefs.vibrationEnabled },
        prefs,
        'set'
      );
      if (setState.sound) playWorkoutSound('end', true, setState.volume);
      if (setState.vibration) vibrate(VIBRATION_PATTERNS.setEnd, true);
    }

    // "Début de repos" cue only when a real rest actually starts (> 0 seconds).
    const launchRest = (sec: number) => {
      setRestSecondsLeft(sec);
      if (sec > 0) {
        const prefs = getWorkoutSettings();
        const restState = feedbackStateFor(
          { sound: audioEnabled, vibration: prefs.vibrationEnabled },
          prefs,
          'rest'
        );
        if (restState.sound) playWorkoutSound('restStart', true, restState.volume);
        if (restState.vibration) vibrate(VIBRATION_PATTERNS.restStart, true);
      }
    };

    // Auto trigger rest timer if marked completed. When the whole exercise has
    // just been completed and other exercises remain, the following rest is a
    // transition BETWEEN exercises -> it uses the global exerciseTransitionRestSec.
    if (newStatus) {
      const exercise = updated[exIndex];
      const exerciseFinished = exercise.sets.every((s) => s.completed);
      const anyRemainingSets = updated.some((ex) => ex.sets.some((s) => !s.completed));
      if (exerciseFinished) {
        // Rest AFTER the whole exercise is complete.
        if (anyRemainingSets) {
          // Other exercises remain: a transition rest between exercises, using
          // this (completed) exercise's own transitionRestSec resolved against
          // the global setting. A value of 0 skips the rest (no countdown).
          const pref = getWorkoutSettings();
          const transition = resolveTransitionRestSec(updated[exIndex], pref.exerciseTransitionRestSec);
          launchRest(transition);
        } else {
          // Last exercise complete (only stretches/completion remain): do NOT
          // launch an unnecessary transition rest before the stretches.
          setRestSecondsLeft(null);
        }
      } else {
        // Rest BETWEEN two sets of the same exercise: per-set rest AFTER the
        // just-completed set (restPlan[setIndex] -> legacy restSec -> 30 s).
        launchRest(
          resolveSetRestSec(updated[exIndex], setIndex, getWorkoutSettings().defaultRestSec)
        );
      }
    }
  };

  const handleUpdateSet = (
    exIndex: number,
    setIndex: number,
    field: 'weightKg' | 'reps' | 'rpe',
    val: number
  ) => {
    const updated = [...sessionExercises];
    updated[exIndex].sets[setIndex][field] = val;
    setSessionExercises(updated);
  };

  // --- Guided mode -----------------------------------------------------
  const handleEnableGuided = () => {
    // Toggling guided on always starts from a fresh prep (checkpoint is only
    // restored from a saved draft via applyDraft).
    setGuidedCheckpoint(null);
    setRestSecondsLeft(null);
    setGuidedMode(true);
  };

  const handleExitGuided = () => {
    setGuidedMode(false);
    setGuidedCheckpoint(null);
    setIsTimerRunning(false);
    setRestSecondsLeft(null);
  };

  // Marks one stretched side (as the guided flow completes or skips it) without
  // the classic stretch timer machinery, which is hidden while guided is active.
  const handleGuidedStretchAdvance = (stretchIndex: number, side: 1 | 2) => {
    const st = activeStretches[stretchIndex];
    if (!st) return;
    const sideKey = `${st.id}-${side}`;
    setCompletedSidesMap((prev) => ({ ...prev, [sideKey]: true }));
    setCurrentStretchIdx(stretchIndex);
    setCurrentSideIndex(side);
    if (side === 2 || !st.hasSides) {
      setCompletedStretchesCount((prev) => prev + 1);
    }
  };

  // Guided flow finished its steps: reuse the classic summary, keeping the exact
  // same finalization backend (XP / records / F0 canFinish guard). Exiting the
  // guided overlay lets the classic summary phase render with that finalization.
  const handleGoToSummaryGuided = () => {
    setIsTimerRunning(false);
    setGuidedMode(false);
    setGuidedCheckpoint(null);
    setCurrentPhase('summary');
  };

  const handleUpdateSetDuration = (exIndex: number, setIndex: number, durationSec: number) => {
    const updated = [...sessionExercises];
    updated[exIndex].sets[setIndex].durationSec = Math.max(0, Math.round(durationSec));
    setSessionExercises(updated);
  };

  const handleSetExerciseMode = (exIndex: number, mode: ExerciseMode) => {
    const updated = [...sessionExercises];
    updated[exIndex].sets = updated[exIndex].sets.map((set) => ({
      ...set,
      mode,
    }));
    setSessionExercises(updated);
  };

  // Per-set rest AFTER a series, edited on the PREP screen. Free numeric input:
  // empty -> 0, invalid (NaN/Infinity) -> ignored, negative -> clamped to 0,
  // everything else -> rounded non-negative integer. The value is applied to the
  // live session log immediately (classic rest timer + guided engine both
  // resolve per-set rest) and a TARGETED restPlan[setIndex] update of the real
  // program's day config is persisted (only that entry changes, nothing else).
  const handleUpdateSetRest = (exIndex: number, setIndex: number, rawValue: string) => {
    const current = sessionExercises[exIndex];
    if (!current) return;
    let next: number;
    if (rawValue === '') {
      next = 0;
    } else {
      const num = Number(rawValue);
      if (!Number.isFinite(num)) return; // block NaN / Infinity / invalid strings
      next = Math.max(0, Math.round(num));
    }
    const fallbackRest = getWorkoutSettings().defaultRestSec;
    const plan = Array.isArray(current.restPlan) ? [...current.restPlan] : [];
    const planLen = Math.max(plan.length, current.sets.length, setIndex + 1);
    const restPlan: number[] = Array.from({ length: planLen }, (_unused, k) => {
      if (k === setIndex) return next;
      const v = plan[k];
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return v;
      return resolveSetRestSec(current, k, fallbackRest);
    });
    const updated = [...sessionExercises];
    updated[exIndex] = { ...current, restPlan };
    setSessionExercises(updated);
    if (programId && dayId && current.exerciseId) {
      onUpdateProgramSetRest?.(programId, dayId, current.exerciseId, setIndex, next);
    }
  };

  // Per-exercise rest AFTER the last set (transitionRestSec), edited on the PREP
  // screen. Empty clears it (falls back to the global default); invalid input is
  // ignored; otherwise clamped non-negative rounded value. Persisted targeted
  // into the real program's day config.
  const handleUpdateTransitionRest = (exIndex: number, rawValue: string) => {
    const current = sessionExercises[exIndex];
    if (!current) return;
    let next: number | undefined;
    if (rawValue !== '') {
      const num = Number(rawValue);
      if (!Number.isFinite(num)) return; // block NaN / Infinity / invalid strings
      next = Math.max(0, Math.round(num));
    }
    const updated = [...sessionExercises];
    updated[exIndex] = { ...current, transitionRestSec: next };
    setSessionExercises(updated);
    if (programId && dayId && current.exerciseId) {
      onUpdateProgramTransitionRest?.(programId, dayId, current.exerciseId, next);
    }
  };

  const handleStartTimedSet = (exIndex: number, setIndex: number) => {
    const set = sessionExercises[exIndex]?.sets[setIndex];
    if (!set || set.completed) return;
    const duration = set.durationSec || 0;
    if (duration <= 0) return; // no configured duration -> UI shows "Durée non configurée"
    setTimedSecondsLeft(duration);
    setActiveTimedSet({ exIndex, setIndex });
  };

  const handleStopTimedSet = () => {
    setActiveTimedSet(null);
    setTimedSecondsLeft(0);
  };

  const handleAddSet = (exIndex: number) => {
    const updated = [...sessionExercises];
    const ex = updated[exIndex];
    const sets = ex.sets;
    const lastSet = sets[sets.length - 1] || { weightKg: 0, reps: 10, mode: 'reps' as ExerciseMode, durationSec: 0 };
    sets.push({
      setNumber: sets.length + 1,
      weightKg: lastSet.weightKg,
      reps: lastSet.reps,
      mode: lastSet.mode || 'reps',
      durationSec: lastSet.durationSec || 0,
      completed: false,
    });
    // Keep restPlan in sync with the sets (same invariant as repsPlan/durationPlan):
    // the new series gets a sane default rest of 30 s.
    if (Array.isArray(ex.restPlan)) {
      updated[exIndex] = { ...ex, restPlan: appendSetRestSec(ex.restPlan, 30) };
    }
    setSessionExercises(updated);
  };

  const handleRemoveSet = (exIndex: number, setIndex: number) => {
    const currentExercise = sessionExercises[exIndex];
    const target = currentExercise?.sets[setIndex];
    // A completed set is never deleted: doing so would silently change the
    // journal / XP / records that were already earned from this session.
    if (!target || target.completed) return;
    const updated = [...sessionExercises];
    updated[exIndex].sets.splice(setIndex, 1);
    updated[exIndex].sets.forEach((s, idx) => {
      s.setNumber = idx + 1;
    });
    // Keep restPlan in sync: removing a set drops its matching rest entry.
    if (Array.isArray(updated[exIndex].restPlan)) {
      updated[exIndex] = {
        ...updated[exIndex],
        restPlan: removeSetRestSec(updated[exIndex].restPlan, setIndex),
      };
    }
    setSessionExercises(updated);
  };

  const handleAddExerciseToSession = () => {
    if (!selectedExerciseToAdd) return;
    const found = availableExercises.find((e) => e.id === selectedExerciseToAdd);
    if (!found) return;
    const setsCount = Number(found.defaultSets) || 3;

    setSessionExercises([
      ...sessionExercises,
      {
        exerciseId: found.id,
        exerciseName: found.name,
        muscleGroup: found.muscleGroup || 'Full Body',
        sets: Array.from({ length: setsCount }, (_, i) => ({
          setNumber: i + 1,
          weightKg: 0,
          reps: Number(found.defaultReps) || 10,
          mode: 'reps',
          durationSec: 0,
          completed: false,
        })),
      },
    ]);
    setSelectedExerciseToAdd('');
  };

  // Live Bodybuilding volume & stats (Stretches NOT counted in volume.
  // Timer sets never contribute weight x reps: only reps-mode completed sets.)
  // LOT 13: memoized so a 1-second timer tick doesn't re-run the reduce chains.
  const totalVolume = useMemo(() => {
    return sessionExercises.reduce((total, ex) => {
      return (
        total +
        ex.sets.reduce((exTotal, s) => {
          return s.completed && s.mode !== 'timer' ? exTotal + s.weightKg * s.reps : exTotal;
        }, 0)
      );
    }, 0);
  }, [sessionExercises]);

  const completedSetsCount = useMemo(() => {
    return sessionExercises.reduce((count, ex) => {
      return count + ex.sets.filter((s) => s.completed).length;
    }, 0);
  }, [sessionExercises]);

  // ==========================================
  // STRETCHING LOGIC & NAVIGATION
  // ==========================================
  const getSideLabel = (sideType?: StretchSideType, sideNumber: 1 | 2 = 1) => {
    if (sideType === 'leg') {
      return sideNumber === 1 ? 'Jambe Gauche' : 'Jambe Droite';
    }
    if (sideType === 'arm') {
      return sideNumber === 1 ? 'Bras Gauche' : 'Bras Droit';
    }
    return sideNumber === 1 ? 'Côté Gauche' : 'Côté Droit';
  };

  const handleStartStretchTimer = () => {
    setIsStretchTimerRunning(true);
  };

  const handlePauseStretchTimer = () => {
    setIsStretchTimerRunning(false);
  };

  const handleResetStretchTimer = () => {
    setIsStretchTimerRunning(false);
    if (currentStretch) {
      setStretchSecondsLeft(currentStretch.durationSec);
    }
  };

  const handleAddStretchTime = (seconds: number) => {
    setStretchSecondsLeft((prev) => prev + seconds);
  };

  // Advance automatically when timer ends
  const handleAdvanceStretchAuto = () => {
    if (!currentStretch) return;

    // Mark current side completed
    const sideKey = `${currentStretch.id}-${currentSideIndex}`;
    setCompletedSidesMap((prev) => ({ ...prev, [sideKey]: true }));

    if (currentStretch.hasSides && currentSideIndex === 1) {
      // Move to Side 2
      setCurrentSideIndex(2);
      setStretchSecondsLeft(currentStretch.durationSec);
      setIsStretchTimerRunning(true); // auto start side 2
    } else {
      // Stretch fully completed
      setCompletedStretchesCount((prev) => prev + 1);
      if (currentStretchIdx < activeStretches.length - 1) {
        setCurrentStretchIdx((prev) => prev + 1);
      } else {
        // All stretches finished -> Go to Summary Phase!
        setIsStretchTimerRunning(false);
        setCurrentPhase('summary');
      }
    }
  };

  // User manually clicks "Terminé"
  const handleFinishCurrentStretchStep = () => {
    playStretchChime(audioEnabled);
    handleAdvanceStretchAuto();
  };

  // User manually clicks "Passer" (Skip)
  const handleSkipCurrentStretch = () => {
    if (!currentStretch) return;

    if (currentStretch.hasSides && currentSideIndex === 1) {
      // Skip to side 2
      setCurrentSideIndex(2);
      setStretchSecondsLeft(currentStretch.durationSec);
      setIsStretchTimerRunning(false);
    } else {
      // Skip to next stretch
      if (currentStretchIdx < activeStretches.length - 1) {
        setCurrentStretchIdx((prev) => prev + 1);
      } else {
        setIsStretchTimerRunning(false);
        setCurrentPhase('summary');
      }
    }
  };

  // Jump to specific stretch index
  const handleSelectStretch = (index: number) => {
    if (index >= 0 && index < activeStretches.length) {
      setCurrentStretchIdx(index);
      setCurrentSideIndex(1);
      setStretchSecondsLeft(activeStretches[index].durationSec);
      setIsStretchTimerRunning(false);
    }
  };

  // Complete workout and persist
  const handleCompleteWorkout = async () => {
    // V7.8 P2 guard: refuse to end an empty/void session. Nothing is created,
    // the draft is preserved and the user is told why.
    if (!canFinish) {
      return;
    }
    draftDeletedRef.current = true;
    if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current);
    await SportTrackStorage.deleteSessionDraft().catch(() => {});
    const sessionObj: WorkoutSession = {
      id: `sess-${Date.now()}`,
      title: sessionTitle,
      date: toLocalDateKey(new Date()),
      startTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
      completed: true,
      totalVolumeKg: totalVolume,
      guided: guidedMode,
      feeling,
      notes,
      exercises: sessionExercises,
      stretchesCompleted: completedStretchesCount > 0,
      stretchesCount: completedStretchesCount,
    };

    onFinishSession(sessionObj);
  };

  return (
    <div id="page-workout-session" className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Auto-saved draft restore banner */}
      {draftState && (
        <div
          id="draft-restore-banner"
          className="rounded-3xl bg-amber-500/10 backdrop-blur-xl border border-amber-500/40 p-4 sm:p-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between shadow-2xl animate-in fade-in"
        >
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-amber-300 shrink-0" />
            <p className="text-sm text-amber-100 font-medium">
              {draftState.kind === 'applied'
                ? `Séance restaurée depuis une sauvegarde automatique${draftState.draft.updatedAt ? ` (${new Date(draftState.draft.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})` : ''}.`
                : 'Une séance en cours a été sauvegardée automatiquement. Souhaitez-vous la reprendre ?'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {draftState.kind === 'offered' && (
              <>
                <button
                  id="btn-draft-resume"
                  onClick={handleResumeDraft}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-violet-600 hover:bg-violet-500 text-white transition-colors"
                >
                  Reprendre
                </button>
                <button
                  id="btn-draft-dismiss"
                  onClick={handleDismissDraft}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-zinc-300 hover:text-white transition-colors"
                >
                  Ignorer
                </button>
              </>
            )}
            {draftState.kind === 'applied' && (
              <button
                id="btn-draft-discard"
                onClick={handleDiscardDraft}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-zinc-300 hover:text-rose-300 hover:border-rose-500/40 transition-colors"
              >
                Abandonner ce brouillon
              </button>
            )}
          </div>
        </div>
      )}

      {/* Session Active Top HUD Card */}
      <div className="rounded-3xl bg-gradient-to-br from-violet-600/30 via-violet-950/40 to-black/60 backdrop-blur-2xl border border-white/15 p-5 sm:p-7 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isTimerRunning ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              <span className="text-xs font-bold uppercase tracking-wider text-violet-300">
                {isTimerRunning ? 'Séance en cours' : elapsedSeconds > 0 ? 'Séance en pause' : 'Séance prête (Minuteur arrêté)'}
              </span>
            </div>
            <input
              type="text"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              className="font-display text-2xl sm:text-3xl font-bold uppercase text-white bg-transparent border-b border-transparent hover:border-violet-500/50 focus:border-violet-400 focus:outline-none w-full"
            />
          </div>

          {/* Chronometer & Timer controls */}
          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-2xl shrink-0">
            <Clock className={`w-5 h-5 ${isTimerRunning ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <div className="font-mono text-2xl font-bold text-white tracking-widest">
              {formatTime(elapsedSeconds)}
            </div>
            <button
              id="btn-toggle-timer"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                isTimerRunning
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
              }`}
            >
              {isTimerRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>{elapsedSeconds > 0 ? 'Reprendre' : 'Démarrer'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">Volume Muscu</span>
            <div className="font-display text-xl font-bold text-violet-300">
              {totalVolume.toLocaleString('fr-FR')} <span className="text-xs text-zinc-400 font-normal">kg</span>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">Séries validées</span>
            <div className="font-display text-xl font-bold text-emerald-400">{completedSetsCount}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">Étirements</span>
            <div className="font-display text-xl font-bold text-violet-400">
              {completedStretchesCount}/{activeStretches.length}
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">XP estimée</span>
            <div className="font-display text-xl font-bold text-amber-300">
              +{computeSessionXp(sessionExercises.length, completedStretchesCount)} XP
            </div>
          </div>
        </div>

        {/* Guided mode entry — official "Commencer la séance guidée" button.
            Reuses the exact same session data (exercises, sets, reps, timers,
            stretches) via the single guided engine; no second system. */}
        <div className="pt-2 border-t border-white/10">
          <button
            id="btn-guided-entry"
            onClick={handleEnableGuided}
            disabled={sessionExercises.length === 0}
            className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-40 ${
              guidedMode
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/50 border border-violet-400/50'
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-xl shadow-violet-900/40 border border-violet-400/40'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            {guidedMode ? 'Séance guidée active' : 'Commencer la séance guidée'}
          </button>
        </div>

        {/* Phase Navigation Tabs */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
          <button
            onClick={() => setCurrentPhase('musculation')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              currentPhase === 'musculation'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/50 border border-violet-400/50'
                : 'bg-white/5 text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span className="truncate">1. Musculation</span>
          </button>

          <button
            onClick={() => setCurrentPhase('stretching')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              currentPhase === 'stretching'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/50 border border-violet-400/50'
                : 'bg-white/5 text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="truncate">2. Étirements ({activeStretches.length})</span>
          </button>

          <button
            onClick={() => setCurrentPhase('summary')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              currentPhase === 'summary'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950 border border-emerald-400/50'
                : 'bg-white/5 text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate">3. Bilan & Fin</span>
          </button>
        </div>

        {/* Floating Rest Timer Bar if active in Musculation */}
        {restSecondsLeft !== null && currentPhase === 'musculation' && (
          <div className="bg-violet-600/30 backdrop-blur-xl border border-violet-500/40 rounded-2xl p-3.5 flex items-center justify-between gap-3 animate-in fade-in" data-testid="rest-bar">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-300 animate-spin" />
              <span className="text-xs font-semibold text-white">Temps de repos :</span>
              <span className="font-mono text-lg font-bold text-amber-300" data-testid="rest-timer">{formatTime(restSecondsLeft)}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Retirer 15 secondes de repos"
                onClick={() => setRestSecondsLeft((prev) => (prev !== null ? Math.max(0, prev - 15) : 0))}
                className="text-xs bg-white/10 text-white font-medium px-2.5 py-1 rounded-lg hover:bg-white/20 transition-colors"
              >
                −15 s
              </button>
              <button
                type="button"
                aria-label="Ajouter 15 secondes de repos"
                onClick={() => setRestSecondsLeft((prev) => (prev !== null ? prev + 15 : 15))}
                className="text-xs bg-white/10 text-white font-medium px-2.5 py-1 rounded-lg hover:bg-white/20 transition-colors"
              >
                +15 s
              </button>
              <button
                type="button"
                onClick={() => setRestSecondsLeft(0)}
                className="text-xs bg-black/40 text-zinc-300 px-2.5 py-1 rounded-lg hover:text-white transition-colors"
              >
                Passer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* GUIDED SESSION (single guided engine, drives the same session state)      */}
      {/* ========================================================================= */}
      {guidedMode && (
        <WorkoutGuidedSession
          exercises={sessionExercises}
          stretches={activeStretches}
          sessionTitle={sessionTitle}
          programTitle={programTitle}
          elapsedSeconds={elapsedSeconds}
          initialCheckpoint={guidedCheckpoint}
          completedSidesMap={completedSidesMap}
          onToggleSet={handleToggleSet}
          onUpdateSet={handleUpdateSet}
          onStretchAdvance={handleGuidedStretchAdvance}
          onGoToSummary={handleGoToSummaryGuided}
          onTimerRunningChange={setIsTimerRunning}
          onLeave={() => onLeaveSession?.()}
          onExitGuided={handleExitGuided}
          onCheckpointChange={setGuidedCheckpoint}
        />
      )}

      {/* ========================================================================= */}
      {/* PHASE 1: MUSCULATION (EXERCISES LOG)                                      */}
      {/* ========================================================================= */}
      {!guidedMode && currentPhase === 'musculation' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* LOT 9 — 9.6: presentational warm-up suggestion (skippable). Shows a
              short suggested routine keyed on today's muscle groups. Skipping
              it only hides this card for the current session. */}
          {!warmupIntroDismissed && (
            <div className="sport-card rounded-3xl p-5 sm:p-6 border-violet-500/30" data-testid="warmup-intro">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center shrink-0">
                    <Flame className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold uppercase tracking-wider text-white">{WARM_UP_LABEL} suggéré</h3>
                    <p className="text-[11px] text-zinc-400">{warmUpSuggestion.summary}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWarmupIntroDismissed(true)}
                  aria-label="Passer l'échauffement suggéré"
                  title={`~${Math.round(warmUpTotalDuration(warmUpSuggestion) / 60)} min`}
                  data-testid="warmup-skip"
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-all"
                >
                  Passer
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {warmUpSuggestion.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5">
                    <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white">{item.title}</div>
                      <div className="text-[10px] text-zinc-500">{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-zinc-500 flex items-center gap-1.5">
                <Info className="w-3 h-3" />
                Suggestion à titre indicatif. Préparez aussi le retour au calme : {COOL_DOWN_LABEL}.
              </p>
            </div>
          )}
          <div className="space-y-4">
            {sessionExercises.map((ex, exIdx) => (
              <div key={ex.exerciseId + exIdx} className="sport-card rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                      Exercice {exIdx + 1}
                    </span>
                    <h3 className="text-lg font-bold text-white">{ex.exerciseName}</h3>
                     <div className="flex flex-wrap items-center gap-1 mt-2">
                       {(['reps', 'timer'] as ExerciseMode[]).map((mode) => (
                         <button
                           key={mode}
                           type="button"
                           onClick={() => handleSetExerciseMode(exIdx, mode)}
                           className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${((ex.sets[0]?.mode || 'reps') === mode) ? 'bg-violet-600/30 text-violet-200 border-violet-500/50' : 'bg-white/5 text-zinc-400 border-white/10'}`}
                         >
                           {mode === 'reps' ? <Repeat className="inline w-3 h-3 mr-1" /> : <Timer className="inline w-3 h-3 mr-1" />}
                           {mode === 'reps' ? 'Répétitions' : 'Timer'}
                         </button>
                       ))}
                       <button
                         type="button"
                         onClick={() => setRestPanelOpen(restPanelOpen === exIdx ? null : exIdx)}
                         className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${restPanelOpen === exIdx ? 'bg-violet-600/30 text-violet-200 border-violet-500/50' : 'bg-white/5 text-zinc-400 border-white/10'}`}
                         title="Modifier le repos entre les séries"
                       >
                         <Clock className="inline w-3 h-3 mr-1" />
                         {(() => {
                           const values = ex.sets.map((_s, sIdx) => resolveSetRestSec(ex, sIdx, getWorkoutSettings().defaultRestSec));
                           const allSame = values.length > 0 && values.every((v) => v === values[0]);
                           return allSame ? `Repos : ${values[0]}s` : 'Repos : variable';
                         })()}
                       </button>
                       <button
                         type="button"
                         onClick={() => handleRequestReplace(exIdx)}
                         className="px-2.5 py-1 rounded-lg text-[10px] font-bold border bg-white/5 text-zinc-400 border-white/10 hover:text-violet-200 hover:border-violet-500/50 transition-all"
                         title="Remplacer cet exercice par une alternative"
                       >
                         <Shuffle className="inline w-3 h-3 mr-1" />
                         Remplacer
                       </button>
                     </div>
                     {restPanelOpen === exIdx && (
                       <div className="mt-2 rounded-xl bg-black/30 border border-white/10 p-3 space-y-1.5">
                         <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Repos entre les séries</div>
                         {ex.sets.map((_set, sIdx) => (
                           <div key={sIdx} className="flex items-center justify-between gap-2">
                             <span className="text-[11px] text-zinc-400">Série {sIdx + 1}</span>
                             <div className="flex items-center gap-1.5">
                               <input
                                 type="number"
                                 min={0}
                                 step={1}
                                 value={resolveSetRestSec(ex, sIdx, getWorkoutSettings().defaultRestSec)}
                                 onChange={(e) => handleUpdateSetRest(exIdx, sIdx, e.target.value)}
                                 className="w-16 bg-black/40 border border-white/10 rounded-lg py-1 text-center font-bold text-xs text-white focus:outline-none focus:border-violet-500"
                                 title="Repos après cette série (0 = aucun repos)"
                               />
                               <span className="text-[11px] text-zinc-400">s</span>
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                  </div>
                  <span className="text-xs font-semibold bg-white/10 text-violet-300 px-3 py-1 rounded-xl border border-white/10">
                    {ex.muscleGroup}
                  </span>
                </div>

                {/* Sets Table — desktop header (mobile uses per-set cards) */}
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-12 text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-2">
                    <span className="col-span-2">Série</span>
                    <span className="col-span-4 text-center">Charge (kg)</span>
                    <span className="col-span-4 text-center">Objectif</span>
                    <span className="col-span-2 text-right">Valider</span>
                  </div>

                  {ex.sets.map((set, sIdx) => (
                    <div
                      key={sIdx}
                      className={`flex flex-col gap-2.5 p-3 rounded-2xl border transition-colors sm:grid sm:grid-cols-12 sm:items-center sm:gap-2 sm:p-2.5 ${
                        set.completed
                          ? 'bg-violet-600/20 border-violet-500/40 text-violet-200'
                          : 'bg-white/5 border-white/10 text-zinc-300'
                      }`}
                    >
                      {/* Mobile: série number + validate button */}
                      <div className="flex items-center justify-between sm:hidden">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs">{`Série ${set.setNumber}`}</span>
                          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                            {set.mode === 'timer' ? 'chrono' : 'reps'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleToggleSet(exIdx, sIdx)}
                          disabled={set.completed || (set.mode === 'timer' && (set.durationSec || 0) <= 0)}
                          aria-label={set.completed ? 'Marquer la série comme incomplète' : 'Valider la série'}
                          aria-pressed={set.completed}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                            set.completed
                              ? 'bg-emerald-500 text-black font-bold shadow-lg shadow-emerald-950'
                              : 'bg-white/5 border border-white/15 text-zinc-400'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>

                      {/* Desktop: série number */}
                      <div className="hidden sm:block sm:col-span-2 font-mono font-bold text-xs pl-2">
                        #{set.setNumber}
                      </div>

                      {/* Charge */}
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-center sm:gap-1 sm:col-span-4">
                        <span className="text-[10px] font-semibold text-zinc-500 sm:hidden">Charge (kg)</span>
                        <div className="flex items-center justify-between gap-1">
                          <input
                            type="number"
                            step={0.5}
                            min={0}
                            value={set.weightKg}
                            onChange={(e) =>
                              handleUpdateSet(exIdx, sIdx, 'weightKg', Number(e.target.value))
                            }
                            className="w-20 bg-black/40 border border-white/10 rounded-xl py-1.5 text-center font-bold text-sm text-white focus:outline-none focus:border-violet-500 sm:w-16"
                          />
                          <span className="text-xs text-zinc-400">kg</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-zinc-300">RPE</span>
                            <div className="flex gap-1">
                              {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as number[]).map((r) => (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => handleUpdateSet(exIdx, sIdx, 'rpe', r)}
                                  className={`inline-flex items-center gap-0.5 rounded-full px-2 py-1.5 text-[10px] font-semibold ${
                                    set.rpe === r
                                      ? 'bg-violet-600 text-white shadow'
                                      : 'text-zinc-400 hover:bg-violet-100 border border-white/10'
                                  }`}
                                  aria-label={`RPE ${r}`}
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenOneRMModal(exIdx, 'percentage')}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-violet-600/20 border border-white/10 hover:border-violet-500/40 text-zinc-400 hover:text-violet-400 transition-colors"
                            aria-label="Calculateur 1RM"
                            title="Calculateur 1RM"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Objectif */}
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-center sm:gap-1 sm:col-span-4">
                        <span className="text-[10px] font-semibold text-zinc-500 sm:hidden">
                          Objectif ({set.mode === 'timer' ? 'chrono' : 'reps'})
                        </span>
                        {set.mode === 'timer' ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateSetDuration(exIdx, sIdx, (set.durationSec || 0) - 10)}
                                disabled={set.completed || (set.durationSec || 0) <= 0}
                                className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-40"
                                title="-10 secondes"
                              >
                                −10s
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={3600}
                                value={set.durationSec}
                                disabled={set.completed}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  handleUpdateSetDuration(exIdx, sIdx, Number.isFinite(v) ? v : 0);
                                }}
                                className="w-16 bg-black/40 border border-white/10 rounded-xl py-1.5 text-center font-bold text-sm text-white focus:outline-none focus:border-violet-500 disabled:opacity-50"
                                title="Durée en secondes"
                              />
                              <span className="text-xs text-zinc-400">sec</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateSetDuration(exIdx, sIdx, (set.durationSec || 0) + 10)}
                                disabled={set.completed}
                                className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-40"
                                title="+10 secondes"
                              >
                                +10s
                              </button>
                            </div>
                            <button
                              type="button"
                              data-testid={`timed-set-btn-${exIdx}-${sIdx}`}
                              onClick={() => activeTimedSet?.exIndex === exIdx && activeTimedSet?.setIndex === sIdx ? handleStopTimedSet() : handleStartTimedSet(exIdx, sIdx)}
                              disabled={set.completed || !((set.durationSec ?? 0) > 0)}
                              className={`min-w-24 px-2 py-1.5 rounded-xl font-mono font-bold text-sm border transition-all ${activeTimedSet?.exIndex === exIdx && activeTimedSet?.setIndex === sIdx ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-black/40 text-white border-white/10 disabled:opacity-40'}`}
                            >
                              <Timer className="inline w-3.5 h-3.5 mr-1" />
                              {activeTimedSet?.exIndex === exIdx && activeTimedSet?.setIndex === sIdx ? formatDuration(timedSecondsLeft) : formatDuration(set.durationSec || 0)}
                            </button>
                            {(set.durationSec ?? 0) > 0 ? (
                              <span className="text-[9px] text-zinc-500">La durée est indépendante des reps</span>
                            ) : (
                              <span className="text-[9px] font-bold text-amber-400">Durée non configurée — saisissez une durée</span>
                            )}
                          </div>
                        ) : (
                          <>
                            <input
                              type="number"
                              min={1}
                              max={1000}
                              value={set.reps}
                              onChange={(e) => {
                                const reps = Number(e.target.value) || 1;
                                const updated = [...sessionExercises];
                                updated[exIdx].sets[sIdx].reps = reps;
                                // Reps and timer are independent: changing reps must not alter the saved timer.
                                setSessionExercises(updated);
                              }}
                              className="w-20 bg-black/40 border border-white/10 rounded-xl py-1.5 text-center font-bold text-sm text-white focus:outline-none focus:border-violet-500 sm:w-16"
                            />
                            <span className="text-xs text-zinc-400">reps</span>
                          </>
                        )}
                      </div>

                      {/* Desktop: validate button */}
                      <div className="hidden sm:flex sm:col-span-2 sm:items-center sm:justify-end sm:gap-1">
                        <button
                          onClick={() => handleToggleSet(exIdx, sIdx)}
                          disabled={set.completed || (set.mode === 'timer' && (set.durationSec || 0) <= 0)}
                          aria-label={set.completed ? 'Marquer la série comme incomplète' : 'Valider la série'}
                          aria-pressed={set.completed}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                            set.completed
                              ? 'bg-emerald-500 text-black font-bold shadow-lg shadow-emerald-950'
                              : 'bg-white/5 border border-white/15 text-zinc-400 hover:text-white hover:border-violet-500'
                          }`}
                          title={set.completed ? 'Marquer incomplète' : 'Valider la série'}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>

                      {/* Repos après cette série */}
                      <div className="flex items-center justify-between gap-2 pt-1.5 mt-1 border-t border-white/5 sm:col-span-12">
                        <span className="text-[10px] font-semibold text-zinc-400">Repos après cette série</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={resolveSetRestSec(ex, sIdx, getWorkoutSettings().defaultRestSec)}
                            onChange={(e) => handleUpdateSetRest(exIdx, sIdx, e.target.value)}
                            className="w-16 bg-black/40 border border-white/10 rounded-xl py-1 text-center font-bold text-sm text-white focus:outline-none focus:border-violet-500"
                            title="Repos entre cette série et la suivante (0 = aucun repos)"
                          />
                          <span className="text-xs text-zinc-400">s</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add set button */}
                <div className="flex justify-between items-center pt-1">
                  <button
                    onClick={() => handleAddSet(exIdx)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 py-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une série</span>
                  </button>

                  {ex.sets.length > 1 && (
                    <button
                      onClick={() => handleRemoveSet(exIdx, ex.sets.length - 1)}
                      disabled={ex.sets[ex.sets.length - 1]?.completed}
                      title={ex.sets[ex.sets.length - 1]?.completed ? 'Série déjà réalisée — marquez-la incomplète avant de la supprimer' : 'Supprimer la dernière série'}
                      className={`text-[11px] text-zinc-500 hover:text-rose-400 transition-colors disabled:opacity-40 disabled:hover:text-zinc-500 disabled:cursor-not-allowed`}
                    >
                      Supprimer dernière série
                    </button>
                  )}
                </div>

                {/* Per-exercise rest AFTER the last set (transitionRestSec), PREP
                    screen only: free numeric input, falls back to the global default
                    when not configured. Persists ONLY transitionRestSec. */}
                <div className="flex items-center justify-between gap-2 pt-2 mt-1 border-t border-white/5">
                  <span className="text-xs font-semibold text-zinc-400">Repos après l'exercice</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={
                        Number.isFinite(ex.transitionRestSec) && (ex.transitionRestSec ?? -1) >= 0
                          ? ex.transitionRestSec
                          : getWorkoutSettings().exerciseTransitionRestSec
                      }
                      onChange={(e) => handleUpdateTransitionRest(exIdx, e.target.value)}
                      className="w-16 bg-black/40 border border-white/10 rounded-xl py-1.5 text-center font-bold text-sm text-white focus:outline-none focus:border-violet-500"
                      title="Repos après la dernière série, avant l'exercice suivant (0 = aucun repos)"
                    />
                    <span className="text-xs text-zinc-400">secondes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Exercise Bar */}
          <div className="sport-card rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-3">
            <select
              value={selectedExerciseToAdd}
              onChange={(e) => setSelectedExerciseToAdd(e.target.value)}
              className="w-full sm:flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
            >
              <option value="" className="bg-[#0f0f15]">Sélectionner un exercice à ajouter...</option>
              {availableExercises.map((e) => (
                <option key={e.id} value={e.id} className="bg-[#0f0f15]">
                  {e.name} ({e.muscleGroup})
                </option>
              ))}
            </select>

            <button
              onClick={handleAddExerciseToSession}
              disabled={!selectedExerciseToAdd}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-2xl transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter à la séance</span>
            </button>
          </div>

          {/* End of Musculation -> Clear Separation to Stretching */}
          <div className="rounded-3xl bg-gradient-to-r from-violet-900/40 via-purple-900/30 to-black/60 border border-violet-500/30 p-6 sm:p-7 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-violet-400 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Phase Suivante Recommandée</span>
                </div>
                <h3 className="font-display text-2xl font-bold uppercase text-white tracking-wide">
                  RETOUR AU CALME & ÉTIREMENTS
                </h3>
                <p className="text-xs text-zinc-300 max-w-xl">
                  {activeStretches.length} étirements guidés ciblés pour accélérer la récupération et relâcher les tensions musculaires.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-goto-stretches"
                  onClick={() => setCurrentPhase('stretching')}
                  className="flex items-center gap-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl shadow-xl shadow-violet-900/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <span>Démarrer les étirements</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-white/10">
              {activeStretches.map((s, idx) => (
                <div
                  key={s.id}
                  className="sport-card rounded-3xl p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-violet-600/30 border border-violet-500/30 text-violet-200 flex items-center justify-center font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-sm sm:text-base">{s.name}</h4>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{s.targetArea}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-violet-200 text-sm">{s.durationSec}s</div>
                      <div className="text-[10px] text-zinc-500">{s.hasSides ? 'par côté' : 'maintien'}</div>
                    </div>
                  </div>
                  <div className="mt-3 bg-white/5 border border-white/10 rounded-2xl px-3 py-2.5 text-xs text-zinc-300 leading-relaxed">
                    {s.instruction}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LOT 9 — 9.5: exercise replacement modal (explicit confirmation, no
          automatic rewriting of the original program; mode change is surfaced
          before confirmation and never converts reps<->sec). */}
      {replaceExerciseTarget !== null && (() => {
        const targetLog = sessionExercises[replaceExerciseTarget];
        const original = targetLog ? availableExercises.find((e) => e.id === targetLog.exerciseId) : null;
        const alternatives = original ? getExerciseAlternatives(original, availableExercises, 6) : [];
        const existingMode: 'reps' | 'timer' = targetLog?.sets[0]?.mode === 'timer' ? 'timer' : 'reps';
        const selectedAlt = alternatives.find((a) => a.exercise.id === replaceSelectionId)?.exercise;
        const willSwitch = selectedAlt ? alternativeWillSwitchMode(existingMode, selectedAlt) : false;
        const rankLabel = (r: 1 | 2 | 3) =>
          r === 1 ? 'Recommandé par le catalogue' : r === 2 ? 'Même groupe musculaire' : 'Équipement identique';
        return (
          <div className="fixed inset-0 z-[85] bg-black/85 backdrop-blur-md flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Remplacer l'exercice">
            <div className="w-full max-w-md sport-card rounded-3xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                    <Shuffle className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold uppercase tracking-wider text-white">Remplacer l'exercice</h2>
                    <div className="text-[11px] text-zinc-400">
                      {targetLog?.exerciseName || 'Exercice'}
                      <span className="text-zinc-500"> · mode {existingMode === 'timer' ? 'Timer' : 'Répétitions'}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setReplaceExerciseTarget(null)} aria-label="Fermer" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {alternatives.length === 0 ? (
                <p className="text-xs text-zinc-400 bg-white/5 border border-white/10 rounded-2xl p-4">
                  Aucune alternative trouvée dans le catalogue pour cet exercice.
                </p>
              ) : (
                <div className="space-y-2" data-testid="replace-alternatives-list">
                  {alternatives.map((alt) => {
                    const isSelected = replaceSelectionId === alt.exercise.id;
                    return (
                      <button
                        key={alt.exercise.id}
                        type="button"
                        onClick={() => setReplaceSelectionId(alt.exercise.id)}
                        data-testid={`replace-alt-${alt.exercise.id}`}
                        aria-pressed={isSelected}
                        className={`w-full text-left flex items-start gap-3 p-3 rounded-2xl border transition-all ${
                          isSelected ? 'bg-violet-600/20 border-violet-500/60' : 'bg-white/5 border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate">{alt.exercise.name}</div>
                          <div className="text-[11px] text-zinc-400">
                            {rankLabel(alt.rank)} · {alt.exercise.equipment} · {alt.exercise.difficulty}
                          </div>
                        </div>
                        <span className="shrink-0 w-5 h-5 rounded-full border flex items-center justify-center mt-0.5">
                          {isSelected && <Check className="w-3 h-3 text-violet-300" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedAlt && (
                <div className={`rounded-2xl px-3.5 py-2.5 text-xs border space-y-1 ${willSwitch ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'}`} data-testid="replace-mode-notice">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Info className="w-3.5 h-3.5" />
                    {willSwitch ? 'Changement de mode nécessaire' : 'Mode conservé'}
                  </div>
                  <p className="text-[11px] text-white/80 leading-relaxed">
                    {willSwitch
                      ? `« ${selectedAlt.name} » s'exécute naturellement en mode ${parseDefaultModeLabel(selectedAlt)}. Aucune conversion ne sera faite (les données restent indépendantes).`
                      : `« ${selectedAlt.name} » est compatible avec le mode actuel (${existingMode === 'timer' ? 'Timer' : 'Répétitions'}).`}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setReplaceExerciseTarget(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-all"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={!selectedAlt}
                  onClick={() => handleConfirmReplace(replaceExerciseTarget, replaceSelectionId)}
                  data-testid="replace-confirm"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider transition-all"
                >
                  <Shuffle className="w-3.5 h-3.5" /> Remplacer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* PHASE 2: ÉTIREMENTS DE FIN DE SÉANCE (GUIDED STRETCH PLAYER)               */}
      {/* ========================================================================= */}
      {!guidedMode && currentPhase === 'stretching' && currentStretch && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Main Stretch Hero Container */}
          <div className="rounded-3xl bg-gradient-to-br from-violet-950/70 via-black/80 to-purple-950/60 backdrop-blur-2xl border border-violet-500/40 p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* Header: Title and Progress */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2 text-violet-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Récupération & Mobilité</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase text-white tracking-wide">
                  RETOUR AU CALME & ÉTIREMENTS
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  aria-label={audioEnabled ? 'Désactiver le son' : 'Activer le son'}
                  aria-pressed={audioEnabled}
                  className={`p-2.5 rounded-xl border transition-colors ${
                    audioEnabled
                      ? 'bg-violet-600/30 border-violet-400 text-violet-200'
                      : 'bg-white/5 border-white/10 text-zinc-500'
                  }`}
                  title={audioEnabled ? 'Son activé (Bip de fin)' : 'Son désactivé'}
                >
                  {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                <div className="text-right">
                  <span className="text-xs font-bold text-violet-300 uppercase">Progression</span>
                  <div className="text-sm font-mono font-bold text-white">
                    {currentStretchIdx + 1} / {activeStretches.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Stretch List — same visual organization as the exercise list */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-3">
                <span className="col-span-1">#</span>
                <span className="col-span-7 sm:col-span-8">Étirement</span>
                <span className="col-span-3 sm:col-span-2 text-center">Durée</span>
                <span className="col-span-1 text-right">OK</span>
              </div>

              {activeStretches.map((st, idx) => {
                const firstSideDone = !!completedSidesMap[`${st.id}-1`];
                const secondSideDone = !st.hasSides || !!completedSidesMap[`${st.id}-2`];
                const isCompleted = firstSideDone && secondSideDone;
                const isCurrent = idx === currentStretchIdx;

                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleSelectStretch(idx)}
                    className={`w-full grid grid-cols-12 items-center gap-2 p-3 rounded-2xl border text-left transition-all ${
                      isCurrent
                        ? 'bg-violet-600/20 border-violet-500/50 shadow-lg shadow-violet-950/20'
                        : isCompleted
                        ? 'bg-emerald-950/30 border-emerald-700/40'
                        : 'bg-white/5 border-white/10 hover:bg-white/[0.08] hover:border-violet-500/30'
                    }`}
                  >
                    <div className="col-span-1 font-mono font-bold text-xs text-zinc-400">
                      {isCompleted ? '✓' : idx + 1}
                    </div>

                    <div className="col-span-7 sm:col-span-8 min-w-0">
                      <div className={`font-bold text-sm truncate ${
                        isCompleted ? 'text-emerald-300' : isCurrent ? 'text-violet-100' : 'text-white'
                      }`}>
                        {st.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                        {st.targetArea}
                        {st.hasSides ? ' • par côté' : ' • maintien'}
                      </div>
                    </div>

                    <div className="col-span-3 sm:col-span-2 text-center">
                      <span className="text-xs font-bold text-violet-200">
                        {st.durationSec}s
                      </span>
                      {st.hasSides && (
                        <span className="block text-[10px] text-zinc-500">/ côté</span>
                      )}
                    </div>

                    <div className="col-span-1 flex justify-end">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isCompleted
                            ? 'bg-emerald-500 text-black'
                            : isCurrent
                            ? 'bg-violet-600/40 border border-violet-400/50 text-violet-200'
                            : 'bg-white/5 border border-white/10 text-zinc-600'
                        }`}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Current Stretch Detailed Card */}
            <div className="sport-card-active rounded-3xl p-6 sm:p-7 space-y-5 border-violet-500/50 bg-black/50">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-violet-600/40 text-violet-300 border border-violet-500/40 px-3 py-1 rounded-xl">
                      🎯 Zone ciblée : {currentStretch.targetArea}
                    </span>
                    <span className="text-xs font-semibold text-zinc-400 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
                      ⏱ {currentStretch.durationSec}s {currentStretch.hasSides ? 'par côté' : ''}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-display font-bold text-white uppercase tracking-wide">
                    {currentStretch.name}
                  </h3>
                </div>

                {/* Side Indicator Badge if stretch has sides */}
                {currentStretch.hasSides && (
                  <div className="flex items-center gap-2 bg-violet-950/80 border border-violet-500/40 px-4 py-2.5 rounded-2xl shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse" />
                    <div>
                      <div className="text-[10px] uppercase font-bold text-violet-300 tracking-wider">
                        Côté en cours ({currentSideIndex}/2)
                      </div>
                      <div className="text-sm font-bold text-white">
                        {getSideLabel(currentStretch.sideType, currentSideIndex)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Execution Instructions Box */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-violet-600/30 border border-violet-500/30 text-violet-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-violet-300 uppercase tracking-wider">
                    Consigne d'exécution
                  </span>
                  <p className="text-sm sm:text-base text-zinc-200 leading-relaxed font-medium">
                    {currentStretch.instruction}
                  </p>
                </div>
              </div>

              {/* Countdown Chronometer Display */}
              <div className="flex flex-col items-center justify-center py-4 space-y-3">
                <div className="relative flex items-center justify-center">
                  <div className="w-44 h-44 rounded-full border-4 border-violet-500/20 flex flex-col items-center justify-center bg-black/60 shadow-inner">
                    <span className="font-mono text-5xl font-bold text-white tracking-wider">
                      {formatTime(stretchSecondsLeft)}
                    </span>
                    <span className="text-xs font-bold text-violet-400 uppercase tracking-widest mt-1">
                      {currentStretch.hasSides ? getSideLabel(currentStretch.sideType, currentSideIndex) : 'Maintien'}
                    </span>
                  </div>
                </div>

                {/* Quick Add Time & Reset */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAddStretchTime(10)}
                    className="text-xs bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl border border-white/10 transition-colors"
                  >
                    +10s
                  </button>
                  <button
                    onClick={handleResetStretchTimer}
                    className="text-xs bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl border border-white/10 transition-colors"
                    title="Réinitialiser le chrono"
                  >
                    <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                    Reset
                  </button>
                </div>
              </div>

              {/* Dynamic Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {/* 1. Play / Start Button */}
                <button
                  id="btn-stretch-start"
                  onClick={handleStartStretchTimer}
                  disabled={isStretchTimerRunning}
                  className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
                    isStretchTimerRunning
                      ? 'bg-white/5 text-zinc-600 border border-white/5 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 border border-emerald-400'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Commencer</span>
                </button>

                {/* 2. Pause Button */}
                <button
                  id="btn-stretch-pause"
                  onClick={handlePauseStretchTimer}
                  disabled={!isStretchTimerRunning}
                  className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all ${
                    !isStretchTimerRunning
                      ? 'bg-white/5 text-zinc-600 border border-white/5 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-950 border border-amber-400'
                  }`}
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </button>

                {/* 3. Terminé Button */}
                <button
                  id="btn-stretch-done"
                  onClick={handleFinishCurrentStretchStep}
                  className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/50 border border-violet-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Terminé</span>
                </button>

                {/* 4. Passer Button */}
                <button
                  id="btn-stretch-skip"
                  onClick={handleSkipCurrentStretch}
                  className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>Passer</span>
                </button>
              </div>
            </div>

            {/* Bottom Footer Stretch Navigation */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                onClick={() => handleSelectStretch(currentStretchIdx - 1)}
                disabled={currentStretchIdx === 0}
                className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Étirement précédent</span>
              </button>

              <button
                onClick={() => setCurrentPhase('summary')}
                className="text-xs font-bold text-violet-300 hover:text-white hover:underline"
              >
                Passer tous les étirements & aller au bilan →
              </button>

              <button
                onClick={() => {
                  if (currentStretchIdx < activeStretches.length - 1) {
                    handleSelectStretch(currentStretchIdx + 1);
                  } else {
                    setCurrentPhase('summary');
                  }
                }}
                className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                <span>{currentStretchIdx < activeStretches.length - 1 ? 'Étirement suivant' : 'Bilan final'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 3: SÉANCE TERMINÉE & BILAN DE FIN DE SÉANCE                         */}
      {/* ========================================================================= */}
      {!guidedMode && currentPhase === 'summary' && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          {/* Celebratory Victory Header Banner */}
          <div className="rounded-3xl bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900 p-8 sm:p-10 text-center space-y-4 shadow-2xl shadow-violet-950/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-xl border border-white/30 text-amber-300 shadow-xl mx-auto">
              <Trophy className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-3xl sm:text-5xl font-extrabold uppercase text-white tracking-wide">
                SÉANCE TERMINÉE
              </h2>
              <p className="text-violet-200 text-sm sm:text-base font-medium max-w-lg mx-auto">
                Excellent travail ! Votre séance et vos étirements ont été validés avec succès.
              </p>
            </div>

            {/* Summary Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 max-w-2xl mx-auto">
              <div className="bg-black/30 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
                <span className="text-[10px] text-violet-200 uppercase font-semibold">Temps Total</span>
                <div className="font-display text-2xl font-bold text-white">{formatTime(elapsedSeconds)}</div>
              </div>
              <div className="bg-black/30 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
                <span className="text-[10px] text-violet-200 uppercase font-semibold">Volume Muscu</span>
                <div className="font-display text-2xl font-bold text-violet-200">
                  {totalVolume.toLocaleString('fr-FR')} <span className="text-xs font-normal">kg</span>
                </div>
              </div>
              <div className="bg-black/30 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
                <span className="text-[10px] text-violet-200 uppercase font-semibold">Séries Faites</span>
                <div className="font-display text-2xl font-bold text-emerald-300">{completedSetsCount}</div>
              </div>
              <div className="bg-black/30 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
                <span className="text-[10px] text-violet-200 uppercase font-semibold">Étirements</span>
                <div className="font-display text-2xl font-bold text-amber-300">
                  {completedStretchesCount}/{activeStretches.length}
                </div>
              </div>
            </div>
          </div>

          {/* Session Feelings & Notes Form */}
          <div className="sport-card-active rounded-3xl p-6 sm:p-7 space-y-5">
            <h3 className="font-bold text-base text-violet-200">Bilan et impressions</h3>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">Ressenti global de la séance</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(['💪 Puissant', '🔥 Top forme', '⚡ Normal', '😴 Difficile'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFeeling(opt)}
                    className={`py-3 px-3 rounded-2xl text-xs font-semibold border transition-all ${
                      feeling === opt
                        ? 'bg-violet-600 text-white border-violet-400 shadow-md shadow-violet-900/40 scale-[1.02]'
                        : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Notes personnelles & sensations (optionnel)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Super étirements du cobra, très bonne congestion pectoraux..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-white/10">
              <button
                id="btn-cancel-session-summary"
                onClick={handleCancelSession}
                className="sm:w-1/3 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-semibold text-xs transition-colors border border-white/10"
              >
                Quitter sans enregistrer
              </button>
              <button
                id="btn-finish-session-submit-summary"
                onClick={handleCompleteWorkout}
                aria-disabled={!canFinish}
                className={`sm:w-2/3 flex items-center justify-center gap-2.5 text-white font-bold text-sm uppercase tracking-wider py-4 rounded-2xl transition-all ${
                  canFinish
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-xl shadow-violet-900/40 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                    : 'bg-white/10 text-zinc-500 border border-white/10 pointer-events-none'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>TERMINER ET ENREGISTRER LA SÉANCE</span>
              </button>
              {/* LOT E.4 — Bouton export séance */}
              <button
                id="btn-export-session"
                onClick={handleExportSession}
                disabled={!canFinish}
                className={`sm:w-1/3 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-semibold text-xs transition-colors border border-white/10 ${canFinish ? '' : 'pointer-events-none opacity-40'}`}
                aria-label="Exporter la séance"
                title="Exporter la séance"
              >
                <Download className="w-4 h-4 mr-2" />
                <span>Exporter</span>
              </button>
            </div>
            {!canFinish && (
              <p
                id="finish-invalid-message"
                className="mt-3 text-xs sm:text-sm font-medium text-amber-300 flex items-center gap-2"
                role="alert"
              >
                <Flame className="w-4 h-4 shrink-0" />
                Termine au moins une série avant de valider la séance.
              </p>
            )}
          </div>
        </div>
      )}

      {/* LOT E.1 — 1RM Calculator Modal */}
      {oneRMModalOpen && oneRMModalExercise && (
        <OneRMModal
          isOpen={oneRMModalOpen}
          onClose={() => {
            setOneRMModalOpen(false);
            setOneRMModalExIndex(null);
          }}
          initialMode={oneRMModalMode}
          onApplyWeight={handleOneRMApply}
          applyLabel="Appliquer à toutes les séries"
        />
      )}
    </div>
  );
};
