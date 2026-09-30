// Pure 1RM calculation helpers — no React, no IndexedDB, fully testable.
// Formulas return finite numbers only; never NaN or Infinity.

export type OneRMFormula = 'epley' | 'brzycki';

export interface OneRMEstimate {
  epley: number;
  brzycki: number;
  conservative: number; // min of the two for safety
}

export interface PlateCalculation {
  barWeightKg: number;
  targetWeightKg: number;
  perSideKg: number;
  plates: PlateCount[];
  totalWeightKg: number;
  achievable: boolean;
}

export interface PlateCount {
  weightKg: number;
  count: number; // per side
}

// Standard Olympic plates (kg)
export const STANDARD_PLATES_KG: readonly number[] = [
  0.5, 1, 1.25, 2.5, 5, 10, 15, 20, 25,
];

// Common bar weights
export const STANDARD_BAR_WEIGHTS_KG: readonly number[] = [15, 20];

// Allowed increments for rounding
export const WEIGHT_INCREMENTS_KG: readonly number[] = [0.5, 1, 2.5, 5];

function isValidWeight(weightKg: number): boolean {
  return Number.isFinite(weightKg) && weightKg > 0;
}

function isValidReps(reps: number): boolean {
  return Number.isFinite(reps) && reps > 0 && Number.isInteger(reps);
}

function safeDivide(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : 0;
}

// Epley formula: 1RM = weight × (1 + reps / 30)
export function estimateOneRMEpley(weightKg: number, reps: number): number {
  if (!isValidWeight(weightKg) || !isValidReps(reps)) return 0;
  const result = weightKg * (1 + reps / 30);
  return Number.isFinite(result) && result > 0 ? result : 0;
}

// Brzycki formula: 1RM = weight × 36 / (37 - reps)
// Handles reps >= 37 by returning 0 (invalid domain)
export function estimateOneRMBrzycki(weightKg: number, reps: number): number {
  if (!isValidWeight(weightKg) || !isValidReps(reps)) return 0;
  if (reps >= 37) return 0; // formula undefined
  const denom = 37 - reps;
  if (denom <= 0) return 0;
  const result = weightKg * 36 / denom;
  return Number.isFinite(result) && result > 0 ? result : 0;
}

// Estimate 1RM using both formulas, return both + conservative (min)
export function estimateOneRM(weightKg: number, reps: number): OneRMEstimate {
  const epley = estimateOneRMEpley(weightKg, reps);
  const brzycki = estimateOneRMBrzycki(weightKg, reps);
  const valid = [epley, brzycki].filter((v) => v > 0);
  const conservative = valid.length > 0 ? Math.min(...valid) : 0;
  return { epley, brzycki, conservative };
}

// Calculate working weight from 1RM and percentage (e.g., 80% -> 0.8)
export function calculateWeightFromOneRM(oneRM: number, percentage: number): number {
  if (!Number.isFinite(oneRM) || oneRM <= 0) return 0;
  if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) return 0;
  const result = oneRM * (percentage / 100);
  return Number.isFinite(result) && result > 0 ? result : 0;
}

// Round weight to nearest increment (0.5, 1, 2.5, 5 kg)
export function roundWeightToIncrement(weightKg: number, incrementKg: number): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return 0;
  if (!Number.isFinite(incrementKg) || incrementKg <= 0) return Math.round(weightKg);
  const rounded = Math.round(weightKg / incrementKg) * incrementKg;
  return Number.isFinite(rounded) && rounded > 0 ? rounded : 0;
}

// Calculate plates needed for a target weight (per side)
export function calculatePlatesForWeight(
  targetWeightKg: number,
  barWeightKg: number = 20,
  availablePlates: readonly number[] = STANDARD_PLATES_KG
): PlateCalculation {
  if (!isValidWeight(targetWeightKg) || !isValidWeight(barWeightKg)) {
    return {
      barWeightKg,
      targetWeightKg,
      perSideKg: 0,
      plates: [],
      totalWeightKg: barWeightKg,
      achievable: false,
    };
  }

  // Weight to load on the bar (total - bar)
  const loadWeight = targetWeightKg - barWeightKg;
  if (loadWeight <= 0) {
    return {
      barWeightKg,
      targetWeightKg,
      perSideKg: 0,
      plates: [],
      totalWeightKg: barWeightKg,
      achievable: true,
    };
  }

  // Per side
  const perSide = loadWeight / 2;
  if (!Number.isFinite(perSide) || perSide < 0) {
    return {
      barWeightKg,
      targetWeightKg,
      perSideKg: 0,
      plates: [],
      totalWeightKg: barWeightKg,
      achievable: false,
    };
  }

  // Greedy algorithm: use largest plates first
  const sortedPlates = [...availablePlates].sort((a, b) => b - a);
  const plates: PlateCount[] = [];
  let remaining = perSide;

  for (const plate of sortedPlates) {
    if (remaining <= 0) break;
    const count = Math.floor(remaining / plate);
    if (count > 0) {
      plates.push({ weightKg: plate, count });
      remaining -= count * plate;
    }
  }

  const achievedPerSide = perSide - remaining;
  const achievedTotal = barWeightKg + achievedPerSide * 2;
  const achievable = remaining < 0.25; // tolerance for floating point

  return {
    barWeightKg,
    targetWeightKg,
    perSideKg: achievedPerSide,
    plates,
    totalWeightKg: achievedTotal,
    achievable,
  };
}

// Format plate list for display
export function formatPlates(plates: PlateCount[]): string {
  if (plates.length === 0) return '—';
  return plates
    .map((p) => `${p.count} × ${p.weightKg} kg`)
    .join('  +  ');
}

// Predefined percentage presets
export const PERCENTAGE_PRESETS: readonly number[] = [
  50, 55, 60, 65, 70, 75, 80, 85, 90, 95,
];

export function formatWeight(weightKg: number): string {
  if (!Number.isFinite(weightKg)) return '—';
  return weightKg % 1 === 0 ? `${weightKg} kg` : `${weightKg.toFixed(1)} kg`;
}