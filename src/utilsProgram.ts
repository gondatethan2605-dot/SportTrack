import { WorkoutProgram, WorkoutProgramDay, ProgramExerciseConfig, Exercise, ProgramExerciseGroup } from './types';
import { resolveSetRestSec, resolveTransitionRestSec } from './components/workout/workoutGuidedEngine';
import { getWorkoutSettings } from './utilsSettings';

// ----------------------------------------------------------------------------
// LOT 5 — Item 15: exercise <-> program integrity helpers.
// Pure, read-mostly. Renaming or deleting a custom exercise must never break
// existing programs: configs are denormalised (exerciseId + exerciseName), so a
// rename propagates ONLY the display name while every other field (sets,
// repsPlan, durationPlan, restPlan, target weight, rest, transition, notes)
// is preserved verbatim. Deleting removes every reference cleanly.
// ----------------------------------------------------------------------------

// Day-level presence of an exercise (both the rich exercises[] config and the
// legacy exerciseIds array are considered, without double counting).
function dayContainsExercise(day: WorkoutProgramDay | undefined, exerciseId: string): boolean {
  if (!day) return false;
  for (const cfg of day.exercises || []) {
    if (cfg && cfg.exerciseId === exerciseId) return true;
  }
  for (const id of day.exerciseIds || []) {
    if (id === exerciseId) return true;
  }
  return false;
}

export interface ExerciseProgramUsage {
  programCount: number; // distinct programs referencing the exercise
  dayCount: number; // total days across programs referencing the exercise
}

// How many programs / days reference an exercise (used for the delete warning).
export function countExerciseProgramUsages(programs: WorkoutProgram[], exerciseId: string): ExerciseProgramUsage {
  if (!programs || !exerciseId) return { programCount: 0, dayCount: 0 };
  let programCount = 0;
  let dayCount = 0;
  for (const p of programs) {
    if (!p || !Array.isArray(p.days)) continue;
    let found = false;
    for (const day of p.days) {
      if (dayContainsExercise(day, exerciseId)) {
        found = true;
        dayCount += 1;
      }
    }
    if (found) programCount += 1;
  }
  return { programCount, dayCount };
}

// Propagates a NEW name into every program config that references the exercise,
// ONLY on the denormalised exerciseName field. Every other field of the config
// and every other day/program are preserved verbatim. Returns the SAME array
// when nothing needs to change (no name update required). Pure.
export function renameExerciseInPrograms(programs: WorkoutProgram[], exerciseId: string, newName: string): WorkoutProgram[] {
  const clean = newName && newName.trim();
  if (!programs || !exerciseId || !clean || exerciseId.trim() === '') return programs;
  let changed = false;
  const next = programs.map((p) => {
    if (!p || !Array.isArray(p.days)) return p;
    let programChanged = false;
    const days = p.days.map((d) => {
      if (!d || !Array.isArray(d.exercises)) return d;
      const configs = d.exercises.map((cfg) => {
        if (!cfg || cfg.exerciseId !== exerciseId || cfg.exerciseName === clean) return cfg;
        programChanged = true;
        return { ...cfg, exerciseName: clean };
      });
      return programChanged ? { ...d, exercises: configs } : d;
    });
    if (!programChanged) return p;
    changed = true;
    return { ...p, days };
  });
  return changed ? next : programs;
}

export interface RemoveExerciseResult {
  programs: WorkoutProgram[]; // programs with every reference removed
  removedReferences: number; // configs + legacy ids removed
}

// Removes every reference to an exercise from all programs (both the rich
// exercises[] configs and the legacy exerciseIds entries). The rest of each day
// / program is preserved verbatim. Returns the SAME array when nothing was
// removed. Pure.
export function removeExerciseFromPrograms(programs: WorkoutProgram[], exerciseId: string): RemoveExerciseResult {
  if (!programs || !exerciseId) return { programs, removedReferences: 0 };
  let removedReferences = 0;
  let changed = false;
  const next = programs.map((p) => {
    if (!p || !Array.isArray(p.days)) return p;
    let programChanged = false;
    const days = p.days.map((d) => {
      if (!d) return d;
      let dayChanged = false;
      let exercises = d.exercises;
      if (Array.isArray(exercises)) {
        const kept = exercises.filter((cfg) => cfg && cfg.exerciseId !== exerciseId);
        if (kept.length !== exercises.length) {
          removedReferences += exercises.length - kept.length;
          exercises = kept;
          dayChanged = true;
        }
      }
      let exerciseIds = d.exerciseIds;
      if (Array.isArray(exerciseIds)) {
        const keptIds = exerciseIds.filter((id) => id !== exerciseId);
        if (keptIds.length !== exerciseIds.length) {
          removedReferences += exerciseIds.length - keptIds.length;
          exerciseIds = keptIds;
          dayChanged = true;
        }
      }
      if (!dayChanged) return d;
      programChanged = true;
      return { ...d, exercises, exerciseIds };
    });
    if (!programChanged) return p;
    changed = true;
    return { ...p, days };
  });
  return changed ? { programs: next, removedReferences } : { programs, removedReferences: 0 };
}

// Pure V7.8 helpers used by HomePage (and testable directly). They never modify
// program data: they only read the real structures (exerciseIds fallback +
// rich exercises[] configs) to derive a correct exercise count and an estimated
// session duration for display.

// The realistic execution time used for one REP-based set. It is a display-only
// estimate and never converts reps into a stored duration (repsPlan untouched).
const REP_SET_EXECUTION_SEC = 45;

// Fallback shape used when a day only carries exerciseIds (legacy V7.7 format).
const LEGACY_SET_COUNT = 3;
const LEGACY_REST_SEC = 90;

function configSetCount(cfg: ProgramExerciseConfig): number {
  const fromPlan = Array.isArray(cfg.repsPlan) ? cfg.repsPlan.length : 0;
  const fromDurPlan = Array.isArray(cfg.durationPlan) ? cfg.durationPlan.length : 0;
  const fromSets = Number(cfg.sets) || 0;
  return Math.max(1, Number(fromSets) || fromPlan || fromDurPlan || LEGACY_SET_COUNT);
}

// Number of distinct exercises on a day. Uses exercises[] when present and
// exerciseIds for legacy days, without ever double-counting the same exercise.
export function getDayExerciseCount(day: WorkoutProgramDay | undefined): number {
  if (!day) return 0;
  const ids = new Set<string>();
  for (const id of day.exerciseIds || []) {
    if (id) ids.add(id);
  }
  for (const cfg of day.exercises || []) {
    if (cfg && cfg.exerciseId) ids.add(cfg.exerciseId);
  }
  return ids.size;
}

// Estimated duration in seconds for the planned day. Includes, when really
// present in the program: per-set execution (timers use their own durationSec,
// reps use the display-only estimate), per-set configured rest, and stretches.
export function estimateDayDurationSec(day: WorkoutProgramDay | undefined): number {
  if (!day) return 0;
  const cfgs: ProgramExerciseConfig[] =
    day.exercises && day.exercises.length > 0
      ? day.exercises
      : (day.exerciseIds || []).map((id) => ({
          id: `legacy-${id}`,
          exerciseId: id,
          exerciseName: id,
          sets: LEGACY_SET_COUNT,
          reps: 10,
          mode: 'reps',
          durationSec: 0,
          targetWeightKg: 0,
          restSec: LEGACY_REST_SEC,
        }));

  let total = 0;
  cfgs.forEach((cfg, i) => {
    if (!cfg) return;
    const sets = configSetCount(cfg);
    const isTimer = cfg.mode === 'timer';
    let execSec = 0;
    if (isTimer) {
      // Directly use the real timer durations; never convert or alter them.
      const plan = Array.isArray(cfg.durationPlan) && cfg.durationPlan.length > 0 ? cfg.durationPlan : null;
      if (plan) {
        execSec = plan.slice(0, sets).reduce((a, b) => a + (Number(b) || 0), 0);
      } else {
        execSec = (Number(cfg.durationSec) || 0) * sets;
      }
    } else {
      execSec = sets * REP_SET_EXECUTION_SEC;
    }
    total += execSec;
    // Rest BETWEEN SETS of the same exercise (per-set rest). Uses the real
    // restPlan[setIndex] for each intermediate set (never restPlan × all sets,
    // never restSec × all sets when restPlan exists); legacy exercises without
    // restPlan fall back to the per-exercise restSec, else the global default.
    // The LAST set's rest is handled below via transitionRestSec (no over-count).
    const betweenSets = Math.max(0, sets - 1);
    for (let k = 0; k < betweenSets; k++) {
      total += resolveSetRestSec(cfg, k, getWorkoutSettings().defaultRestSec);
    }
    // Rest BETWEEN exercises (transition) AFTER this exercise, using its own
    // transitionRestSec, else the global exerciseTransitionRestSec, else 30 s.
    // There is no transition after the last exercise.
    if (i < cfgs.length - 1) {
      total += resolveTransitionRestSec(cfg, getWorkoutSettings().exerciseTransitionRestSec);
    }
  });

  if (day.stretches && day.stretches.length > 0) {
    total += day.stretches.reduce(
      (a, s) => a + (Number(s.durationSec) || 0) * (s.hasSides ? 2 : 1),
      0
    );
  }

  return Math.max(0, Math.round(total));
}

// Estimated duration rounded to whole minutes (>= 1 when the day has any work).
export function estimateDayDurationMin(day: WorkoutProgramDay | undefined): number {
  const sec = estimateDayDurationSec(day);
  if (sec <= 0) return 0;
  return Math.max(1, Math.round(sec / 60));
}

// Total number of configured sets on a day. Reads the real abs(ted) plans and the
// sets field, always returning at least 1 per present exercise (mirrors how a
// session is actually executed). Never double-counts the same exercise.
export function getDayTotalSets(day: WorkoutProgramDay | undefined): number {
  if (!day) return 0;
  const cfgs: ProgramExerciseConfig[] =
    day.exercises && day.exercises.length > 0
      ? day.exercises
      : (day.exerciseIds || []).map(() => ({
          id: 'legacy',
          exerciseId: 'legacy',
          exerciseName: 'legacy',
          sets: LEGACY_SET_COUNT,
          reps: 10,
          mode: 'reps',
          durationSec: 0,
          targetWeightKg: 0,
          restSec: LEGACY_REST_SEC,
        }));
  let total = 0;
  for (const cfg of cfgs) {
    if (!cfg) continue;
    total += configSetCount(cfg);
  }
  return total;
}

// Targeted, read-mostly update used when the user edits the per-exercise rest
// BETWEEN SETS directly from the session PREP screen. It returns a NEW program
// object with ONLY the target day/exercise restSec changed: every other field of
// the config (sets, reps/timer plans, weight, goals, transitionRestSec, notes)
// and every other day are preserved verbatim. Pure: never writes to storage.
export function updateDayExerciseRestSec(
  program: WorkoutProgram,
  dayId: string,
  exerciseId: string,
  restSec: number
): WorkoutProgram {
  const clean = Number.isFinite(restSec) && restSec >= 0 ? Math.round(restSec) : 0;
  if (!program || !Array.isArray(program.days)) return program;
  return {
    ...program,
    days: program.days.map((d) => {
      if (d.id !== dayId || !Array.isArray(d.exercises)) return d;
      return {
        ...d,
        exercises: d.exercises.map((cfg) =>
          cfg.exerciseId === exerciseId ? { ...cfg, restSec: clean } : cfg
        ),
      };
    }),
  };
}

// Targeted, read-mostly update used when the user edits the per-set rest AFTER
// set `setIndex` (rest BETWEEN sets) directly from the session PREP screen. It
// returns a NEW program object with ONLY the target day/exercise restPlan entry
// changed: the plan is first back-filled from the legacy restSec (or 30 s) so
// legacy programs without restPlan keep a coherent per-set plan, and every
// other field of the config (sets, reps/timer plans, weight, goals, restSec,
// transitionRestSec, notes) and every other day/exercise are preserved verbatim.
// Pure: never writes to storage.
export function updateDayExerciseSetRestSec(
  program: WorkoutProgram,
  dayId: string,
  exerciseId: string,
  setIndex: number,
  restSec: number
): WorkoutProgram {
  const clean = Number.isFinite(restSec) && restSec >= 0 ? Math.round(restSec) : 0;
  const rawIdx = Number(setIndex);
  const idx = Number.isFinite(rawIdx) && rawIdx >= 0 ? Math.floor(rawIdx) : 0;
  if (!program || !Array.isArray(program.days)) return program;
  return {
    ...program,
    days: program.days.map((d) => {
      if (d.id !== dayId || !Array.isArray(d.exercises)) return d;
      return {
        ...d,
        exercises: d.exercises.map((cfg) => {
          if (cfg.exerciseId !== exerciseId) return cfg;
          const src = Array.isArray(cfg.restPlan) ? cfg.restPlan : null;
          const len = Math.max(src ? src.length : 0, configSetCount(cfg), idx + 1);
          const restPlan: number[] = Array.from({ length: len }, (_unused, k) => {
            if (k === idx) return clean;
            const v = src?.[k];
            if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return v;
            return resolveSetRestSec(cfg, k);
          });
          return { ...cfg, restPlan };
        }),
      };
    }),
  };
}

// Targeted update of the EXERCISE-level rest AFTER the last set, before the next
// exercise (transitionRestSec). undefined clears it (falls back to the global
// default later); a finite value >= 0 wins (0 = no rest). Everything else in the
// config/program is preserved verbatim. Pure: never writes to storage.
export function updateDayExerciseTransitionRestSec(
  program: WorkoutProgram,
  dayId: string,
  exerciseId: string,
  transitionRestSec?: number
): WorkoutProgram {
  const clean =
    transitionRestSec == null
      ? undefined
      : Number.isFinite(transitionRestSec) && transitionRestSec >= 0
        ? Math.round(transitionRestSec)
        : 0;
  if (!program || !Array.isArray(program.days)) return program;
  return {
    ...program,
    days: program.days.map((d) => {
      if (d.id !== dayId || !Array.isArray(d.exercises)) return d;
      return {
        ...d,
        exercises: d.exercises.map((cfg) =>
          cfg.exerciseId === exerciseId ? { ...cfg, transitionRestSec: clean } : cfg
        ),
      };
    }),
  };
}

// Session PREP helpers used when adding/removing a set: the restPlan must stay
// in sync with the sets (same invariant as repsPlan/durationPlan). Adding a set
// appends a sane default (30 s); removing a set drops its matching rest entry.
// Pure: never writes to storage.
export function appendSetRestSec(plan: number[] | undefined, defaultRestSec = 30): number[] {
  const next = Array.isArray(plan) ? [...plan] : [];
  const def = Number.isFinite(defaultRestSec) && defaultRestSec >= 0 ? Math.round(defaultRestSec) : 30;
  next.push(def);
  return next;
}

export function removeSetRestSec(plan: number[] | undefined, setIndex: number): number[] | undefined {
  if (!Array.isArray(plan)) return undefined;
  const rawIdx = Number(setIndex);
  const idx = Number.isFinite(rawIdx) && rawIdx >= 0 ? Math.floor(rawIdx) : 0;
  return plan.filter((_unused, i) => i !== idx);
}

// Read-only summary of a whole program used for the "aperçu visuel": total
// number of distinct exercises, total configured sets, estimated duration and
// the per-day breakdown. Reuses the existing day-level helpers so the counts
// stay coherent with HomePage.
export function getProgramSummary(program: WorkoutProgram | undefined) {
  if (!program) {
    return {
      totalExercises: 0,
      totalSets: 0,
      totalDurationSec: 0,
      totalDurationMin: 0,
      days: [] as { day: WorkoutProgramDay; exerciseCount: number; sets: number; durationMin: number }[],
    };
  }
  const days = program.days.map((day) => {
    const exerciseCount = getDayExerciseCount(day);
    const sets = getDayTotalSets(day);
    const durationMin = estimateDayDurationMin(day);
    return { day, exerciseCount, sets, durationMin };
  });
  const totalExercises = days.reduce((a, d) => a + d.exerciseCount, 0);
  const totalSets = days.reduce((a, d) => a + d.sets, 0);
  const totalDurationSec = days.reduce((a, d) => a + estimateDayDurationSec(d.day), 0);
  const totalDurationMin = Math.max(0, Math.round(totalDurationSec / 60));
  return { totalExercises, totalSets, totalDurationSec, totalDurationMin, days };
}

// ---------------------------------------------------------------
// LOT D — Remplacement intelligent d'exercice
// ---------------------------------------------------------------

export interface ReplacementSuggestion {
  exercise: Exercise;
  score: number; // 0-100, higher = better match
  reasons: string[]; // Why this exercise was suggested
}

interface ReplacementScore {
  exercise: Exercise;
  score: number;
  reasons: string[];
}

function computeReplacementScore(
  source: ProgramExerciseConfig,
  candidate: Exercise,
  catalog: Exercise[]
): ReplacementScore {
  let score = 0;
  const reasons: string[] = [];

  // 1. Muscle principal (poids fort)
  if (candidate.primaryMuscle === source.exerciseName) {
    // Not applicable - source is config, candidate is Exercise
  }
  const sourceEx = catalog.find((e) => e.id === source.exerciseId);
  if (sourceEx) {
    if (candidate.primaryMuscle === sourceEx.primaryMuscle) {
      score += 35;
      reasons.push(`Même muscle principal (${candidate.primaryMuscle})`);
    }
    // Secondary muscles overlap
    const secOverlap = (sourceEx.secondaryMuscles || []).filter((m) =>
      (candidate.secondaryMuscles || []).includes(m)
    ).length;
    if (secOverlap > 0) {
      score += secOverlap * 5;
      reasons.push(`${secOverlap} muscle(s) secondaire(s) commun(s)`);
    }
    // Equipment match
    if (candidate.equipment === sourceEx.equipment) {
      score += 15;
      reasons.push(`Même équipement (${candidate.equipment})`);
    }
    // Category match
    if (candidate.category === sourceEx.category) {
      score += 10;
      reasons.push(`Même catégorie (${candidate.category})`);
    }
    // Body part match
    if (candidate.bodyPart === sourceEx.bodyPart) {
      score += 10;
      reasons.push(`Même zone (${candidate.bodyPart})`);
    }
    // Difficulty proximity
    const diffOrder = { Débutant: 0, Intermédiaire: 1, Avancé: 2, 'Tous niveaux': 3 };
    const srcDiff = diffOrder[sourceEx.difficulty] ?? 1;
    const candDiff = diffOrder[candidate.difficulty] ?? 1;
    const diffGap = Math.abs(srcDiff - candDiff);
    if (diffGap === 0) {
      score += 10;
      reasons.push(`Même difficulté (${candidate.difficulty})`);
    } else if (diffGap === 1) {
      score += 5;
      reasons.push(`Difficulté proche (${candidate.difficulty})`);
    }
  }

  // Base score for being a valid alternative
  score += 5;
  reasons.push('Alternative valide');

  return { exercise: candidate, score: Math.min(100, score), reasons };
}

// Renvoie les meilleures suggestions de remplacement pour un exercice donné,
// triées par score décroissant. Exclut l'exercice source lui-même.
export function getReplacementSuggestions(
  sourceConfig: ProgramExerciseConfig,
  catalog: Exercise[],
  limit = 5
): ReplacementSuggestion[] {
  const sourceEx = catalog.find((e) => e.id === sourceConfig.exerciseId);
  if (!sourceEx) return [];

  const candidates = catalog.filter(
    (e) => e.id !== sourceConfig.exerciseId
  );

  const scored = candidates.map((c) => computeReplacementScore(sourceConfig, c, catalog))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((s) => ({
    exercise: s.exercise,
    score: s.score,
    reasons: s.reasons,
  }));
}

// LOT D — Remplace un exercice dans un programme en conservant la configuration
// compatible. Retourne le programme mis à jour.
export interface ReplaceExerciseResult {
  program: WorkoutProgram;
  changed: boolean;
  modeChanged: boolean;
  preservedFields: string[];
  resetFields: string[];
}

export function replaceExerciseInProgram(
  program: WorkoutProgram,
  dayId: string,
  configId: string,
  newExercise: Exercise,
  catalog: Exercise[]
): ReplaceExerciseResult {
  if (!program || !Array.isArray(program.days)) {
    return { program, changed: false, modeChanged: false, preservedFields: [], resetFields: [] };
  }

  const day = program.days.find((d) => d.id === dayId);
  if (!day || !Array.isArray(day.exercises)) {
    return { program, changed: false, modeChanged: false, preservedFields: [], resetFields: [] };
  }

  const configIndex = day.exercises.findIndex((c) => c.id === configId);
  if (configIndex === -1) {
    return { program, changed: false, modeChanged: false, preservedFields: [], resetFields: [] };
  }

  const oldConfig = day.exercises[configIndex];
  const oldMode = oldConfig.mode ?? 'reps';
  const newMode = newExercise.category === 'Étirements' ? 'timer' : 'reps'; // Heuristic
  const modeChanged = oldMode !== newMode;

  // Determine which fields to preserve vs reset
  const preserved: string[] = [];
  const reset: string[] = [];

  const newConfig: ProgramExerciseConfig = {
    ...oldConfig,
    id: oldConfig.id, // Keep same config ID
    exerciseId: newExercise.id,
    exerciseName: newExercise.name,
  };

  // Same mode: preserve everything possible
  if (!modeChanged) {
    if (oldConfig.mode === 'reps') {
      // Preserve repsPlan, sets, restSec, targetWeightKg, restPlan, notes, transitionRestSec
      preserved.push('repsPlan', 'sets', 'restSec', 'targetWeightKg', 'restPlan', 'notes', 'transitionRestSec');
      newConfig.reps = newExercise.defaultReps;
      newConfig.repsPlan = Array.from({ length: oldConfig.sets }, () => newExercise.defaultReps);
    } else {
      // Timer mode: preserve durationPlan, sets, restSec, restPlan, notes, transitionRestSec
      preserved.push('durationPlan', 'sets', 'restSec', 'restPlan', 'notes', 'transitionRestSec');
      newConfig.durationSec = newExercise.defaultReps as number; // defaultReps holds duration for stretches
      newConfig.durationPlan = Array.from({ length: oldConfig.sets }, () => newExercise.defaultReps as number);
    }
    // restSec: try to keep if compatible
    newConfig.restSec = oldConfig.restSec;
  } else {
    // Mode changed: REPS <-> TIMER
    // NE PAS CONVERTIR automatiquement
    reset.push('repsPlan', 'durationPlan', 'reps', 'durationSec');
    newConfig.mode = newMode;
    if (newMode === 'reps') {
      newConfig.reps = newExercise.defaultReps;
      newConfig.repsPlan = Array.from({ length: oldConfig.sets }, () => newExercise.defaultReps);
      newConfig.durationSec = 0;
      newConfig.durationPlan = Array.from({ length: oldConfig.sets }, () => 0);
    } else {
      newConfig.durationSec = newExercise.defaultReps as number;
      newConfig.durationPlan = Array.from({ length: oldConfig.sets }, () => newExercise.defaultReps as number);
      newConfig.reps = `${newExercise.defaultReps} sec`;
      newConfig.repsPlan = Array.from({ length: oldConfig.sets }, () => `${newExercise.defaultReps} sec`);
    }
    // Preserve compatible fields
    preserved.push('sets', 'targetWeightKg', 'notes');
    if (isFiniteNumber(oldConfig.restSec)) {
      newConfig.restSec = oldConfig.restSec;
      preserved.push('restSec');
    }
    if (isFiniteNumber(oldConfig.transitionRestSec)) {
      newConfig.transitionRestSec = oldConfig.transitionRestSec;
      preserved.push('transitionRestSec');
    }
  }

  const updatedExercises = [...day.exercises];
  updatedExercises[configIndex] = newConfig;

  const updatedDay = {
    ...day,
    exercises: updatedExercises,
    exerciseIds: updatedExercises.map((c) => c.exerciseId),
  };

  const updatedProgram = {
    ...program,
    days: program.days.map((d) => (d.id === dayId ? updatedDay : d)),
  };

  return {
    program: updatedProgram,
    changed: true,
    modeChanged,
    preservedFields: preserved,
    resetFields: reset,
  };
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

// F.1 — Helpers de groupe (purs, sans mutation).
 
export function getProgramDayGroups(day: WorkoutProgramDay): ProgramExerciseGroup[] {
  if (!day || !Array.isArray(day.groups)) return [];
  return [...day.groups];
}

export function getExerciseGroup(
  exerciseId: string,
  day: WorkoutProgramDay
): ProgramExerciseGroup | undefined {
  if (!day || !Array.isArray(day.exercises)) return undefined;
  const cfg = day.exercises.find((c) => c && c.exerciseId === exerciseId);
  if (!cfg || !cfg.groupId) return undefined;
  return day.groups?.find((g) => g && g.id === cfg.groupId);
}

export function isExerciseGrouped(
  exerciseId: string,
  day: WorkoutProgramDay
): boolean {
  return getExerciseGroup(exerciseId, day) !== undefined;
}

export function getGroupExercises(
  groupId: string,
  day: WorkoutProgramDay
): ProgramExerciseConfig[] {
  if (!day || !Array.isArray(day.exercises)) return [];
  const result: ProgramExerciseConfig[] = [];
  for (const cfg of day.exercises) {
    if (cfg && cfg.groupId === groupId) {
      result.push(cfg);
    }
  }
  return result;
}

export function validateProgramGroups(day: WorkoutProgramDay): string[] {
  const errors: string[] = [];
  if (!day) return errors;

  // Vérifier chaque exercice ayant un groupId
  if (day.exercises && Array.isArray(day.exercises)) {
    // Regrouper les exercices par groupId
    const groupExMap: Record<string, ProgramExerciseConfig[]> = {};
    for (const cfg of day.exercises) {
      if (cfg && cfg.groupId) {
        if (!groupExMap[cfg.groupId]) groupExMap[cfg.groupId] = [];
        groupExMap[cfg.groupId].push(cfg);
      }
    }

    // Pour chaque groupe, valider
    for (const [groupId, exs] of Object.entries(groupExMap)) {
      if (!groupId || groupId.trim() === '') {
        errors.push('groupId vide');
      }
      if (exs.length < 2) {
        errors.push(`groupe "${groupId}" contient ${exs.length} exercice(s), minimum 2 requis`);
      }
      // Vérifier le type du groupe s'il existe
      const group = day.groups?.find((g) => g && g.id === groupId);
      if (group) {
        if (group.type !== 'superset' && group.type !== 'circuit') {
          errors.push(`groupe "${groupId}" a un type invalide: ${group.type}`);
        }
        if (group.rounds !== undefined && group.rounds <= 0) {
          errors.push(`groupe "${groupId}" a rounds <= 0`);
        }
        if (group.restBetweenExercisesSec !== undefined && group.restBetweenExercisesSec < 0) {
          errors.push(`groupe "${groupId}" a reposBetweenExercisesSec négatif`);
        }
        if (group.restBetweenRoundsSec !== undefined && group.restBetweenRoundsSec < 0) {
          errors.push(`groupe "${groupId}" a reposBetweenRoundsSec négatif`);
        }
      }
      // Vérifier que chaque exercice avec groupId a un groupe correspondant
      for (const ex of exs) {
        const g = day.groups?.find((gg) => gg && gg.id === ex.groupId);
        if (!g) {
          errors.push(`exercice ${ex.exerciseId} a groupId "${ex.groupId}" mais aucun groupe correspondant`);
        }
      }
    }
  }

  return errors;
}