// Tests unitaires LOT E.3 — RPE par série
import { isValidRPE, computeAverageRPE, computeRPEStats } from '../src/utilsStats';
import type { WorkoutSet } from '../src/types';

describe('LOT E.3 — RPE (Rate of Perceived Exertion)', () => {
  const validSets: WorkoutSet[] = [
    { setNumber: 1, weightKg: 80, reps: 10, mode: 'reps', completed: true, rpe: 7 },
    { setNumber: 2, weightKg: 80, reps: 10, mode: 'reps', completed: true, rpe: 8 },
    { setNumber: 3, weightKg: 80, reps: 10, mode: 'reps', completed: true, rpe: 6 },
  ];

  const setsWithUndefinedRPE: WorkoutSet[] = [
    { setNumber: 1, weightKg: 80, reps: 10, mode: 'reps', completed: true },
    { setNumber: 2, weightKg: 80, reps: 10, mode: 'reps', completed: true },
  ];

  const mixedSets: WorkoutSet[] = [
    { setNumber: 1, weightKg: 80, reps: 10, mode: 'reps', completed: true, rpe: 5 },
    { setNumber: 2, weightKg: 80, reps: 10, mode: 'reps', completed: true },
    { setNumber: 3, weightKg: 80, reps: 10, mode: 'reps', completed: true, rpe: 9 },
  ];

  describe('isValidRPE', () => {
    test('accepts valid RPE values 1-10', () => {
      expect(isValidRPE(1)).toBe(true);
      expect(isValidRPE(5)).toBe(true);
      expect(isValidRPE(10)).toBe(true);
    });

    test('rejects invalid RPE values', () => {
      expect(isValidRPE(0)).toBe(false);
      expect(isValidRPE(11)).toBe(false);
      expect(isValidRPE(-1)).toBe(false);
      expect(isValidRPE(12)).toBe(false);
      expect(isValidRPE(null as any)).toBe(false);
      expect(isValidRPE(NaN as any)).toBe(false);
    });
  });

  describe('computeAverageRPE', () => {
    test('returns null when no valid RPE found', () => {
      expect(computeAverageRPE(setsWithUndefinedRPE)).toBe(null);
      expect(computeAverageRPE([])).toBe(null);
    });

    test('computes correct average with valid RPEs', () => {
      expect(computeAverageRPE(validSets)).toBe(7);
    });

    test('ignores series without RPE in mixed sets', () => {
      expect(computeAverageRPE(mixedSets)).toBe(7);
    });

    test('handles single RPE', () => {
      const singleSet = [{ setNumber: 1, weightKg: 80, reps: 10, mode: 'reps', completed: true, rpe: 10 }];
      expect(computeAverageRPE(singleSet)).toBe(10);
    });
  });

  describe('computeRPEStats', () => {
    test('returns correct stats with valid RPEs', () => {
      const stats = computeRPEStats(validSets);
      expect(stats.average).toBe(7);
      expect(stats.count).toBe(3);
      expect(stats.min).toBe(6);
      expect(stats.max).toBe(8);
    });

    test('returns null values when no valid RPE', () => {
      const stats = computeRPEStats(setsWithUndefinedRPE);
      expect(stats.average).toBe(null);
      expect(stats.count).toBe(0);
      expect(stats.min).toBe(null);
      expect(stats.max).toBe(null);
    });

    test('computes min/max correctly with mixed sets', () => {
      const stats = computeRPEStats(mixedSets);
      expect(stats.average).toBe(7);
      expect(stats.count).toBe(2);
      expect(stats.min).toBe(5);
      expect(stats.max).toBe(9);
    });
  });
});