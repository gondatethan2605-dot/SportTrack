import { SessionExerciseLog, StretchItem } from '../../types';

// Pure, framework-free guided-session logic. It only READS the existing session
// data (sessionExercises sets + stretches) and derives:
//   - the ordered step list (each set is one step, each stretch side is one step)
//   - the current cursor / global progression
//   - the estimated duration for the "Préparer la séance" screen.
// It never converts reps <-> seconds and never writes into the stored data.

export type GuidedPhase = 'prep' | 'countdown' | 'exercise' | 'rest' | 'stretch' | 'pause' | 'completed';

export interface GuidedExerciseStep {
  kind: 'exercise';
  exerciseIndex: number;
  setIndex: number;
}

export interface GuidedStretchStep {
  kind: 'stretch';
  stretchIndex: number;
  side: 1 | 2;
}

export type GuidedStep = GuidedExerciseStep | GuidedStretchStep;

export const DEFAULT_REST_SEC = 30;
export const DEFAULT_COUNTDOWN_SEC = 3;
export const DEFAULT_TRANSITION_REST_SEC = 30;

// Reps-mode execution estimate for the PREP screen only (display). It never
// converts reps into a stored duration (repsPlan/durationSec untouched).
const REP_SET_EXECUTION_SEC = 45;

export function buildExerciseSteps(exercises: SessionExerciseLog[]): GuidedExerciseStep[] {
  const steps: GuidedExerciseStep[] = [];
  (exercises || []).forEach((ex, exIdx) => {
    (ex.sets || []).forEach((_, setIdx) => {
      steps.push({ kind: 'exercise', exerciseIndex: exIdx, setIndex: setIdx });
    });
  });
  return steps;
}

export function buildStretchSteps(stretches: StretchItem[]): GuidedStretchStep[] {
  const steps: GuidedStretchStep[] = [];
  (stretches || []).forEach((st, idx) => {
    const sides: (1 | 2)[] = st.hasSides ? [1, 2] : [1];
    sides.forEach((side) => steps.push({ kind: 'stretch', stretchIndex: idx, side }));
  });
  return steps;
}

export function isExerciseStepCompleted(
  step: GuidedExerciseStep,
  exercises: SessionExerciseLog[]
): boolean {
  const set = exercises[step.exerciseIndex]?.sets[step.setIndex];
  return !!set?.completed;
}

export function isStretchStepCompleted(
  step: GuidedStretchStep,
  stretches: StretchItem[],
  completedSidesMap: Record<string, boolean> | undefined
): boolean {
  const st = stretches[step.stretchIndex];
  if (!st) return true;
  if (step.side === 2) return !!st.hasSides && !!completedSidesMap?.[`${st.id}-2`];
  return !!completedSidesMap?.[`${st.id}-1`];
}

// First step that has NOT been completed yet. Steps completed earlier (for
// instance by doing work in the classic view first) are skipped automatically.
export function resolveFirstIncompleteStep(
  exerciseSteps: GuidedExerciseStep[],
  exercises: SessionExerciseLog[],
  stretchSteps: GuidedStretchStep[],
  stretches: StretchItem[],
  completedSidesMap: Record<string, boolean> | undefined
): number {
  const all: GuidedStep[] = [...exerciseSteps, ...stretchSteps];
  for (let i = 0; i < all.length; i++) {
    const step = all[i];
    const done =
      step.kind === 'exercise'
        ? isExerciseStepCompleted(step, exercises)
        : isStretchStepCompleted(step, stretches, completedSidesMap);
    if (!done) return i;
  }
  return all.length; // everything is already done
}

// Global progression as a percentage of individual steps really performed.
export function guidedProgressPercent(stepIndex: number, totalSteps: number): number {
  if (!totalSteps || totalSteps <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((stepIndex / totalSteps) * 100)));
}

// The single, centralized resolution of the rest AFTER the LAST set of an
// exercise and BEFORE the next exercise (rest BETWEEN exercises).
// Priority:
//   1. the exercise's own transitionRestSec (an EXPLICIT value wins):
//        - > 0 : that many seconds of rest;
//        -   0 : NO rest (e.g. last exercise before stretches);
//   2. otherwise the global exerciseTransitionRestSec setting (if valid, > 0);
//   3. otherwise 30 seconds.
// `undefined` (or a non-numeric/negative value) means "not configured" so it
// falls back to the global default. An explicit 0 is honoured as "no rest".
// Pure and side-effect free so the guided session, the classic session page,
// the duration estimate and the unit tests all share it (no hard-coded values).
// The single, centralized resolution of the rest BETWEEN two sets OF THE SAME
// exercise. It uses ONLY the exercise's own restSec (never transitionRestSec).
// Priority:
//   1. the exercise's own restSec (a finite number >= 0 wins; 0 = NO rest);
//   2. otherwise the caller-provided fallback (e.g. a session/global rest);
//   3. otherwise 30 seconds.
// Pure and side-effect free so the guided session, the classic session page,
// the duration estimate and the unit tests all share it (no hard-coded values).
export function resolveRestSec(
  exerciseCfg?: { restSec?: number } | SessionExerciseLog | null | undefined,
  fallbackRestSec?: number
): number {
  const own = exerciseCfg?.restSec;
  if (typeof own === 'number' && Number.isFinite(own) && own >= 0) return own;
  const fb = Number(fallbackRestSec);
  if (Number.isFinite(fb) && fb >= 0) return fb;
  return DEFAULT_REST_SEC;
}

// Per-series rest BETWEEN two sets of the same exercise. Priority:
//   1. restPlan[setIndex] when really present and valid (a finite number >= 0
//      wins; 0 = NO rest between those two sets);
//   2. the exercise's own legacy restSec (old programs without restPlan);
//   3. the caller-provided fallback (e.g. a session/global rest);
//   4. 30 seconds.
// Pure and side-effect free so the guided session, the classic session page,
// the duration estimate and the unit tests all share it (no hard-coded values).
export function resolveSetRestSec(
  exerciseCfg?: { restPlan?: number[]; restSec?: number } | SessionExerciseLog | null | undefined,
  setIndex?: number,
  fallbackRestSec?: number
): number {
  const idx = Number(setIndex);
  if (Number.isFinite(idx)) {
    const plan = Array.isArray(exerciseCfg?.restPlan) ? exerciseCfg.restPlan : null;
    if (plan) {
      const own = plan[Math.floor(idx)];
      if (typeof own === 'number' && Number.isFinite(own) && own >= 0) return own;
    }
  }
  return resolveRestSec(exerciseCfg, fallbackRestSec);
}

export function resolveTransitionRestSec(
  exerciseCfg?: { transitionRestSec?: number } | SessionExerciseLog | null | undefined,
  globalTransitionRestSec?: number
): number {
  const own = exerciseCfg?.transitionRestSec;
  if (typeof own === 'number' && Number.isFinite(own) && own >= 0) return own;
  if (typeof globalTransitionRestSec === 'number' && Number.isFinite(globalTransitionRestSec) && globalTransitionRestSec > 0) {
    return globalTransitionRestSec;
  }
  return DEFAULT_TRANSITION_REST_SEC;
}

// The rest duration that applies right before a given step:
//  - stepping to the FIRST set of a NEW exercise uses the rest BETWEEN
//    exercises (the previous exercise's transitionRestSec resolved against the
//    global setting) via resolveTransitionRestSec;
//  - stepping to a further set of the SAME exercise uses the per-set rest AFTER
//    the previous set (restPlan[previous set index] -> legacy restSec ->
//    fallback) via resolveSetRestSec;
//  - anything else falls back to the caller-provided session/default rest.
// Pure and side-effect free so the guided session and the unit tests share it.
export function resolveGuidedRestSec(opts: {
  upcomingStep?: GuidedStep;
  exercises: SessionExerciseLog[];
  fallbackRestSec: number;
  exerciseTransitionRestSec?: number;
}): number {
  const s = opts?.upcomingStep;
  if (s && s.kind === 'exercise') {
    // First set of a new exercise: the rest AFTER the PREVIOUS exercise.
    // The exercise being completed is the one before the upcoming one.
    if (s.setIndex === 0) {
      const currentIdx = s.exerciseIndex - 1;
      const currentEx = currentIdx >= 0 ? opts.exercises[currentIdx] : undefined;
      return resolveTransitionRestSec(currentEx, opts.exerciseTransitionRestSec);
    }
    // Same exercise, further set: rest AFTER the previous set of this exercise
    // (restPlan[s.setIndex - 1], else legacy restSec, else the fallback). The
    // last set uses transitionRestSec instead, which is resolved when the NEXT
    // exercise's first set becomes the upcoming step.
    const ex = opts.exercises[s.exerciseIndex];
    return resolveSetRestSec(ex, s.setIndex - 1, opts.fallbackRestSec);
  }
  return opts.fallbackRestSec;
}

export function estimatedGuidedDurationSec(
  exercises: SessionExerciseLog[],
  stretches: StretchItem[],
  restSec: number,
  exerciseTransitionRestSec?: number
): number {
  const exerciseSteps = buildExerciseSteps(exercises);
  let total = 0;
  exerciseSteps.forEach((step, i) => {
    const set = exercises[step.exerciseIndex]?.sets[step.setIndex];
    if (!set) return;
    if (set.mode === 'timer') total += set.durationSec || 0;
    else total += REP_SET_EXECUTION_SEC;
    if (i < exerciseSteps.length - 1) {
      const upcoming = exerciseSteps[i + 1];
      total += resolveGuidedRestSec({
        upcomingStep: upcoming,
        exercises,
        fallbackRestSec: restSec,
        exerciseTransitionRestSec,
      });
    }
  });
  buildStretchSteps(stretches).forEach((s) => {
    const st = stretches[s.stretchIndex];
    if (st) total += st.durationSec;
  });
  return Math.max(0, Math.round(total));
}

export function formatGuidedDuration(minutes: number): string {
  if (minutes <= 0) return '0 min';
  if (minutes < 60) return `~${Math.max(1, Math.round(minutes))} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `~${h} h ${m.toString().padStart(2, '0')} min`;
}