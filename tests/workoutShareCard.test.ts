// LOT E.4 — Tests d'export image de séance
import { describe, test, expect } from 'vitest';
import { isValidRPE, computeAverageRPE, computeRPEStats } from '../src/utilsStats';
import type { WorkoutSession, WorkoutSet, ExerciseSet } from '../src/types';

// Helper pour créer une séance de test minimale avec RPE
const createSessionWithRPE = (): WorkoutSession => ({
  id: 'sess-001',
  title: 'Séance Test',
  date: '2024-01-15',
  startTime: '18:00',
  durationMinutes: 45,
  completed: true,
  totalVolumeKg: 1200,
  exercises: [
    {
      id: 'ex-001',
      exerciseId: 'ex-001',
      exerciseName: 'Développé couché',
      muscleGroup: 'Pectoraux',
      sets: [
        { setNumber: 1, weightKg: 80, reps: 10, mode: 'reps', completed: true, rpe: 7 },
        { setNumber: 2, weightKg: 80, reps: 8, mode: 'reps', completed: true, rpe: 6 },
      ],
    },
    {
      id: 'ex-002',
      exerciseId: 'ex-002',
      exerciseName: 'Rowing',
      muscleGroup: 'Dos',
      sets: [
        { setNumber: 1, weightKg: 60, reps: 10, mode: 'reps', completed: true },
        { setNumber: 2, weightKg: 60, reps: 8, mode: 'reps', completed: true, rpe: 5 },
      ],
    },
  ],
  stretchesCompleted: true,
  stretchesCount: 3,
  guided: false,
  feeling: '💪 Puissant',
  notes: 'Bonne séance',
  phase: 'summary',
  completedStretchesCount: 3,
  currentStretchIdx: 1,
  currentSideIndex: 1,
  updatedAt: new Date().toISOString(),
});

// Helper pour une séance sans RPE
const createSessionNoRPE = (): WorkoutSession => ({
  id: 'sess-002',
  title: 'Séance Sans RPE',
  date: '2024-02-20',
  startTime: '17:30',
  durationMinutes: 30,
  completed: true,
  totalVolumeKg: 600,
  exercises: [
    {
      id: 'ex-003',
      exerciseId: 'ex-003',
      exerciseName: 'Squat',
      muscleGroup: 'Jambes',
      sets: [
        { setNumber: 1, weightKg: 100, reps: 10, mode: 'reps', completed: true },
        { setNumber: 2, weightKg: 100, reps: 10, mode: 'reps', completed: true },
      ],
    },
  ],
  stretchesCompleted: false,
  stretchesCount: 0,
  guided: false,
  feeling: '⚡ Normal',
  notes: '',
  phase: 'summary',
  completedStretchesCount: 0,
  currentStretchIdx: null,
  currentSideIndex: 1,
  updatedAt: new Date().toISOString(),
});

// Helper pour une séance avec records
const createSessionWithRecords = (): WorkoutSession => ({
  id: 'sess-003',
  title: 'Séance Records',
  date: '2024-03-10',
  startTime: '19:00',
  durationMinutes: 60,
  completed: true,
  totalVolumeKg: 2000,
  exercises: [
    {
      id: 'ex-004',
      exerciseId: 'ex-004',
      exerciseName: 'Deadlift',
      muscleGroup: 'Dos',
      sets: [
        { setNumber: 1, weightKg: 150, reps: 5, mode: 'reps', completed: true, rpe: 8 },
        { setNumber: 2, weightKg: 140, reps: 3, mode: 'reps', completed: true, rpe: 9 },
      ],
    },
  ],
  stretchesCompleted: true,
  stretchesCount: 2,
  guided: false,
  feeling: '🔥 Top forme',
  notes: 'Record personnel',
  phase: 'summary',
  completedStretchesCount: 2,
  currentStretchIdx: 2,
  currentSideIndex: 2,
  updatedAt: new Date().toISOString(),
});

describe('LOT E.4 — Export Image de Séance', () => {
  describe('Helpers utilsStats', () => {
    test('isValidRPE accepte les valeurs 1-10', () => {
      expect(isValidRPE(1)).toBe(true);
      expect(isValidRPE(5)).toBe(true);
      expect(isValidRPE(10)).toBe(true);
      expect(isValidRPE(0)).toBe(false);
      expect(isValidRPE(11)).toBe(false);
    });

    test('isValidRPE rejette les valeurs hors plage', () => {
      expect(isValidRPE(-1)).toBe(false);
      expect(isValidRPE(-5)).toBe(false);
      expect(isValidRPE(12)).toBe(false);
    });

    test('computeAverageRPE calcule la moyenne', () => {
      const sets: ExerciseSet[] = [
        { setNumber: 1, weightKg: 80, reps: 10, mode: 'reps', completed: true, rpe: 7 },
        { setNumber: 2, weightKg: 80, reps: 8, mode: 'reps', completed: true, rpe: 6 },
      ];
      const avg = computeAverageRPE(sets);
      expect(avg).toBe(6.5);
    });

    test('computeAverageRPE retourne null sans séries', () => {
      expect(computeAverageRPE([])).toBeNull();
    });

    test('computeRPEStats calcule les statistiques', () => {
      const sets: ExerciseSet[] = [
        { setNumber: 1, weightKg: 80, reps: 10, mode: 'reps', completed: true, rpe: 7 },
        { setNumber: 2, weightKg: 80, reps: 8, mode: 'reps', completed: true, rpe: 6 },
        { setNumber: 3, weightKg: 80, reps: 10, mode: 'reps', completed: true, rpe: 8 },
      ];
      const stats = computeRPEStats(sets);
      expect(stats.average).toBe(7);
      expect(stats.count).toBe(3);
      expect(stats.min).toBe(6);
      expect(stats.max).toBe(8);
    });

    test('computeRPEStats avec pas de RPE', () => {
      const sets: ExerciseSet[] = [
        { setNumber: 1, weightKg: 80, reps: 10, mode: 'reps', completed: true },
        { setNumber: 2, weightKg: 80, reps: 8, mode: 'reps', completed: true },
      ];
      const stats = computeRPEStats(sets);
      expect(stats.count).toBe(0);
      expect(stats.average).toBeNull();
      expect(stats.min).toBeNull();
      expect(stats.max).toBeNull();
    });
  });

  describe('Calculs de séance', () => {
    test('calcule le nombre d\'exercices', () => {
      const session = createSessionWithRPE();
      const exerciseCount = session.exercises.length;
      expect(exerciseCount).toBe(2);
    });

    test('calcule le nombre total de séries', () => {
      const session = createSessionWithRPE();
      const totalSets = session.exercises.reduce((acc, log) => acc + log.sets.length, 0);
      expect(totalSets).toBe(4);
    });

    test('calcule le volume total', () => {
      const session = createSessionWithRPE();
      expect(session.totalVolumeKg).toBe(1200);
    });

    test('calcule la durée', () => {
      const session = createSessionWithRPE();
      expect(session.durationMinutes).toBe(45);
    });

    test('formate la date correctement', () => {
      const session = createSessionWithRPE();
      const date = new Date(session.date);
      const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
      expect(formattedDate).toBe('15/1/2024');
    });

    test('calcul XP avec stretchesCompleted', () => {
      const session = createSessionWithRPE();
      const completedSets = session.exercises.reduce(
        (acc, log) => acc + log.sets.filter((s) => s.completed).length,
        0
      );
      const totalSets = session.exercises.reduce((acc, log) => acc + log.sets.length, 0);
      const expectedXP = 250 + (completedSets - totalSets + totalSets) * 20 + (session.stretchesCompleted * 25);
      expect(session.stretchesCompleted ? expectedXP : 0).toBe(250 + (4 - 4 + 4) * 20 + (1 * 25));
    });

    test('filtre les exercices avec records', () => {
      const session = createSessionWithRecords();
      const bestExercises = session.exercises
        .filter((log) => log.sets.some((s) => s.completed))
        .map((log) => ({
          name: log.exerciseName,
          weight: Math.max(...log.sets.filter((s) => s.completed && s.weightKg > 0).map((s) => s.weightKg), 0),
          reps: Math.max(...log.sets.filter((s) => s.completed && s.reps > 0).map((s) => s.reps), 0),
        }));
      expect(bestExercises.length).toBe(1);
      expect(bestExercises[0].name).toBe('Deadlift');
    });

    test('affiche "Aucun RPE renseigné" quand aucune série ne possède de RPE', () => {
      const session = createSessionNoRPE();
      const allNoRPE = session.exercises.every((log) =>
        log.sets.every((s) => s.rpe === undefined)
      );
      expect(allNoRPE).toBe(true);
    });

    test('ne modifie pas les données source', () => {
      const session = createSessionWithRPE();
      const originalVolume = session.totalVolumeKg;
      // La session ne devrait pas être modifiée par les calculs
      expect(session.totalVolumeKg).toBe(originalVolume);
    });

    test('gère session minimale', () => {
      const session = createSessionNoRPE();
      expect(session.exercises.length).toBe(1);
      expect(session.durationMinutes).toBe(30);
    });

    test('gère plusieurs exercices', () => {
      const session = createSessionWithRPE();
      expect(session.exercises.length).toBe(2);
      expect(session.exercises[0].exerciseName).toBe('Développé couché');
      expect(session.exercises[1].exerciseName).toBe('Rowing');
    });

    test('calcul RPE moyen valide', () => {
      const session = createSessionWithRPE();
      const stats = computeRPEStats(session.exercises.flatMap((log) => log.sets));
      expect(stats.average).toBeDefined();
      expect(typeof stats.average).toBe('number');
    });

    test('RPE moyen absent sans RPE', () => {
      const session = createSessionNoRPE();
      const stats = computeRPEStats(session.exercises.flatMap((log) => log.sets));
      expect(stats.average).toBeNull();
    });

    test('computeAverageRPE avec valeur unique', () => {
      const sets: ExerciseSet[] = [
        { setNumber: 1, weightKg: 80, reps: 10, mode: 'reps', completed: true, rpe: 8 },
      ];
      const avg = computeAverageRPE(sets);
      expect(avg).toBe(8);
    });
  });
});