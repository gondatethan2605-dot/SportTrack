import { WorkoutSession, SessionExerciseLog, WorkoutSet } from './types';
import { computeSessionXp } from './utilsXp';
import { hasValidCompletedSet } from './utilsSession';

// ----------------------------------------------------------------------------
// LOT 9 — Item 9.3 : détail enrichi d'une séance.
// Pure, read-only. Builds a human-readable, structured summary of ONE finished
// WorkoutSession entirely from its stored data (no new persistence, no DB
// change, no XP re-computation — XP reuses the single canonical
// computeSessionXp). Considers a "completed/exercised" set only when it holds a
// real value and was marked completed by the workout engine.
// ----------------------------------------------------------------------------

export interface SessionSetDetail {
  setNumber: number;
  mode: 'reps' | 'timer';
  display: string; // e.g. "8 × 60 kg" or "45 s" or "12 reps"
  weightKg: number;
  reps: number;
  durationSec: number;
  completed: boolean;
}

export interface SessionExerciseDetail {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  sets: SessionSetDetail[];
  completedSets: number;
  plannedSets: number;
  totalReps: number; // summed completed reps only (0 for timer)
  totalDurationSec: number; // summed completed durations only (0 for reps)
  volumeKg: number; // summed weight*reps for completed sets
  restSec: number | null; // configured rest between sets (null when none set)
  hasValidSeries: boolean;
}

export interface SessionDetail {
  session: WorkoutSession;
  exerciseCount: number;
  exercises: SessionExerciseDetail[];
  totalCompletedSets: number;
  totalVolumeKg: number;
  xp: number; // canonical computeSessionXp based on completed data
  stretchesCompleted: boolean;
  stretchesCount: number;
}

// Whether a set actually carries an exercised value in its own mode.
export function setHasValue(set: WorkoutSet): boolean {
  if (set.mode === 'timer') {
    return Number.isFinite(set.durationSec) && (set.durationSec || 0) > 0;
  }
  return set.reps > 0;
}

export function buildExerciseSetDetail(set: WorkoutSet): SessionSetDetail {
  const mode = set.mode === 'timer' ? 'timer' : 'reps';
  const completed = !!set.completed && setHasValue(set);
  if (mode === 'timer') {
    const durationSec = completed || setHasValue(set) ? set.durationSec || 0 : 0;
    return {
      setNumber: set.setNumber,
      mode,
      display: `${durationSec} s`,
      weightKg: set.weightKg || 0,
      reps: set.reps || 0,
      durationSec,
      completed,
    };
  }
  return {
    setNumber: set.setNumber,
    mode,
    display: set.reps > 0 ? `${set.reps} × ${set.weightKg || 0} kg` : `${set.reps} reps`,
    weightKg: set.weightKg || 0,
    reps: set.reps || 0,
    durationSec: set.durationSec || 0,
    completed,
  };
}

export function buildExerciseDetail(ex: SessionExerciseLog): SessionExerciseDetail {
  const sets = (ex.sets || []).map(buildExerciseSetDetail);
  const completedSets = sets.filter((s) => s.completed).length;
  const totalReps = sets.reduce((acc, s) => acc + (s.completed ? s.reps : 0), 0);
  const totalDurationSec = sets.reduce((acc, s) => acc + (s.completed ? s.durationSec : 0), 0);
  const volumeKg = sets.reduce((acc, s) => acc + (s.completed ? s.reps * s.weightKg : 0), 0);
  return {
    exerciseId: ex.exerciseId,
    exerciseName: ex.exerciseName,
    muscleGroup: ex.muscleGroup || '',
    sets,
    completedSets,
    plannedSets: sets.length,
    totalReps,
    totalDurationSec,
    volumeKg,
    restSec: ex.restSec ?? null,
    hasValidSeries: completedSets > 0,
  };
}

export function buildSessionDetail(session: WorkoutSession): SessionDetail {
  const exercises = (session?.exercises || []).map(buildExerciseDetail);
  const exercisedExercises = exercises.filter((e) => e.hasValidSeries);
  const exerciseCount = exercisedExercises.length;
  const totalCompletedSets = exercises.reduce((acc, e) => acc + e.completedSets, 0);
  const totalVolumeKg = exercises.reduce((acc, e) => acc + e.volumeKg, 0);
  const stretchesCompleted = !!session.stretchesCompleted;
  const stretchesCount = session.stretchesCount || 0;

  return {
    session,
    exerciseCount,
    exercises,
    totalCompletedSets,
    totalVolumeKg,
    // XP recalculated with the SINGLE canonical formula — never a second source.
    xp: computeSessionXp(exerciseCount, stretchesCount),
    stretchesCompleted,
    stretchesCount,
  };
}

// The title shown in UIs (falls back to the stored title).
export function sessionDetailTitle(session: WorkoutSession): string {
  return session?.title?.trim() || 'Séance';
}

// True when this session deserves the "completed" treatment in the history UI.
export function hasUsableExerciseData(session: WorkoutSession): boolean {
  return hasValidCompletedSet(session?.exercises || []);
}