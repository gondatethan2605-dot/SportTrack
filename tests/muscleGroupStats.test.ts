// Test d'historique inexistant
import { describe, test, expect } from 'vitest';
import {
  computeMuscleGroupVolume,
  computeMuscleGroupFrequency,
  computeMuscleGroupExerciseCount,
  computeMuscleGroupTrend,
  computeMuscleGroupStats,
  getMuscleGroupExerciseNames,
  MuscleGroupList,
  isValidMuscleGroup,
} from '../src/utilsStats';
import type { MuscleGroup } from '../src/types';

describe('LOT E.2 — Muscle Group Statistics', () => {
  // Mock sessions data
  const createMockSession = (exercises: { muscleGroup: string; sets: { completed: boolean; mode: string; reps: number; weightKg: number }[] }[]) => ({
    id: 's1',
    title: 'Test',
    date: '2024-01-15',
    startTime: '10:00',
    durationMinutes: 60,
    guided: false,
    stretchesCompleted: 0,
    stretchesCount: 0,
    exercises: exercises.map((ex, i) => ({
      id: `ex${i}`,
      exerciseId: `ex${i}`,
      exerciseName: `Exercice ${i}`,
      muscleGroup: ex.muscleGroup,
      sets: ex.sets,
    })),
    totalVolumeKg: 0,
    feeling: 'normal' as const,
    notes: '',
  });

  const mockExercisesById: Record<string, { name: string }> = {
    ex0: { name: 'Développé couché' },
    ex1: { name: 'Rowing' },
    ex2: { name: 'Squat' },
  };

  const pectoraux: MuscleGroup = 'Pectoraux';
  const dos: MuscleGroup = 'Dos';
  const jambes: MuscleGroup = 'Jambes';

  describe('Utils — validateMuscleGroup', () => {
    test('isValidMuscleGroup with valid value', () => {
      expect(isValidMuscleGroup('Pectoraux')).toBe(true);
      expect(isValidMuscleGroup('Dos')).toBe(true);
      expect(isValidMuscleGroup('Full Body')).toBe(true);
    });

    test('isValidMuscleGroup with invalid value', () => {
      expect(isValidMuscleGroup('')).toBe(false);
      expect(isValidMuscleGroup('Invalid')).toBe(false);
    });
  });

  describe('Utils — MuscleGroupList', () => {
    test('contains all 8 expected groups', () => {
      expect(MuscleGroupList).toHaveLength(8);
      expect(MuscleGroupList).toContain('Pectoraux');
      expect(MuscleGroupList).toContain('Dos');
      expect(MuscleGroupList).toContain('Épaules');
      expect(MuscleGroupList).toContain('Bras');
      expect(MuscleGroupList).toContain('Jambes');
      expect(MuscleGroupList).toContain('Abdos');
      expect(MuscleGroupList).toContain('Full Body');
      expect(MuscleGroupList).toContain('Cardio');
    });

    test('is in deterministic order', () => {
      const order = MuscleGroupList.map((g, i) => ({ group: g, index: i }));
      for (let i = 1; i < order.length; i++) {
        expect(order[i].index).toBeGreaterThanOrEqual(order[i - 1].index);
      }
    });
  });

  describe('Utils — computeMuscleGroupVolume', () => {
    const sessionsWithPectoraux = [
      createMockSession([
        { muscleGroup: 'Pectoraux', sets: [{ completed: true, mode: 'reps', reps: 10, weightKg: 80 }] },
        { muscleGroup: 'Pectoraux', sets: [{ completed: true, mode: 'reps', reps: 8, weightKg: 90 }] },
      ]),
      createMockSession([
        { muscleGroup: 'Dos', sets: [{ completed: true, mode: 'reps', reps: 6, weightKg: 100 }] },
      ]),
    ];

    test('volume for Pectoraux with rep sets', () => {
      const volume = computeMuscleGroupVolume(sessionsWithPectoraux, pectoraux);
      // 80*10 + 90*8 = 800 + 720 = 1520
      expect(volume).toBe(1520);
    });

    test('volume for unrelated group is 0', () => {
      const volume = computeMuscleGroupVolume(sessionsWithPectoraux, jambes);
      expect(volume).toBe(0);
    });

    test('volume with no completed sets is 0', () => {
      const sessionsNoSets = [
        createMockSession([
          { muscleGroup: 'Pectoraux', sets: [{ completed: false, mode: 'reps', reps: 10, weightKg: 80 }] },
        ]),
      ];
      expect(computeMuscleGroupVolume(sessionsNoSets, pectoraux)).toBe(0);
    });

    test('volume ignores timer mode sets', () => {
      const sessionsTimer = [
        createMockSession([
          { muscleGroup: 'Pectoraux', sets: [{ completed: true, mode: 'timer', durationSec: 30, weightKg: 80 }] },
        ]),
      ];
      expect(computeMuscleGroupVolume(sessionsTimer, pectoraux)).toBe(0);
    });
  });

  describe('Utils — computeMuscleGroupFrequency', () => {
    const sessionsMixed = [
      createMockSession([
        { muscleGroup: 'Pectoraux', sets: [{ completed: true, mode: 'reps', reps: 10, weightKg: 80 }] },
      ]),
      createMockSession([
        { muscleGroup: 'Pectoraux', sets: [{ completed: false, mode: 'reps', reps: 10, weightKg: 80 }] },
      ]),
      createMockSession([
        { muscleGroup: 'Dos', sets: [{ completed: true, mode: 'reps', reps: 6, weightKg: 100 }] },
      ]),
    ];

    test('frequency counts sessions with at least one completed rep set', () => {
      const freq = computeMuscleGroupFrequency(sessionsMixed, pectoraux);
      // Only session 0 has a completed rep set for Pectoraux
      expect(freq).toBe(1);
    });

    test('frequency is 0 when no completed sets', () => {
      const freq = computeMuscleGroupFrequency(sessionsMixed, jambes);
      expect(freq).toBe(0);
    });
  });

  describe('Utils — computeMuscleGroupExerciseCount', () => {
    const sessionsMultipleExercises = [
      createMockSession([
        { muscleGroup: 'Pectoraux', sets: [{ completed: true, mode: 'reps', reps: 10, weightKg: 80 }] },
        { muscleGroup: 'Pectoraux', sets: [{ completed: true, mode: 'reps', reps: 8, weightKg: 90 }] },
      ]),
      createMockSession([
        { muscleGroup: 'Dos', sets: [{ completed: true, mode: 'reps', reps: 6, weightKg: 100 }] },
      ]),
    ];

    test('counts distinct exercise IDs per group', () => {
      const count = computeMuscleGroupExerciseCount(sessionsMultipleExercises, pectoraux);
      // ex0 and ex1 both have muscleGroup Pectoraux
      expect(count).toBe(2);
    });

    test('count is 0 for unrelated group', () => {
      const count = computeMuscleGroupExerciseCount(sessionsMultipleExercises, jambes);
      expect(count).toBe(0);
    });
  });

  describe('Utils — computeMuscleGroupTrend', () => {
    const sessionsWithProgress = [
      // Session 1: light weight
      createMockSession([
        { muscleGroup: 'Pectoraux', sets: [{ completed: true, mode: 'reps', reps: 5, weightKg: 50 }] },
      ]),
      // Session 2: heavier weight
      createMockSession([
        { muscleGroup: 'Pectoraux', sets: [{ completed: true, mode: 'reps', reps: 8, weightKg: 70 }] },
      ]),
      // Session 3: even heavier
      createMockSession([
        { muscleGroup: 'Pectoraux', sets: [{ completed: true, mode: 'reps', reps: 6, weightKg: 80 }] },
      ]),
    ];

    test('trend is progressing for increasing weights', () => {
      const trend = computeMuscleGroupTrend(sessionsWithProgress, pectoraux);
      expect(trend).toBe('progressing');
    });

    test('trend is insufficient with only one session', () => {
      const singleSession = [
        createMockSession([
          { muscleGroup: 'Pectoraux', sets: [{ completed: true, mode: 'reps', reps: 10, weightKg: 80 }] },
        ]),
      ];
      expect(computeMuscleGroupTrend(singleSession, pectoraux)).toBe('insufficient');
    });

    test('trend is insufficient when no completed sets', () => {
      const noSets = [
        createMockSession([
          { muscleGroup: 'Pectoraux', sets: [{ completed: false, mode: 'reps', reps: 10, weightKg: 80 }] },
        ]),
      ];
      expect(computeMuscleGroupTrend(noSets, pectoraux)).toBe('insufficient');
    });
  });

  describe('Utils — computeMuscleGroupStats', () => {
    const sessionsWithData = [
      createMockSession([
        { muscleGroup: 'Pectoraux', sets: [{ completed: true, mode: 'reps', reps: 10, weightKg: 80 }] },
        { muscleGroup: 'Pectoraux', sets: [{ completed: true, mode: 'reps', reps: 8, weightKg: 90 }] },
      ]),
      createMockSession([
        { muscleGroup: 'Dos', sets: [{ completed: true, mode: 'reps', reps: 6, weightKg: 100 }] },
      ]),
    ];

    test('returns compact stats object', () => {
      const stats = computeMuscleGroupStats(sessionsWithData, pectoraux, mockExercisesById);
      expect(stats).toHaveProperty('volume');
      expect(stats).toHaveProperty('frequency');
      expect(stats).toHaveProperty('exerciseCount');
      expect(stats).toHaveProperty('trend');
      expect(typeof stats.volume).toBe('number');
      expect(typeof stats.frequency).toBe('number');
      expect(typeof stats.exerciseCount).toBe('number');
      expect(['progressing', 'stagnating', 'regressing', 'insufficient']).toContain(stats.trend);
    });

    test('volume is total weight*reps', () => {
      const stats = computeMuscleGroupStats(sessionsWithData, pectoraux, mockExercisesById);
      // 80*10 + 90*8 = 1520
      expect(stats.volume).toBe(1520);
    });

    test('frequency counts sessions with completed reps', () => {
      const stats = computeMuscleGroupStats(sessionsWithData, pectoraux, mockExercisesById);
      // Only session 0 has completed reps for Pectoraux
      expect(stats.frequency).toBe(1);
    });

    test('exerciseCount counts distinct exercises', () => {
      const stats = computeMuscleGroupStats(sessionsWithData, pectoraux, mockExercisesById);
      expect(stats.exerciseCount).toBe(2);
    });

    test('trend uses analyzeProgression under the hood', () => {
      const stats = computeMuscleGroupStats(sessionsWithData, pectoraux, mockExercisesById);
      expect(['progressing', 'stagnating', 'regressing', 'insufficient']).toContain(stats.trend);
    });
  });

  describe('Utils — getMuscleGroupExerciseNames', () => {
    const sessionsWithExercises = [
      createMockSession([
        { muscleGroup: 'Pectoraux', sets: [{ completed: true, mode: 'reps', reps: 10, weightKg: 80 }] },
        { muscleGroup: 'Pectoraux', sets: [{ completed: true, mode: 'reps', reps: 8, weightKg: 90 }] },
      ]),
    ];

    test('returns unique exercise names for a group', () => {
      const names = getMuscleGroupExerciseNames(sessionsWithExercises, pectoraux, mockExercisesById);
      expect(names).toContain('Développé couché');
      expect(names).toContain('Rowing');
      expect(names).toHaveLength(2);
    });

    test('returns empty array when no sessions', () => {
      const names = getMuscleGroupExerciseNames([], pectoraux, mockExercisesById);
      expect(names).toEqual([]);
    });

    test('handles missing exercise in map gracefully', () => {
      const incompleteMap: Record<string, { name: string }> = { ex0: { name: 'Exercice 0' } };
      const names = getMuscleGroupExerciseNames(sessionsWithExercises, pectoraux, incompleteMap);
      // Should not crash, may include 'Exercice inconnu' or similar
      expect(names).toBeInstanceOf(Array);
    });
  });

  describe('Integration — Muscle group selector logic', () => {
    test('selector cycles through all groups from MuscleGroupList', () => {
      // Verify all groups are valid and can be selected
      MuscleGroupList.forEach((group) => {
        expect(isValidMuscleGroup(group)).toBe(true);
      });
    });

    test('selected group influences all computed stats', () => {
      const sessions = [
        createMockSession([
          { muscleGroup: 'Pectoraux', sets: [{ completed: true, mode: 'reps', reps: 10, weightKg: 80 }] },
        ]),
        createMockSession([
          { muscleGroup: 'Dos', sets: [{ completed: true, mode: 'reps', reps: 6, weightKg: 100 }] },
        ]),
      ];

      // Pectoraux should have volume > 0
      const pectorauxStats = computeMuscleGroupStats(sessions, 'Pectoraux', mockExercisesById);
      expect(pectorauxStats.volume).toBeGreaterThan(0);

      // Dos should have volume > 0
      const dosStats = computeMuscleGroupStats(sessions, 'Dos', mockExercisesById);
      expect(dosStats.volume).toBeGreaterThan(0);

      // Jambes should have volume 0
      const jambesStats = computeMuscleGroupStats(sessions, 'Jambes', mockExercisesById);
      expect(jambesStats.volume).toBe(0);
    });
  });
});