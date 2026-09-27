import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SessionExerciseLog,
  StretchItem,
  GuidedSettings,
  WorkoutDraftGuided,
} from '../../types';
import {
  buildExerciseSteps,
  buildStretchSteps,
  DEFAULT_COUNTDOWN_SEC,
  DEFAULT_REST_SEC,
  estimatedGuidedDurationSec,
  formatGuidedDuration,
  guidedProgressPercent,
  GuidedPhase,
  GuidedStep,
  resolveFirstIncompleteStep,
  resolveGuidedRestSec,
} from './workoutGuidedEngine';
import { playWorkoutSound, startWorkoutMusic, unlockAudio } from './workoutAudio';
import { vibrate } from './workoutVibration';
import { cancelSpeech, speak, speakCountdownValue } from './workoutSpeech';
import { getWorkoutSettings, guidedSettingsFromWorkoutSettings } from '../../utilsSettings';
import {
  ArrowRight,
  Check,
  Clock,
  Dumbbell,
  Flag,
  Music,
  Pause,
  Pencil,
  Play,
  Repeat,
  RotateCcw,
  Settings as SettingsIcon,
  SkipForward,
  Sparkles,
  Timer,
  Volume2,
  X,
} from 'lucide-react';

interface WorkoutGuidedSessionProps {
  exercises: SessionExerciseLog[];
  stretches: StretchItem[];
  sessionTitle: string;
  programTitle?: string;
  elapsedSeconds?: number;
  initialCheckpoint?: WorkoutDraftGuided | null;
  completedSidesMap: Record<string, boolean>;
  onToggleSet: (exIndex: number, setIndex: number) => void;
  onUpdateSet: (exIndex: number, setIndex: number, field: 'weightKg' | 'reps', val: number) => void;
  onStretchAdvance: (stretchIndex: number, side: 1 | 2) => void;
  onGoToSummary: () => void;
  onTimerRunningChange: (running: boolean) => void;
  onLeave: () => void;
  onExitGuided: () => void;
  onCheckpointChange: (ck: WorkoutDraftGuided) => void;
}

const formatTime = (totalSec: number) => {
  const mins = Math.floor(Math.max(0, totalSec) / 60);
  const secs = Math.max(0, totalSec) % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const WorkoutGuidedSession: React.FC<WorkoutGuidedSessionProps> = ({
  exercises,
  stretches,
  sessionTitle,
  programTitle,
  elapsedSeconds: elapsedRaw,
  initialCheckpoint,
  completedSidesMap,
  onToggleSet,
  onUpdateSet,
  onStretchAdvance,
  onGoToSummary,
  onTimerRunningChange,
  onLeave,
  onExitGuided,
  onCheckpointChange,
}) => {
  const elapsed = elapsedRaw || 0;
  const allSteps = useMemo<GuidedStep[]>(
    () => [...buildExerciseSteps(exercises), ...buildStretchSteps(stretches)],
    [exercises, stretches]
  );
  const totalSteps = allSteps.length;

  const [phase, setPhase] = useState<GuidedPhase>(() => initialCheckpoint?.phase ?? 'prep');
  const [stepIndex, setStepIndex] = useState<number>(0);
  // LOT H: a NEW guided session (no checkpoint) seeds its rest from the program
  // config when explicitly set, otherwise from the global default rest. An
  // in-progress / resumed session (checkpoint) keeps its own restSec untouched.
  const [restSec, setRestSec] = useState<number>(() => {
    if (initialCheckpoint?.restSec != null && Number.isFinite(initialCheckpoint.restSec)) {
      return initialCheckpoint.restSec;
    }
    const firstConfigRest = exercises?.[0]?.restSec;
    if (typeof firstConfigRest === 'number' && Number.isFinite(firstConfigRest) && firstConfigRest > 0) {
      return firstConfigRest;
    }
    const pref = getWorkoutSettings();
    return Number.isFinite(pref.defaultRestSec) && pref.defaultRestSec > 0 ? pref.defaultRestSec : DEFAULT_REST_SEC;
  });
  // LOT H: a NEW guided session seeds sound/voice/vibration from the global
  // preferences. A resumed session keeps its persisted per-session settings.
  const [settings, setSettings] = useState<GuidedSettings>(
    () => initialCheckpoint?.settings ?? guidedSettingsFromWorkoutSettings(getWorkoutSettings())
  );
  const [t, setT] = useState<number>(() => initialCheckpoint?.timerRemaining ?? 0);
  const [showGo, setShowGo] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [interactiveMessage, setInteractiveMessage] = useState<string | null>(null);
  // Optional rest boost (+15s) applied to the CURRENT rest only; never changes
  // the global restSec. Reset when the rest finishes.
  const [restBoost, setRestBoost] = useState(0);

  const stepsRef = useRef(allSteps);
  stepsRef.current = allSteps;
  const tRef = useRef(t);
  tRef.current = t;
  const phaseRef = useRef<GuidedPhase>(phase);
  phaseRef.current = phase;
  const stepIndexRef = useRef(stepIndex);
  stepIndexRef.current = stepIndex;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const restSecRef = useRef(restSec);
  restSecRef.current = restSec;
  const restBoostRef = useRef(restBoost);
  restBoostRef.current = restBoost;
  const pausedFromRef = useRef<GuidedPhase>('exercise');
  const zeroHandlerRef = useRef<(() => void) | null>(null);
  const intervalRef = useRef<number | null>(null);
  const goTimerRef = useRef<number | null>(null);
  const skipTimerRef = useRef<number | null>(null);
  const activeSetModeRef = useRef<'reps' | 'timer'>('reps');
  const processingRef = useRef(false);
  const musicStopRef = useRef<(() => void) | null>(null);
  const startedRef = useRef(false);

  const stopInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  function setExerciseName(exIndex: number): string {
    return exercises[exIndex]?.exerciseName || 'Exercice';
  }

  function enterStep(idx: number): void {
    processingRef.current = false;
    const s = stepsRef.current[idx];
    if (!s) return;
    stepIndexRef.current = idx;
    setStepIndex(idx);
    if (s.kind === 'stretch') {
      const st = stretches[s.stretchIndex];
      if (!st) return;
      activeSetModeRef.current = 'reps';
      speak(`Prépare-toi : ${st.name.toLowerCase()}`, settingsRef.current.voiceEnabled);
      phaseRef.current = 'stretch';
      setPhase('stretch');
      zeroHandlerRef.current = () => {
        const step = stepsRef.current[stepIndexRef.current];
        if (!step || step.kind !== 'stretch') return;
        playWorkoutSound('end', settingsRef.current.soundEnabled);
        vibrate([80, 60, 80], settingsRef.current.vibrationEnabled);
        onStretchAdvance(step.stretchIndex, step.side);
      };
      tRef.current = st.durationSec;
      setT(st.durationSec);
      return;
    }
    const set = exercises[s.exerciseIndex]?.sets[s.setIndex];
    if (!set) return;
    if (set.mode === 'timer') {
      const duration = set.durationSec || 0;
      if (duration <= 0) {
        // A timer configured at 0 (or negative) is NEVER a valid set: skip it
        // without recording any completion (F0 / V7.8 P2 preserved).
        setInteractiveMessage('Timer non configuré — série ignorée');
        processingRef.current = true;
        phaseRef.current = 'exercise';
        setPhase('exercise');
        activeSetModeRef.current = 'timer';
        tRef.current = 0;
        setT(0);
        if (skipTimerRef.current) window.clearTimeout(skipTimerRef.current);
        skipTimerRef.current = window.setTimeout(() => {
          skipTimerRef.current = null;
          setInteractiveMessage(null);
          advance();
        }, 1200);
        return;
      }
      activeSetModeRef.current = 'timer';
      speak(`Prochain exercice : ${setExerciseName(s.exerciseIndex)}, ${duration} secondes`, settingsRef.current.voiceEnabled);
      playWorkoutSound('start', settingsRef.current.soundEnabled);
      phaseRef.current = 'exercise';
      setPhase('exercise');
      zeroHandlerRef.current = () => {
        const step = stepsRef.current[stepIndexRef.current];
        if (!step || step.kind !== 'exercise') return;
        playWorkoutSound('end', settingsRef.current.soundEnabled);
        vibrate([60, 40, 60], settingsRef.current.vibrationEnabled);
        speak('Exercice terminé, repose-toi', settingsRef.current.voiceEnabled);
        onToggleSet(step.exerciseIndex, step.setIndex);
        advance();
      };
      tRef.current = duration;
      setT(duration);
      return;
    }
    activeSetModeRef.current = 'reps';
    speak(`${setExerciseName(s.exerciseIndex)}, ${set.reps} répétitions`, settingsRef.current.voiceEnabled);
    phaseRef.current = 'exercise';
    setPhase('exercise');
    zeroHandlerRef.current = null;
    tRef.current = 0;
    setT(0);
  }

  function startCountdown(): void {
    if (!settingsRef.current.countdownEnabled) {
      enterStep(stepIndexRef.current);
      return;
    }
    phaseRef.current = 'countdown';
    setPhase('countdown');
    zeroHandlerRef.current = () => {
      playWorkoutSound('go', settingsRef.current.soundEnabled);
      vibrate([40, 30, 60], settingsRef.current.vibrationEnabled);
      speakCountdownValue('go', settingsRef.current.voiceEnabled);
      setShowGo(true);
      if (goTimerRef.current) window.clearTimeout(goTimerRef.current);
      goTimerRef.current = window.setTimeout(() => {
        goTimerRef.current = null;
        setShowGo(false);
        enterStep(stepIndexRef.current);
      }, 700);
    };
    tRef.current = DEFAULT_COUNTDOWN_SEC;
    setT(DEFAULT_COUNTDOWN_SEC);
    speakCountdownValue(DEFAULT_COUNTDOWN_SEC, settingsRef.current.voiceEnabled);
  }

  function startRest(): void {
    const next = stepIndexRef.current;
    const s = stepsRef.current[next];
    const nextName = s && s.kind === 'exercise' ? exercises[s.exerciseIndex]?.exerciseName : 'la suite';
    // Rest BETWEEN EXERCISES (first set of a new exercise) uses the previous
    // exercise's transitionRestSec (its own value, resolved against the global);
    // rest BETWEEN SETS of the same exercise keeps the per-exercise restSec.
    const resolved =
      resolveGuidedRestSec({
        upcomingStep: s,
        exercises,
        fallbackRestSec: restSecRef.current,
        exerciseTransitionRestSec: settingsRef.current.exerciseTransitionRestSec,
      }) + restBoostRef.current;
    setRestBoost(0);
    restBoostRef.current = 0;
    // A transition rest of 0 (e.g. last exercise before stretches) skips the
    // rest phase entirely and goes straight to the countdown of this step.
    if (resolved <= 0) {
      startCountdown();
      return;
    }
    phaseRef.current = 'rest';
    setPhase('rest');
    const effectiveRest = resolved;
    zeroHandlerRef.current = () => {
      playWorkoutSound('restEnd', settingsRef.current.soundEnabled);
      vibrate([50, 50, 50], settingsRef.current.vibrationEnabled);
      speak(`Prochain exercice : ${nextName.toLowerCase()}`, settingsRef.current.voiceEnabled);
      startCountdown();
    };
    tRef.current = effectiveRest;
    setT(effectiveRest);
  }

  function advance(): void {
    const next = stepIndexRef.current + 1;
    if (next >= stepsRef.current.length) {
      phaseRef.current = 'completed';
      setPhase('completed');
      stopInterval();
      cancelSpeech();
      onGoToSummary();
      return;
    }
    const targetStep = stepsRef.current[next];
    if (targetStep.kind === 'stretch') {
      enterStep(next);
    } else {
      // next exercise set: enter the global rest, then countdown, then the set.
      stepIndexRef.current = next;
      setStepIndex(next);
      startRest();
    }
  }

  function handleRepsDone(): void {
    if (processingRef.current) return;
    const s = stepsRef.current[stepIndexRef.current];
    if (!s || s.kind !== 'exercise') return;
    const set = exercises[s.exerciseIndex]?.sets[s.setIndex];
    if (!set || set.completed) return;
    processingRef.current = true;
    playWorkoutSound('end', settingsRef.current.soundEnabled);
    vibrate([70, 40, 70], settingsRef.current.vibrationEnabled);
    onToggleSet(s.exerciseIndex, s.setIndex);
    advance();
  }

  function handleSkipCurrent(): void {
    if (phaseRef.current === 'exercise') {
      playWorkoutSound('tick', settingsRef.current.soundEnabled);
      if (skipTimerRef.current) window.clearTimeout(skipTimerRef.current);
      setInteractiveMessage(null);
      advance();
      return;
    }
    if (phaseRef.current === 'rest' || phaseRef.current === 'stretch') {
      playWorkoutSound('tick', settingsRef.current.soundEnabled);
      if (phaseRef.current === 'stretch') {
        // Skipped stretches are not recorded as completed.
        advance();
      } else {
        const handler = zeroHandlerRef.current;
        zeroHandlerRef.current = null;
        if (handler) handler();
      }
      return;
    }
    if (phaseRef.current === 'countdown' && showGo === false) {
      enterStep(stepIndexRef.current);
    }
  }

  function handlePause(): void {
    if (phaseRef.current === 'pause' || phaseRef.current === 'prep' || phaseRef.current === 'completed') return;
    pausedFromRef.current = phaseRef.current;
    stopInterval();
    cancelSpeech();
    if (goTimerRef.current) window.clearTimeout(goTimerRef.current);
    goTimerRef.current = null;
    setShowGo(false);
    phaseRef.current = 'pause';
    setPhase('pause');
    onTimerRunningChange(false);
  }

  function handleResume(): void {
    unlockAudio();
    phaseRef.current = pausedFromRef.current;
    setPhase(pausedFromRef.current);
    onTimerRunningChange(true);
  }

  function handleStart(): void {
    if (stepsRef.current.length === 0) {
      setInteractiveMessage('Aucun exercice configuré pour cette séance.');
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    unlockAudio();
    playWorkoutSound('start', settingsRef.current.soundEnabled);
    vibrate([30, 30, 60], settingsRef.current.vibrationEnabled);
    speak('C’est parti, bonne séance', settingsRef.current.voiceEnabled);
    onTimerRunningChange(true);
    if (settingsRef.current.musicEnabled) {
      musicStopRef.current = startWorkoutMusic(settingsRef.current.musicVolume);
    }
    // Skip any work already completed in classic mode, then start from wherever
    // the resolved cursor is: countdown before the first remaining set.
    const resolved = resolveFirstIncompleteStep(
      buildExerciseSteps(exercises),
      exercises,
      buildStretchSteps(stretches),
      stretches,
      completedSidesMap
    );
    if (resolved >= stepsRef.current.length) {
      phaseRef.current = 'completed';
      setPhase('completed');
      onGoToSummary();
      return;
    }
    stepIndexRef.current = resolved;
    setStepIndex(resolved);
    if (settingsRef.current.countdownEnabled) {
      phaseRef.current = 'countdown';
      setPhase('countdown');
      zeroHandlerRef.current = () => {
        playWorkoutSound('go', settingsRef.current.soundEnabled);
        vibrate([40, 30, 60], settingsRef.current.vibrationEnabled);
        speakCountdownValue('go', settingsRef.current.voiceEnabled);
        setShowGo(true);
        if (goTimerRef.current) window.clearTimeout(goTimerRef.current);
        goTimerRef.current = window.setTimeout(() => {
          goTimerRef.current = null;
          setShowGo(false);
          enterStep(stepIndexRef.current);
        }, 700);
      };
      tRef.current = DEFAULT_COUNTDOWN_SEC;
      setT(DEFAULT_COUNTDOWN_SEC);
      speakCountdownValue(DEFAULT_COUNTDOWN_SEC, settingsRef.current.voiceEnabled);
    } else {
      enterStep(resolved);
    }
  }

  // Resume straight onto a saved draft: the checkpoint carries everything the
  // classic resume path used to lose (the cursor above all — stepIndex starts
  // at 0 on mount), plus the live phase, its remaining time and pause state.
  // Restoring the cursor alone is not enough: the matching step handler must be
  // re-armed so the auto-finish ("zero") callbacks keep firing after a reload.
  // Runs once — the guard covers StrictMode's double mount.
  const resumeRestoredRef = useRef(false);
  const [engineTick, setEngineTick] = useState(0);
  useEffect(() => {
    if (resumeRestoredRef.current) return;
    resumeRestoredRef.current = true;
    const ck = initialCheckpoint;
    if (!ck || !ck.enabled || ck.phase === 'prep' || ck.phase === 'completed') return;
    const steps = stepsRef.current;
    if (!steps || steps.length === 0) return;
    const idx = Math.max(0, Math.min(Math.round(ck.stepIndex || 0), steps.length - 1));
    stepIndexRef.current = idx;
    setStepIndex(idx);
    const remainder = () => Math.max(0, Math.round(ck.timerRemaining || 0));
    if (ck.phase === 'pause') {
      pausedFromRef.current = ck.resumePhase ?? 'exercise';
      const base = pausedFromRef.current;
      if (base === 'rest') startRest();
      else if (base === 'countdown') startCountdown();
      else enterStep(idx);
      phaseRef.current = 'pause';
      setPhase('pause');
      onTimerRunningChange(false);
      return;
    }
    if (ck.phase === 'rest') {
      startRest();
      tRef.current = remainder();
      setT(remainder());
      onTimerRunningChange(true);
      setEngineTick((n) => n + 1);
      return;
    }
    if (ck.phase === 'countdown') {
      startCountdown();
      tRef.current = remainder();
      setT(remainder());
      onTimerRunningChange(true);
      setEngineTick((n) => n + 1);
      return;
    }
    // 'exercise' or 'stretch': re-arm the step, then bring back the remaining
    // time for timed steps (reps stay purely interactive, no timer).
    enterStep(idx);
    const s = steps[idx];
    const stepIsTimed =
      s?.kind === 'stretch' ||
      (s?.kind === 'exercise' && exercises[s.exerciseIndex]?.sets?.[s.setIndex]?.mode === 'timer');
    if (stepIsTimed) {
      tRef.current = remainder();
      setT(remainder());
      onTimerRunningChange(true);
      // The phase itself may already equal the restored one, so the interval
      // would not restart on its own — force it with a dedicated tick.
      setEngineTick((n) => n + 1);
    } else {
      onTimerRunningChange(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single active timer. One interval at a time; cleaned on phase change, pause
  // (phase 'pause'), unmount and when the phase switches to an interactive reps
  // set. Refs keep the tick closure stable so StrictMode double-mount is safe.
  useEffect(() => {
    const p = phase;
    const isRunningPhase = p === 'countdown' || p === 'rest' || p === 'stretch' || p === 'exercise';
    const isTimedExercise = p === 'exercise' && activeSetModeRef.current === 'timer';
    const shouldRun = isRunningPhase && (p !== 'exercise' || isTimedExercise);
    if (!shouldRun) return;
    const iv = window.setInterval(() => {
      if (phaseRef.current === 'pause') return;
      if (tRef.current <= 1) {
        stopInterval();
        tRef.current = 0;
        setT(0);
        const handler = zeroHandlerRef.current;
        zeroHandlerRef.current = null;
        if (handler) handler();
        return;
      }
      tRef.current -= 1;
      setT(tRef.current);
      if (phaseRef.current === 'countdown') {
        playWorkoutSound('tick', settingsRef.current.soundEnabled);
        speakCountdownValue(tRef.current, settingsRef.current.voiceEnabled);
      }
    }, 1000);
    return () => window.clearInterval(iv);
  }, [phase, stopInterval, engineTick]);

  // Cleanup on unmount: no timer, no pending transition may survive.
  useEffect(() => {
    return () => {
      stopInterval();
      if (goTimerRef.current) window.clearTimeout(goTimerRef.current);
      if (skipTimerRef.current) window.clearTimeout(skipTimerRef.current);
      cancelSpeech();
      if (musicStopRef.current) musicStopRef.current();
    };
  }, [stopInterval]);

  // Keep the auto-saved draft checkpoint fresh (parent persists it).
  useEffect(() => {
    onCheckpointChange({
      enabled: true,
      phase,
      stepIndex: stepIndexRef.current,
      restSec,
      settings,
      timerRemaining: Math.max(0, Math.round(t)),
      resumePhase: phase === 'pause' ? pausedFromRef.current : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stepIndex, restSec, settings, t]);

  const currentStep = allSteps[stepIndex] as GuidedStep | undefined;
  const currentExercise = currentStep && currentStep.kind === 'exercise'
    ? exercises[currentStep.exerciseIndex]
    : undefined;
  const currentSet = currentStep && currentStep.kind === 'exercise'
    ? exercises[currentStep.exerciseIndex]?.sets[currentStep.setIndex]
    : undefined;
  const currentStretch = currentStep && currentStep.kind === 'stretch'
    ? stretches[currentStep.stretchIndex]
    : undefined;
  const currentExerciseStep = currentStep && currentStep.kind === 'exercise' ? currentStep : undefined;
  const currentStretchStep = currentStep && currentStep.kind === 'stretch' ? currentStep : undefined;
  const currentSetNumber = currentSet ? currentSet.setNumber : 0;
  const totalSetCount = currentExercise?.sets?.length || 0;
  const isTimed = currentSet?.mode === 'timer';
  const progressPct = guidedProgressPercent(stepIndex, totalSteps);
  const estimatedMin = Math.round(
    estimatedGuidedDurationSec(exercises, stretches, restSec, settings.exerciseTransitionRestSec) / 60
  );

  // Derived summary counts for the prep screen / progress labels.
  const exerciseCount = exercises.length;
  const globalSetCount = exercises.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
  const stretchStepCount = buildStretchSteps(stretches).length;
  const repsModeCount = exercises.filter((ex) => ex.sets?.[0]?.mode === 'reps').length;
  const timerModeCount = exercises.filter((ex) => ex.sets?.[0]?.mode === 'timer').length;
  // 1-based position of the current exercise among all exercises (for "Exercice X / N").
  const currentExerciseNumber = currentExerciseStep
    ? exercises.slice(0, currentExerciseStep.exerciseIndex + 1).length
    : 0;
  // Global completed-set count for the pause / progress "X / Y séries".
  const completedSetCount = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );

  const nextExercisePreview = (() => {
    for (let i = stepIndex; i < allSteps.length; i++) {
      const s = allSteps[i];
      if (s.kind === 'exercise') return exercises[s.exerciseIndex]?.exerciseName || 'Exercice';
    }
    return null;
  })();

  const toggleSetting = (key: keyof GuidedSettings) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key] };
      return next;
    });
  };

  const setRest = (sec: number) => {
    const clamped = Math.max(0, Math.min(600, Math.round(sec)));
    setRestSec(clamped);
  };

  // +15 sec for the CURRENT rest only — global restSec is unaffected.
  const handleAddRestTime = useCallback(() => {
    if (phaseRef.current !== 'rest') return;
    setRestBoost((prev) => {
      const next = prev + 15;
      restBoostRef.current = next;
      const newRemaining = Math.max(0, tRef.current + 15);
      tRef.current = newRemaining;
      setT(newRemaining);
      return next;
    });
  }, []);

  // Key that changes every time we enter a new countdown/exercise to trigger
  // the pop animation (CSS guid-count-pop / guid-slide-up).
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => {
    if (phase === 'countdown' || phase === 'exercise' || phase === 'stretch') {
      setAnimKey((k) => k + 1);
      setEditOpen(false);
    }
  }, [phase, stepIndex]);

  // ===================== RENDER =====================
  if (phase === 'prep') {
    const stretchCount = buildStretchSteps(stretches).length;
    return (
      <div id="guided-prep" className="space-y-5 animate-in fade-in duration-300 max-w-2xl mx-auto px-3 sm:px-0">
        <div className="rounded-3xl bg-gradient-to-br from-violet-600/30 via-violet-950/40 to-black/60 backdrop-blur-2xl border border-white/15 p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center shrink-0">
                <Dumbbell className="w-6 h-6 text-violet-300" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Séance guidée</div>
                <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-white tracking-wide truncate">
                  {sessionTitle || 'Séance Libre'}
                </h2>
                {programTitle && (
                  <div className="text-xs font-semibold text-violet-400 mt-0.5 truncate">{programTitle}</div>
                )}
              </div>
            </div>
            <button
              id="btn-guided-classic"
              onClick={onExitGuided}
              className="text-[10px] font-semibold text-zinc-400 hover:text-white bg-white/5 border border-white/10 px-3 py-2 rounded-xl transition-colors shrink-0"
            >
              Mode libre
            </button>
          </div>

          {/* Summary grid — 2 columns on mobile, 4 on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <div className="text-[10px] uppercase font-semibold text-zinc-400">Exercices</div>
              <div className="font-display text-xl font-bold text-white">{exerciseCount}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <div className="text-[10px] uppercase font-semibold text-zinc-400">Séries</div>
              <div className="font-display text-xl font-bold text-white">{globalSetCount}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <div className="text-[10px] uppercase font-semibold text-zinc-400">Durée estimée</div>
              <div className="font-display text-xl font-bold text-violet-300">{formatGuidedDuration(estimatedMin)}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <div className="text-[10px] uppercase font-semibold text-zinc-400">Étirements</div>
              <div className="font-display text-xl font-bold text-white">{stretchCount}</div>
            </div>
          </div>

          {/* Reps / Timer breakdown + global rest */}
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            {repsModeCount > 0 && (
              <span className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1">
                <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                {repsModeCount} reps
              </span>
            )}
            {timerModeCount > 0 && (
              <span className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1">
                <Timer className="w-3.5 h-3.5 text-amber-400" />
                {timerModeCount} timer
              </span>
            )}
            <span className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1">
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              Repos {restSec}s
            </span>
          </div>

          {/* Settings section */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="guided-rest-input" className="text-xs font-semibold text-zinc-300">Repos par défaut (séries)</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setRest(Math.max(0, restSec - 5))} aria-label="Diminuer le repos" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white text-sm">−</button>
                <input
                  id="guided-rest-input"
                  type="number"
                  min={0}
                  max={600}
                  value={restSec}
                  onChange={(e) => setRest(Number(e.target.value) || 0)}
                  className="w-16 bg-black/40 border border-white/10 rounded-xl py-1.5 text-center font-bold text-sm text-white focus:outline-none focus:border-violet-500"
                />
                <button onClick={() => setRest(restSec + 5)} aria-label="Augmenter le repos" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white text-sm">+</button>
              </div>
            </div>
            <div id="guided-settings">
              {(
                [
                  ['soundEnabled', 'Son', Volume2],
                  ['vibrationEnabled', 'Vibration', Flag],
                  ['voiceEnabled', 'Voix', Sparkles],
                  ['countdownEnabled', 'Compte à rebours 3-2-1', Clock],
                  ['musicEnabled', 'Musique', Music],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  id={`guided-setting-${key}`}
                  onClick={() => toggleSetting(key)}
                  aria-pressed={settings[key]}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    settings[key] ? 'bg-violet-600/30 border-violet-500/40 text-violet-200' : 'bg-white/5 border-white/10 text-zinc-400'
                  }`}
                >
                  <span className="flex items-center gap-2">{label}</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${settings[key] ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                </button>
              ))}
            </div>
          </div>

          {interactiveMessage && (
            <p id="guided-feedback" className="text-xs font-semibold text-amber-300" role="alert">{interactiveMessage}</p>
          )}

          <button
            id="btn-guided-start"
            onClick={handleStart}
            disabled={totalSteps === 0}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm uppercase tracking-wider shadow-xl shadow-violet-900/40 transition-all disabled:opacity-40"
          >
            <Play className="w-5 h-5 fill-current" />
            Commencer la séance
          </button>
        </div>
      </div>
    );
  }

  if (settingsOpen) {
    return (
      <div id="guided-settings-overlay" className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="sport-card p-6 w-full max-w-md space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-white">Réglages de la séance</h3>
            <button onClick={() => setSettingsOpen(false)} aria-label="Fermer" className="p-2 rounded-xl text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-semibold text-zinc-300">Repos global (s)</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setRest(Math.max(0, restSec - 5))} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white text-sm">−</button>
              <span className="font-mono text-lg font-bold text-white w-10 text-center">{restSec}</span>
              <button onClick={() => setRest(restSec + 5)} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white text-sm">+</button>
            </div>
          </div>
          {(
            [
              ['soundEnabled', 'Son'],
              ['vibrationEnabled', 'Vibration'],
              ['voiceEnabled', 'Voix'],
              ['countdownEnabled', 'Compte à rebours 3-2-1'],
              ['musicEnabled', 'Musique'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => toggleSetting(key)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                settings[key] ? 'bg-violet-600/30 border-violet-500/40 text-violet-200' : 'bg-white/5 border-white/10 text-zinc-400'
              }`}
            >
              <span>{label}</span>
              <span className={`w-2.5 h-2.5 rounded-full ${settings[key] ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            </button>
          ))}
          <button
            id="btn-guided-settings-close"
            onClick={() => setSettingsOpen(false)}
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'pause') {
    // Determine what the user was just doing
    const pausedStep = allSteps[stepIndex];
    let pausedExerciseName = '';
    let pausedSetInfo = '';
    let pausedStretchInfo = '';
    if (pausedStep) {
      if (pausedStep.kind === 'exercise') {
        pausedExerciseName = exercises[pausedStep.exerciseIndex]?.exerciseName || '';
        const ps = exercises[pausedStep.exerciseIndex]?.sets[pausedStep.setIndex];
        if (ps) pausedSetInfo = `Série ${ps.setNumber} / ${exercises[pausedStep.exerciseIndex]?.sets?.length || 0}`;
      } else {
        pausedStretchInfo = stretches[pausedStep.stretchIndex]?.name || '';
      }
    }
    return (
      <div id="guided-pause" className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <div className="sport-card p-8 w-full max-w-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto">
            <Pause className="w-8 h-8 text-amber-300" />
          </div>
          <div>
            <h2 className="font-display text-3xl font-extrabold uppercase text-white tracking-widest">Pause</h2>
            <p className="text-sm text-zinc-400 mt-1">Séance en pause</p>
          </div>

          {/* Session info */}
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <div className="text-[10px] uppercase font-semibold text-zinc-400">Durée</div>
              <div className="font-mono text-lg font-bold text-white">{formatTime(elapsed)}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <div className="text-[10px] uppercase font-semibold text-zinc-400">Progression</div>
              <div className="font-mono text-lg font-bold text-white">{completedSetCount}/{globalSetCount}</div>
            </div>
          </div>

          {/* What was in progress */}
          {pausedExerciseName && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
              <div className="text-[10px] uppercase font-semibold text-zinc-400">Exercice actuel</div>
              <div className="font-display text-lg font-bold text-white uppercase">{pausedExerciseName}</div>
              {pausedSetInfo && <div className="text-xs font-semibold text-violet-300">{pausedSetInfo}</div>}
            </div>
          )}
          {pausedStretchInfo && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
              <div className="text-[10px] uppercase font-semibold text-zinc-400">Étirement</div>
              <div className="font-display text-lg font-bold text-white uppercase">{pausedStretchInfo}</div>
            </div>
          )}

          <div className="space-y-3">
            <button
              id="btn-guided-resume"
              onClick={handleResume}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm uppercase tracking-wider transition-colors"
            >
              <Play className="w-5 h-5 fill-current" />
              Reprendre
            </button>
            <button
              id="btn-guided-quit"
              onClick={onLeave}
              className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white font-semibold text-xs uppercase tracking-wider transition-colors"
            >
              Quitter la séance
            </button>
          </div>
        </div>
      </div>
    );
  }

  const commonHeader = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300 truncate">Séance guidée</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-mono font-bold text-zinc-400">Étape {Math.min(stepIndex + 1, totalSteps)}/{totalSteps}</span>
        <button
          id="btn-guided-settings"
          onClick={() => setSettingsOpen(true)}
          aria-label="Réglages de la séance"
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white transition-colors"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
        <button
          id="btn-guided-classic-edit"
          onClick={onExitGuided}
          aria-label="Modifier la séance en mode classique"
          title="Modifier la séance (mode classique)"
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          id="btn-guided-pause"
          onClick={handlePause}
          aria-label="Mettre en pause"
          className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-colors"
        >
          <Pause className="w-4 h-4" />
        </button>
        <button
          id="btn-guided-leave"
          onClick={onLeave}
          aria-label="Quitter la séance"
          className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/25 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div id="guided-session" className="space-y-4 animate-in fade-in duration-300 max-w-2xl mx-auto">
      {showGo && (
        <div className="fixed inset-0 z-[75] bg-black/70 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="font-display text-9xl font-extrabold text-emerald-400 drop-shadow-2xl guid-go-pop">GO !</div>
        </div>
      )}

      {/* Global progress */}
      <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 sm:p-5 space-y-3 shadow-xl">
        {commonHeader}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
            <div
              id="guided-progress-bar"
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span id="guided-progress-label" className="font-mono text-sm font-bold text-white w-16 text-right">{progressPct}%</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
          <span id="guided-progress-sets">
            {completedSetCount} / {globalSetCount} séries
          </span>
          <span>{exerciseCount} exercices · {stretchStepCount > 0 ? `${stretchStepCount} étirements` : 'sans étirements'}</span>
        </div>
      </div>

      {/* ============ REST ============ */}
      {phase === 'rest' && (() => {
        // Find what's coming next (exercise set)
        const nextS = allSteps[stepIndex];
        const nextName = nextS && nextS.kind === 'exercise' ? exercises[nextS.exerciseIndex]?.exerciseName : null;
        const nextSet = nextS && nextS.kind === 'exercise' ? exercises[nextS.exerciseIndex]?.sets[nextS.setIndex] : null;
        const nextSetNum = nextSet?.setNumber || 0;
        const nextTotalSets = nextS && nextS.kind === 'exercise' ? (exercises[nextS.exerciseIndex]?.sets?.length || 0) : 0;
        const nextExNum = nextS && nextS.kind === 'exercise' ? exercises.slice(0, nextS.exerciseIndex + 1).length : 0;
        const isLastFew = t <= 5 && t > 0;
        return (
          <div id="guided-rest" className="rounded-3xl bg-gradient-to-br from-emerald-950/70 via-black/80 to-teal-950/50 backdrop-blur-2xl border border-emerald-500/40 p-8 sm:p-10 shadow-2xl space-y-6 text-center">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                <RotateCcw className="w-3.5 h-3.5" /> Récupération
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold uppercase text-white tracking-wide">Repos</h2>
            </div>
            <div
              aria-live="polite"
              id="guided-rest-timer"
              className={`font-mono text-7xl sm:text-8xl font-bold tabular-nums ${isLastFew ? 'guid-rest-flash text-amber-300' : 'text-emerald-300'}`}
            >
              {formatTime(t)}
            </div>
            {nextName && (
              <div className="space-y-1">
                <div className="text-[11px] uppercase font-bold text-zinc-400 tracking-widest">Prochain exercice</div>
                {nextExNum > 0 && (
                  <div className="text-[10px] uppercase font-bold text-zinc-500">Exercice {nextExNum} / {exerciseCount}</div>
                )}
                <div className="font-display text-2xl font-bold text-white uppercase">{nextName}</div>
                {nextSetNum > 0 && (
                  <div className="text-xs font-semibold text-emerald-300">Série {nextSetNum} / {nextTotalSets}</div>
                )}
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                id="btn-guided-rest-add15"
                onClick={handleAddRestTime}
                className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                +15 sec
              </button>
              <button
                id="btn-guided-skip-rest"
                onClick={handleSkipCurrent}
                className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
              >
                <SkipForward className="w-3.5 h-3.5" />
                Passer
              </button>
            </div>
          </div>
        );
      })()}

      {/* ============ COUNTDOWN 3-2-1 ============ */}
      {phase === 'countdown' && (
        <div id="guided-countdown" className="rounded-3xl bg-gradient-to-br from-violet-950/70 via-black/80 to-indigo-950/50 backdrop-blur-2xl border border-violet-500/40 p-10 sm:p-12 shadow-2xl text-center space-y-4">
          <h2 className="font-display text-xl sm:text-2xl font-extrabold uppercase text-violet-200 tracking-widest">
            Prépare-toi...
          </h2>
          <div
            aria-live="assertive"
            id="guided-countdown-value"
            key={`cd-${t}`}
            className="font-mono text-9xl font-bold text-white tabular-nums guid-count-pop"
          >
            {t > 0 ? t : 'GO !'}
          </div>
          {nextExercisePreview && (
            <div className="font-display text-xl font-bold text-violet-300 uppercase">{nextExercisePreview}</div>
          )}
          <button
            id="btn-guided-skip-countdown"
            onClick={handleSkipCurrent}
            className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Passer
          </button>
        </div>
      )}

      {/* ============ EXERCISE ============ */}
      {phase === 'exercise' && currentExercise && currentSet && (
        <div id="guided-exercise" className="rounded-3xl bg-gradient-to-br from-violet-600/30 via-black/80 to-black/60 backdrop-blur-2xl border border-violet-500/40 p-6 sm:p-10 shadow-2xl space-y-5 text-center">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300">
              Exercice {currentExerciseNumber} / {exerciseCount}
            </span>
            <h2 id="guided-exercise-name" className="font-display text-4xl sm:text-5xl font-extrabold uppercase text-white tracking-wide">
              {currentExercise.exerciseName}
            </h2>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-zinc-400 bg-white/5 px-3 py-1 rounded-xl border border-white/10">
                {currentExercise.muscleGroup}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300">
                Série {currentSetNumber} / {totalSetCount}
              </span>
            </div>
          </div>

          {isTimed ? (
            <div className="space-y-2" key={`timer-${currentExerciseStep?.exerciseIndex}-${currentExerciseStep?.setIndex}`}>
              <div aria-live="polite" id="guided-exercise-timer" className="font-mono text-7xl sm:text-8xl font-bold text-amber-300 tabular-nums">
                {formatTime(t)}
              </div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Compte à rebours automatique</div>
            </div>
          ) : (
            <div className="space-y-3" key={`reps-${currentExerciseStep?.exerciseIndex}-${currentExerciseStep?.setIndex}`}>
              <div id="guided-exercise-reps" className="font-display text-7xl sm:text-8xl font-bold text-white">
                {currentSet.reps}
              </div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">répétitions</div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-xs text-zinc-400">Charge</span>
                <input
                  id="guided-set-weight"
                  type="number"
                  step={0.5}
                  min={0}
                  value={currentSet.weightKg || 0}
                  onChange={(e) => onUpdateSet(currentExerciseStep!.exerciseIndex, currentExerciseStep!.setIndex, 'weightKg', Number(e.target.value) || 0)}
                  className="w-20 bg-black/40 border border-white/10 rounded-xl py-2 text-center font-bold text-base text-white focus:outline-none focus:border-violet-500"
                />
                <span className="text-xs text-zinc-400">kg</span>
              </div>
            </div>
          )}

          {/* Edit the CURRENT set in place (reps mode). Duration, rest and the series
              count stay editable in classic mode (pencil icon in the header) —
              editing a running timer mid-countdown or shifting live steps would
              break the guided state, so this panel deliberately keeps to the
              safe, indep encoding: reps edits never touch the timer fields. */}
          {!isTimed && currentSet && !currentSet.completed && (
            <div className="pt-1">
              {editOpen ? (
                <div className="rounded-2xl bg-black/30 border border-white/10 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Modifier la série en cours</span>
                    <button
                      type="button"
                      id="btn-guided-edit-close"
                      onClick={() => setEditOpen(false)}
                      className="text-xs text-zinc-500 hover:text-white"
                    >
                      Fermer
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs text-zinc-400">Répétitions</span>
                    <input
                      id="guided-edit-reps"
                      type="number"
                      min={1}
                      max={1000}
                      value={currentSet.reps}
                      onChange={(e) => {
                        const reps = Number(e.target.value);
                        if (Number.isFinite(reps) && reps >= 1) {
                          onUpdateSet(currentExerciseStep!.exerciseIndex, currentExerciseStep!.setIndex, 'reps', Math.round(reps));
                        }
                      }}
                      className="w-20 bg-black/40 border border-white/10 rounded-xl py-1.5 text-center font-bold text-sm text-white focus:outline-none focus:border-violet-500"
                    />
                    <span className="text-xs text-zinc-400">reps</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Durée, repos, séries : icône ✎ en haut pour le mode classique.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  id="btn-guided-edit-open"
                  onClick={() => setEditOpen(true)}
                  className="text-[11px] font-semibold text-violet-300 hover:text-violet-200 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <Pencil className="w-3 h-3 inline mr-1" />
                  Modifier cette série
                </button>
              )}
            </div>
          )}

          {/* Step progress + global progress */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
              <span>{completedSetCount} / {globalSetCount} séries</span>
              <span>{progressPct}% de la séance</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-violet-500/80 transition-all duration-300" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {interactiveMessage && (
            <p className="text-xs font-bold text-amber-300" role="alert">{interactiveMessage}</p>
          )}

          {/* Next exercise preview (also useful during a timed set) */}
          {(() => {
            // Find the NEXT exercise name (different from the current)
            let foundCurrent = false;
            for (const s of allSteps) {
              if (s.kind === 'exercise' && s.exerciseIndex === currentExerciseStep!.exerciseIndex) { foundCurrent = true; continue; }
              if (foundCurrent && s.kind === 'exercise') {
                const next = exercises[s.exerciseIndex];
                if (next) return (
                  <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Prochain : <span className="text-white font-semibold">{next.exerciseName}</span></span>
                  </div>
                );
                break;
              }
            }
            return null;
          })()}

          {isTimed ? (
            <p className="text-xs text-zinc-400">Le timer valide la série automatiquement à 00:00.</p>
          ) : (
            <button
              id="btn-guided-done"
              onClick={handleRepsDone}
              disabled={!!currentSet.completed}
              aria-disabled={!!currentSet.completed}
              className="w-full flex items-center justify-center gap-2.5 py-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xl uppercase tracking-widest shadow-xl shadow-emerald-950 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
            >
              <Check className="w-6 h-6 stroke-[3]" />
              Terminé
            </button>
          )}

          <button
            id="btn-guided-skip-set"
            onClick={handleSkipCurrent}
            className="text-xs font-semibold text-zinc-400 hover:text-white bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5 inline mr-1" />
            Passer cette série
          </button>
        </div>
      )}

      {/* ============ STRETCH ============ */}
      {phase === 'stretch' && currentStretch && (
        <div id="guided-stretch" className="rounded-3xl bg-gradient-to-br from-indigo-950/70 via-black/80 to-purple-950/50 backdrop-blur-2xl border border-indigo-500/40 p-6 sm:p-10 shadow-2xl space-y-6 text-center">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-300">
              <Sparkles className="w-3.5 h-3.5" /> Étirements
            </span>
            <h2 id="guided-stretch-name" className="font-display text-3xl sm:text-4xl font-extrabold uppercase text-white tracking-wide">
              {currentStretch.name}
            </h2>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-semibold text-zinc-400">
                {currentStretch.hasSides ? (currentStretchStep!.side === 1 ? 'Côté gauche' : 'Côté droit') : 'Maintien'}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                Étape {Math.min(stepIndex + 1, totalSteps)}/{totalSteps}
              </span>
            </div>
          </div>
          <div aria-live="polite" className="font-mono text-6xl sm:text-7xl font-bold text-indigo-300 tabular-nums">
            {formatTime(t)}
          </div>
          {currentStretch.instruction && (
            <p className="text-sm text-zinc-300 max-w-lg mx-auto">{currentStretch.instruction}</p>
          )}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
              <span>{completedSetCount} / {globalSetCount} séries complétées</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-indigo-500/80 transition-all duration-300" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <button
            id="btn-guided-skip-stretch"
            onClick={handleSkipCurrent}
            className="text-xs font-semibold text-zinc-400 hover:text-white bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5 inline mr-1" />
            Passer cet étirement
          </button>
        </div>
      )}

      {interactiveMessage && phase !== 'exercise' && phase !== 'prep' && (
        <p className="text-xs font-semibold text-amber-300 text-center" role="alert">{interactiveMessage}</p>
      )}
    </div>
  );
};