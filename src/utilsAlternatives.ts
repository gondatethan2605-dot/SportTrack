import { Exercise, ProgramExerciseConfig } from './types';

// ----------------------------------------------------------------------------
// LOT 9 — Item 9.5 : remplacement intelligent d'exercice.
// Pure, read-only except for building a NEW config for the replacement (the
// original program is only modified after an explicit user confirmation).
// Real alternative ranking reuses the catalog's own `similarExerciseIds`
// (trusted editorial order) before falling back to the same primary muscle,
// then same equipment / close difficulty. Modes remain strictly independent:
// a timer-mode plan is only generated when the alternative has a native
// duration default; otherwise the alternative's own native mode is used
// (flagged) — never a reps<->sec conversion.
// ----------------------------------------------------------------------------

export interface ExerciseAlternative {
  exercise: Exercise;
  rank: 1 | 2 | 3;
  reason: string;
}

export interface AlternativeConfigResult {
  config: ProgramExerciseConfig;
  modePreserved: boolean; // false => the alternative is natively in the other dimension
}

// Predicts whether replacing an exercise with `alternative` would force a mode
// switch (verified against the alternative's native default dimension). Used by
// the confirm UI BEFORE the user commits — never mutates anything.
export function alternativeWillSwitchMode(
  existingMode: 'reps' | 'timer',
  alternative: Exercise
): boolean {
  const native = parseDefaultReps(alternative.defaultReps as number | string);
  return existingMode === 'timer' ? native.kind !== 'duration' : native.kind !== 'count';
}

export type DefaultKind = 'count' | 'duration';

// Parses an exercise default (number of reps OR a duration string) into its
// real dimension. '45 sec' / '45s' / '1 min' => duration; '12' => count. NaN
// strings (e.g. '10 reps x 5 sec') fall back to count 10.
export function parseDefaultReps(input: number | string): { kind: DefaultKind; value: number } {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return { kind: 'count', value: input };
  }
  const raw = String(input ?? '').trim().toLowerCase();
  const minMatch = raw.match(/^([\d.,]+)\s*min/);
  if (minMatch) return { kind: 'duration', value: Math.round(parseFloat(minMatch[1].replace(',', '.')) * 60) };
  const secMatch = raw.match(/^([\d.,]+)\s*(sec|s)/);
  if (secMatch) return { kind: 'duration', value: Math.round(parseFloat(secMatch[1].replace(',', '.'))) };
  const countMatch = raw.match(/^([\d.,]+)/);
  if (countMatch) return { kind: 'count', value: Math.round(parseFloat(countMatch[1].replace(',', '.'))) };
  return { kind: 'count', value: 10 };
}

// The main ranking function. Never includes the exercise itself, never
// duplicates an exercise, and always returns at most `limit` entries.
export function getExerciseAlternatives(
  exercise: Exercise | undefined | null,
  allExercises: Exercise[],
  limit = 5
): ExerciseAlternative[] {
  if (!exercise) return [];
  const pool = (allExercises || []).filter((e) => e && e.id !== exercise.id);
  const ranked: ExerciseAlternative[] = [];

  const pushUnique = (candidate: Exercise | undefined, rank: 1 | 2 | 3, reason: string) => {
    if (!candidate) return;
    if (candidate.id === exercise.id) return;
    if (ranked.some((r) => r.exercise.id === candidate.id)) return;
    ranked.push({ exercise: candidate, rank, reason });
  };

  // 1 — catalog's own similar exercises, in their editorial order.
  for (const id of exercise.similarExerciseIds || []) {
    pushUnique(pool.find((e) => e.id === id), 1, 'Exercice similaire recommandé');
  }

  // 2 — same primary muscle.
  for (const e of pool) {
    if (e.primaryMuscle === exercise.primaryMuscle) {
      pushUnique(e, 2, 'Même groupe musculaire primaire');
    }
  }

  // 3 — same equipment, then close difficulty.
  const diffOrder = ['Débutant', 'Intermédiaire', 'Avancé', 'Tous niveaux'];
  const mine = diffOrder.indexOf(exercise.difficulty);
  for (const e of pool) {
    if (e.equipment !== exercise.equipment) continue;
    const theirs = diffOrder.indexOf(e.difficulty);
    const close = Math.abs(mine - theirs) <= 1;
    pushUnique(e, 3, close ? 'Équipement identique' : 'Équipement identique');
  }

  return ranked.slice(0, limit);
}

function newConfigId(): string {
  return `cfg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Builds a program config for the alternative, preserving the replaced
// config's mode whenever the alternative can natively express it. Returns
// modePreserved=false when the alternative is natively in the other dimension.
export function buildAlternativeConfig(
  existing: ProgramExerciseConfig,
  alternative: Exercise
): AlternativeConfigResult {
  const sets = Math.max(1, Math.round(Number(alternative.defaultSets) || Number(existing.sets) || 4));
  const restSec = Math.max(0, Number(alternative.defaultRestSec ?? existing.restSec) || 0);
  const native = parseDefaultReps(alternative.defaultReps as number | string);
  const existingMode = existing.mode === 'timer' ? 'timer' : 'reps';

  const modePreserved = existingMode === 'timer' ? native.kind === 'duration' : native.kind === 'count';
  const finalMode: 'reps' | 'timer' = modePreserved ? existingMode : native.kind === 'duration' ? 'timer' : 'reps';

  const config: ProgramExerciseConfig = {
    id: newConfigId(),
    exerciseId: alternative.id,
    exerciseName: alternative.name,
    sets,
    reps: finalMode === 'reps' ? native.value : 0,
    mode: finalMode,
    durationSec: finalMode === 'timer' ? native.value : 0,
    targetWeightKg: modePreserved && existingMode === 'reps' ? Number(existing.targetWeightKg) || 0 : 0,
    restSec,
    transitionRestSec: existing.transitionRestSec,
    notes: existing.notes,
    repsPlan: finalMode === 'reps'
      ? Array.from({ length: sets }, () => native.value)
      : undefined,
    durationPlan: finalMode === 'timer'
      ? Array.from({ length: sets }, () => native.value)
      : Array.from({ length: sets }, () => 0),
  };

  return { config, modePreserved };
}