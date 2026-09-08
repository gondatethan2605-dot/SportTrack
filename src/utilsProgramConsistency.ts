import { WorkoutProgram, WorkoutProgramDay, ProgramExerciseConfig } from './types';

// ----------------------------------------------------------------------------
// LOT 9 — Item 9.7 : détection d'incohérences de programme.
// Pure, read-only. Reports ERRORS (a day is genuinely not executable or the
// data structure is broken) and WARNINGS (executable but suspicious). It never
// mutates anything and never persists anything. The exercise catalog is
// optional: when absent, reference checks are skipped (the UI still validates
// structural issues).
// ----------------------------------------------------------------------------

export type ConsistencyLevel = 'error' | 'warning';

export interface ProgramConsistencyIssue {
  code: string;
  level: ConsistencyLevel;
  dayId?: string;
  dayName?: string;
  exerciseId?: string;
  exerciseName?: string;
  message: string;
}

export interface ProgramConsistencyResult {
  errors: ProgramConsistencyIssue[];
  warnings: ProgramConsistencyIssue[];
}

export interface DayConsistency {
  day: WorkoutProgramDay;
  errors: ProgramConsistencyIssue[];
  warnings: ProgramConsistencyIssue[];
}

interface ExerciseCatalogEntry {
  id: string;
  name?: string;
}

function dayConfigs(day: WorkoutProgramDay): ProgramExerciseConfig[] {
  return day?.exercises && day.exercises.length > 0 ? day.exercises : [];
}

function dayHasAnyExercise(day: WorkoutProgramDay): boolean {
  return (
    (day?.exercises && day.exercises.length > 0) ||
    (day?.exerciseIds && day.exerciseIds.length > 0)
  );
}

// Fully validated consistency of one program, optionally against the exercise
// catalog (used to flag references to unknown exercises).
export function validateProgramConsistency(
  program: WorkoutProgram,
  catalog?: ExerciseCatalogEntry[]
): ProgramConsistencyResult {
  const errors: ProgramConsistencyIssue[] = [];
  const warnings: ProgramConsistencyIssue[] = [];

  if (!program) return { errors, warnings };

  if (!program.title || !program.title.trim()) {
    warnings.push({ code: 'empty-title', level: 'warning', message: "Le programme n'a pas de titre." });
  }

  if (!program.days || program.days.length === 0) {
    warnings.push({ code: 'no-days', level: 'warning', message: 'Le programme ne contient aucune séance.' });
    return { errors, warnings };
  }

  const seenConfigIds = new Set<string>();

  for (const day of program.days) {
    const dayCtx = { dayId: day?.id, dayName: day?.name };
    const configs = dayConfigs(day);
    const byRefIds = day?.exerciseIds && day.exerciseIds.length > 0 ? day.exerciseIds : [];

    // ERROR — a planned session with no exercise at all cannot be executed.
    if (!dayHasAnyExercise(day)) {
      errors.push({
        code: 'empty-day',
        level: 'error',
        ...dayCtx,
        message: `La séance « ${day?.name || 'sans nom'} » ne contient aucun exercice : impossible de la lancer.`,
      });
    }

    // ERROR — broken uniqueness of config ids (breaks rendering / editing).
    const dayConfigIds = configs.map((c) => c?.id);
    const dupIds = new Set(
      dayConfigIds.filter((id, idx) => id && dayConfigIds.indexOf(id) !== idx)
    );
    for (const dupId of dupIds) {
      errors.push({
        code: 'duplicate-config-id',
        level: 'error',
        ...dayCtx,
        message: `La séance « ${day?.name || 'sans nom'} » contient deux exercices avec le même identifiant (${dupId}).`,
      });
    }

    // ERROR — reference to an exercise that does not exist in the catalog.
    if (catalog) {
      const catalogIds = new Set(catalog.map((e) => e?.id));
      const refIds = configs.map((c) => c?.exerciseId).concat(byRefIds).filter(Boolean) as string[];
      const missing = refIds.filter((id) => !catalogIds.has(id));
      for (const missId of new Set(missing)) {
        const config = configs.find((c) => c.exerciseId === missId);
        errors.push({
          code: 'unknown-exercise',
          level: 'error',
          ...dayCtx,
          exerciseId: missId,
          exerciseName: config?.exerciseName,
          message: `L'exercice « ${config?.exerciseName || missId} » n'existe plus dans le catalogue d'exercices.`,
        });
      }
    }

    // WARNING — no muscle groups tagged.
    if ((!day?.muscleGroups || day.muscleGroups.length === 0) && dayHasAnyExercise(day)) {
      warnings.push({
        code: 'no-muscle-groups',
        level: 'warning',
        ...dayCtx,
        message: `La séance « ${day?.name || 'sans nom'} » ne liste aucun groupe musculaire.`,
      });
    }

    // WARNING — very heavy planned volume (many sets in one session): the day
    // stays executable but deserves a heads-up.
    const totalSets = configs.reduce(
      (acc, c) => acc + (c && Number.isFinite(Number(c.sets)) ? Number(c.sets) : 0),
      0
    );
    if (totalSets >= 30) {
      warnings.push({
        code: 'heavy-volume',
        level: 'warning',
        ...dayCtx,
        message: `La séance « ${day?.name || 'sans nom'} » cumule ${totalSets} séries : volume très élevé, envisagez de la fractionner.`,
      });
    }

    for (const cfg of configs) {
      if (!cfg) continue;

      // WARNING — repetitive use of the same exercise inside one session.
      if (dayConfigs(day).filter((c) => c && c.exerciseId === cfg.exerciseId).length > 1) {
        warnings.push({
          code: 'duplicate-exercise',
          level: 'warning',
          ...dayCtx,
          exerciseId: cfg.exerciseId,
          exerciseName: cfg.exerciseName,
          message: `L'exercice « ${cfg.exerciseName || cfg.exerciseId} » apparaît plusieurs fois dans la même séance.`,
        });
      }

      // WARNING — non-positive series count.
      if (!Number.isFinite(Number(cfg.sets)) || Number(cfg.sets) <= 0) {
        warnings.push({
          code: 'invalid-sets',
          level: 'warning',
          ...dayCtx,
          exerciseId: cfg.exerciseId,
          exerciseName: cfg.exerciseName,
          message: `L'exercice « ${cfg.exerciseName || cfg.exerciseId} » a un nombre de séries invalide (${cfg.sets}).`,
        });
      }

      // WARNING — invalid rest.
      if (!Number.isFinite(Number(cfg.restSec)) || cfg.restSec == null || cfg.restSec < 0) {
        warnings.push({
          code: 'invalid-rest',
          level: 'warning',
          ...dayCtx,
          exerciseId: cfg.exerciseId,
          exerciseName: cfg.exerciseName,
          message: `L'exercice « ${cfg.exerciseName || cfg.exerciseId} » a un repos entre séries invalide.`,
        });
      }

      // WARNING — timer mode without a duration is not executable as timed.
      if (cfg.mode === 'timer' && (!Number.isFinite(Number(cfg.durationSec)) || Number(cfg.durationSec) <= 0)) {
        warnings.push({
          code: 'timer-without-duration',
          level: 'warning',
          ...dayCtx,
          exerciseId: cfg.exerciseId,
          exerciseName: cfg.exerciseName,
          message: `L'exercice « ${cfg.exerciseName || cfg.exerciseId} » est en mode chrono mais n'a aucune durée.`,
        });
      }

      // WARNING — per-series plan length mismatch with the series count.
      const planMismatch = (plan: (number | string)[] | undefined) =>
        Array.isArray(plan) && plan.length > 0 && plan.length !== Number(cfg.sets);
      if (planMismatch(cfg.repsPlan) || planMismatch(cfg.durationPlan) || planMismatch(cfg.restPlan)) {
        warnings.push({
          code: 'plan-length-mismatch',
          level: 'warning',
          ...dayCtx,
          exerciseId: cfg.exerciseId,
          exerciseName: cfg.exerciseName,
          message: `L'exercice « ${cfg.exerciseName || cfg.exerciseId} » a un plan par série dont la longueur ne correspond pas au nombre de séries.`,
        });
      }

      if (cfg.id) seenConfigIds.add(`${day.id}::${cfg.id}`);
    }
  }

  // De-duplicate identical issues (same message, same anchor).
  const unique = (issues: ProgramConsistencyIssue[]) => {
    const keys = new Set<string>();
    return issues.filter((i) => {
      const k = `${i.level}|${i.code}|${i.dayId}|${i.exerciseId}|${i.message}`;
      if (keys.has(k)) return false;
      keys.add(k);
      return true;
    });
  };

  return { errors: unique(errors), warnings: unique(warnings) };
}

// Errors applying specifically to ONE day (used to block its "Lancer" action).
export function validateDay(
  program: WorkoutProgram,
  day: WorkoutProgramDay,
  catalog?: ExerciseCatalogEntry[]
): DayConsistency {
  const result = validateProgramConsistency(
    { ...program, days: [day] },
    catalog
  );
  return {
    day,
    errors: result.errors.filter((i) => i.dayId === day.id),
    warnings: result.warnings.filter((i) => i.dayId === day.id),
  };
}

export function dayHasBlockingError(
  program: WorkoutProgram,
  day: WorkoutProgramDay,
  catalog?: ExerciseCatalogEntry[]
): boolean {
  return validateDay(program, day, catalog).errors.length > 0;
}

export function programHasBlockingError(
  program: WorkoutProgram,
  catalog?: ExerciseCatalogEntry[]
): boolean {
  return validateProgramConsistency(program, catalog).errors.length > 0;
}

export function getAllIssues(program: WorkoutProgram): ProgramConsistencyIssue[] {
  return validateProgramConsistency(program).errors.concat(
    validateProgramConsistency(program).warnings
  );
}