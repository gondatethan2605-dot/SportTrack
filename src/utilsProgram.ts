import { WorkoutProgram, WorkoutProgramDay, ProgramExerciseConfig } from './types';
import { resolveSetRestSec, resolveTransitionRestSec } from './components/workout/workoutGuidedEngine';
import { getWorkoutSettings } from './utilsSettings';

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