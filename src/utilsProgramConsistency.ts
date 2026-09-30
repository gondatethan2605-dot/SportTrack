import { WorkoutProgram, WorkoutProgramDay, ProgramExerciseConfig, ExerciseMode } from './types';

// ----------------------------------------------------------------------------
// LOT 9 — Item 9.7 : détection d'incohérences de programme.
// Pure, read-only. Reports ERRORS (a day is genuinely not executable or the
// data structure is broken) and WARNINGS (executable but suspicious). It never
// mutates anything and never persists anything. The exercise catalog is
// optional: when absent, reference checks are skipped (the UI still validates
// structural issues).
//
// LOT D — Validation renforcée : blocages pour NaN/Infinity, mode invalide,
// repsPlan/durationPlan/restPlan incompatibles, séries à 0, repos invalide.
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

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isNonNegativeFiniteNumber(v: unknown): v is number {
  return isFiniteNumber(v) && v >= 0;
}

function isPositiveFiniteNumber(v: unknown): v is number {
  return isFiniteNumber(v) && v > 0;
}

function isValidExerciseMode(v: unknown): v is ExerciseMode {
  return v === 'reps' || v === 'timer';
}

function validateRepsPlan(plan: unknown, sets: number): string | null {
  if (!Array.isArray(plan)) return null;
  if (plan.length === 0) return null;
  if (plan.length !== sets) return 'plan-length-mismatch';
  for (const v of plan) {
    if (typeof v !== 'number' && typeof v !== 'string') return 'plan-invalid-type';
    const n = typeof v === 'string' ? Number(v) : v;
    if (!isNonNegativeFiniteNumber(n)) return 'plan-nan-infinity';
  }
  return null;
}

function validateDurationPlan(plan: unknown, sets: number): string | null {
  if (!Array.isArray(plan)) return null;
  if (plan.length === 0) return null;
  if (plan.length !== sets) return 'plan-length-mismatch';
  for (const v of plan) {
    if (!isNonNegativeFiniteNumber(v)) return 'plan-nan-infinity';
  }
  return null;
}

function validateRestPlan(plan: unknown, sets: number): string | null {
  if (!Array.isArray(plan)) return null;
  if (plan.length === 0) return null;
  // restPlan a (sets - 1) entrées pour le repos ENTRE les séries
  if (plan.length !== Math.max(0, sets - 1)) return 'plan-length-mismatch';
  for (const v of plan) {
    if (!isNonNegativeFiniteNumber(v)) return 'plan-nan-infinity';
  }
  return null;
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
      (acc, c) => acc + (c && isPositiveFiniteNumber(c.sets) ? Number(c.sets) : 0),
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

      // ERROR — non-positive or invalid series count (BLOCAGE).
      if (!isPositiveFiniteNumber(cfg.sets)) {
        errors.push({
          code: 'invalid-sets',
          level: 'error',
          ...dayCtx,
          exerciseId: cfg.exerciseId,
          exerciseName: cfg.exerciseName,
          message: `L'exercice « ${cfg.exerciseName || cfg.exerciseId} » a un nombre de séries invalide (${cfg.sets}).`,
        });
      }

      // ERROR — invalid rest (NaN, Infinity, negative) — BLOCAGE.
      if (!isNonNegativeFiniteNumber(cfg.restSec)) {
        errors.push({
          code: 'invalid-rest',
          level: 'error',
          ...dayCtx,
          exerciseId: cfg.exerciseId,
          exerciseName: cfg.exerciseName,
          message: `L'exercice « ${cfg.exerciseName || cfg.exerciseId} » a un repos entre séries invalide (${cfg.restSec}).`,
        });
      }

      // ERROR — invalid transitionRestSec
      if (cfg.transitionRestSec != null && !isNonNegativeFiniteNumber(cfg.transitionRestSec)) {
        errors.push({
          code: 'invalid-transition-rest',
          level: 'error',
          ...dayCtx,
          exerciseId: cfg.exerciseId,
          exerciseName: cfg.exerciseName,
          message: `L'exercice « ${cfg.exerciseName || cfg.exerciseId} » a un repos de transition invalide (${cfg.transitionRestSec}).`,
        });
      }

      // ERROR — invalid mode (must be 'reps' or 'timer')
      if (!isValidExerciseMode(cfg.mode)) {
        errors.push({
          code: 'invalid-mode',
          level: 'error',
          ...dayCtx,
          exerciseId: cfg.exerciseId,
          exerciseName: cfg.exerciseName,
          message: `L'exercice « ${cfg.exerciseName || cfg.exerciseId} » a un mode invalide (« ${cfg.mode} »). Doit être 'reps' ou 'timer'.`,
        });
      }

      // ERROR — timer mode without a valid duration is not executable as timed.
      if (cfg.mode === 'timer' && !isPositiveFiniteNumber(cfg.durationSec)) {
        errors.push({
          code: 'timer-without-duration',
          level: 'error',
          ...dayCtx,
          exerciseId: cfg.exerciseId,
          exerciseName: cfg.exerciseName,
          message: `L'exercice « ${cfg.exerciseName || cfg.exerciseId} » est en mode chrono mais n'a aucune durée valide.`,
        });
      }

      // ERROR — NaN or Infinity in targetWeightKg
      if (!isFiniteNumber(cfg.targetWeightKg)) {
        errors.push({
          code: 'invalid-weight',
          level: 'error',
          ...dayCtx,
          exerciseId: cfg.exerciseId,
          exerciseName: cfg.exerciseName,
          message: `L'exercice « ${cfg.exerciseName || cfg.exerciseId} » a un poids cible invalide (${cfg.targetWeightKg}).`,
        });
      }

      // ERROR — repsPlan: NaN/Infinity or length mismatch
      const repsPlanErr = validateRepsPlan(cfg.repsPlan, Number(cfg.sets));
      if (repsPlanErr) {
        errors.push({
          code: repsPlanErr === 'plan-length-mismatch' ? 'plan-length-mismatch' : 'plan-nan-infinity',
          level: 'error',
          ...dayCtx,
          exerciseId: cfg.exerciseId,
          exerciseName: cfg.exerciseName,
          message: repsPlanErr === 'plan-length-mismatch'
            ? `L'exercice « ${cfg.exerciseName || cfg.exerciseId} » a un plan de répétitions par série dont la longueur (${cfg.repsPlan?.length ?? 0}) ne correspond pas au nombre de séries (${cfg.sets}).`
            : `L'exercice « ${cfg.exerciseName || cfg.exerciseId} » a un plan de répétitions contenant des valeurs invalides (NaN/Infinity).`,
        });
      }

      // ERROR — durationPlan: NaN/Infinity or length mismatch
      const durPlanErr = validateDurationPlan(cfg.durationPlan, Number(cfg.sets));
      if (durPlanErr) {
        errors.push({
          code: durPlanErr === 'plan-length-mismatch' ? 'plan-length-mismatch' : 'plan-nan-infinity',
          level: 'error',
          ...dayCtx,
          exerciseId: cfg.exerciseId,
          exerciseName: cfg.exerciseName,
          message: durPlanErr === 'plan-length-mismatch'
            ? `L'exercice « ${cfg.exerciseName || cfg.exerciseId} » a un plan de durée par série dont la longueur (${cfg.durationPlan?.length ?? 0}) ne correspond pas au nombre de séries (${cfg.sets}).`
            : `L'exercice « ${cfg.exerciseName || cfg.exerciseId} » a un plan de durée contenant des valeurs invalides (NaN/Infinity).`,
        });
      }

      // ERROR — restPlan: NaN/Infinity or length mismatch
      const restPlanErr = validateRestPlan(cfg.restPlan, Number(cfg.sets));
      if (restPlanErr) {
        errors.push({
          code: restPlanErr === 'plan-length-mismatch' ? 'plan-length-mismatch' : 'plan-nan-infinity',
          level: 'error',
          ...dayCtx,
          exerciseId: cfg.exerciseId,
          exerciseName: cfg.exerciseName,
          message: restPlanErr === 'plan-length-mismatch'
            ? `L'exercice « ${cfg.exerciseName || cfg.exerciseId} » a un plan de repos par série dont la longueur (${cfg.restPlan?.length ?? 0}) ne correspond pas au nombre de séries (${cfg.sets}).`
            : `L'exercice « ${cfg.exerciseName || cfg.exerciseId} » a un plan de repos contenant des valeurs invalides (NaN/Infinity).`,
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