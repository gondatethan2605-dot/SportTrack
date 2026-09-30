// LOT F.1-A — Tests du modèle de données supersets/circuits
import { describe, test, expect } from 'vitest';
import type { WorkoutProgramDay, ProgramExerciseConfig, ProgramExerciseGroup } from '../src/types';
import { getProgramDayGroups, getExerciseGroup, isExerciseGrouped, getGroupExercises, validateProgramGroups } from '../src/utilsProgram';

// Helper pour créer un jour de programme minimale
const createMinimalDay = (overrides: Partial<WorkoutProgramDay> = {}): WorkoutProgramDay => ({
  id: 'day-1',
  name: 'Lundi',
  dayOfWeek: 'Lundi',
  scheduledTime: '18:00',
  muscleGroups: ['Pectoraux'],
  exerciseIds: ['ex-1', 'ex-2'],
  exercises: [],
  stretches: [],
  notes: '',
  groups: [],
  ...overrides,
});

// Helper pour créer un exercice config avec des noms personnalisables
const createExerciseConfig = (overrides: Partial<ProgramExerciseConfig> & { name?: string } = {}): ProgramExerciseConfig => {
  const defaultName = 'Développé couché';
  return {
    id: 'cfg-1',
    exerciseId: 'ex-1',
    exerciseName: defaultName,
    sets: 3,
    reps: 10,
    mode: 'reps',
    durationSec: undefined,
    repsPlan: undefined,
    durationPlan: undefined,
    restPlan: undefined,
    targetWeightKg: 80,
    restSec: 90,
    transitionRestSec: undefined,
    notes: undefined,
    groupId: undefined,
    groupType: undefined,
    ...overrides,
};

// Helper pour créer un exercice config avec nom personnalisé
const createExerciseConfigWithName = (name: string, overrides: Partial<ProgramExerciseConfig> = {}): ProgramExerciseConfig => ({
  id: 'cfg-1',
  exerciseId: 'ex-1',
  exerciseName: name,
  sets: 3,
  reps: 10,
  mode: 'reps',
  durationSec: undefined,
  repsPlan: undefined,
  durationPlan: undefined,
  restPlan: undefined,
  targetWeightKg: 80,
  restSec: 90,
  transitionRestSec: undefined,
  notes: undefined,
  groupId: undefined,
  groupType: undefined,
  ...overrides,
};

// Helper pour créer un groupe
const createGroup = (overrides: Partial<ProgramExerciseGroup> = {}): ProgramExerciseGroup => ({
  id: 'group-1',
  type: 'superset',
  rounds: 3,
  restBetweenExercisesSec: 30,
  restBetweenRoundsSec: 90,
  ...overrides,
});

describe('LOT F.1-A — Modèle de données supersets/circuits', () => {
  describe('getProgramDayGroups', () => {
    test('retourne [] pour un jour sans groupes', () => {
      const day = createMinimalDay();
      const result = getProgramDayGroups(day);
      expect(result).toEqual([]);
    });

    test('retourne les groupes d\'un jour', () => {
      const day = createMinimalDay({
        groups: [createGroup({ id: 'group-1', type: 'superset' })],
      });
      const result = getProgramDayGroups(day);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('group-1');
    });
  });

  describe('getExerciseGroup', () => {
    test('retourne undefined pour un exercice isolé', () => {
      const day = createMinimalDay({
        exercises: [createExerciseConfig()],
      });
      const result = getExerciseGroup('ex-1', day);
      expect(result).toBeUndefined();
    });

    test('retourne le groupe d\'un exercice groupé', () => {
      const day = createMinimalDay({
        exercises: [createExerciseConfig({ groupId: 'group-1', groupType: 'superset' })],
        groups: [createGroup({ id: 'group-1', type: 'superset' })],
      });
      const result = getExerciseGroup('ex-1', day);
      expect(result).not.toBeUndefined();
      expect(result?.id).toBe('group-1');
    });

    test('retourne undefined pour exercice inexistant', () => {
      const day = createMinimalDay({
        exercises: [createExerciseConfig()],
      });
      const result = getExerciseGroup('ex-99', day);
      expect(result).toBeUndefined();
    });
  });

  describe('isExerciseGrouped', () => {
    test('retourne false pour un exercice isolé', () => {
      const day = createMinimalDay({
        exercises: [createExerciseConfig()],
      });
      const result = isExerciseGrouped('ex-1', day);
      expect(result).toBe(false);
    });

    test('retourne true pour un exercice groupé', () => {
      const day = createMinimalDay({
        exercises: [createExerciseConfig({ groupId: 'group-1', groupType: 'superset' })],
        groups: [createGroup({ id: 'group-1', type: 'superset' })],
      });
      const result = isExerciseGrouped('ex-1', day);
      expect(result).toBe(true);
    });
  });

  describe('getGroupExercises', () => {
    test('retourne [] pour un groupe inexistant', () => {
      const day = createMinimalDay({
        exercises: [createExerciseConfig()],
      });
      const result = getGroupExercises('nonexistent', day);
      expect(result).toEqual([]);
    });

    test('retourne les exercices d\'un groupe en respectant l\'ordre de day.exercises', () => {
      const day = createMinimalDay({
        exercises: [
          createExerciseConfigWithName('Développé couché', { groupId: 'group-1', groupType: 'superset' }),
          createExerciseConfigWithName('Rowing', { groupId: 'group-1', groupType: 'superset' }),
          createExerciseConfigWithName('Squat'), // exercice isolé
        ],
        groups: [createGroup({ id: 'group-1', type: 'superset' })],
      });
      const result = getGroupExercises('group-1', day);
      expect(result).toHaveLength(2);
      // Doit respecter l'ordre de day.exercises
      expect(result[0].exerciseName).toBe('Développé couché');
      expect(result[1].exerciseName).toBe('Rowing');
    });

    test('retourne [] pour un groupe sans exercices correspondants', () => {
      const day = createMinimalDay({
        exercises: [createExerciseConfig()],
      });
      const result = getGroupExercises('group-1', day);
      expect(result).toEqual([]);
    });
  });

  describe('validateProgramGroups', () => {
    test('retourne [] pour un programme valide sans groupes', () => {
      const day = createMinimalDay();
      const result = validateProgramGroups(day);
      expect(result).toEqual([]);
    });

    test('retourne [] pour un programme valide avec groupes corrects', () => {
      const day = createMinimalDay({
        exercises: [
          createExerciseConfigWithName('Développé couché', { groupId: 'group-1', groupType: 'superset' }),
          createExerciseConfigWithName('Rowing', { groupId: 'group-1', groupType: 'superset' }),
        ],
        groups: [createGroup({ id: 'group-1', type: 'superset', rounds: 3 })],
      });
      const result = validateProgramGroups(day);
      expect(result).toEqual([]);
    });

    test('détecte groupe avec moins de 2 exercices', () => {
      const day = createMinimalDay({
        exercises: [
          createExerciseConfigWithName('Développé couché', { groupId: 'group-1', groupType: 'superset' }),
        ],
        groups: [createGroup({ id: 'group-1', type: 'superset' })],
      });
      const result = validateProgramGroups(day);
      expect(result).toContain('groupe "group-1" contient 1 exercice(s), minimum 2 requis');
    });

    test('détecte groupId vide', () => {
      const day = createMinimalDay({
        exercises: [
          createExerciseConfigWithName('Développé couché', { groupId: '', groupType: 'superset' }),
        ],
        groups: [],
      });
      const result = validateProgramGroups(day);
      expect(result).toContain('groupId vide');
    });

    test('détecte exercise avec groupId mais groupe manquant', () => {
      const day = createMinimalDay({
        exercises: [
          createExerciseConfigWithName('Développé couché', { groupId: 'group-orphan', groupType: 'superset' }),
        ],
        groups: [],
      });
      const result = validateProgramGroups(day);
      expect(result).toContain('a groupId "group-orphan" mais aucun groupe correspondant');
    });

    test('accepte rounds > 1', () => {
      const day = createMinimalDay({
        exercises: [
          createExerciseConfigWithName('Développé couché', { groupId: 'group-1', groupType: 'superset' }),
          createExerciseConfigWithName('Rowing', { groupId: 'group-1', groupType: 'superset' }),
        ],
        groups: [createGroup({ id: 'group-1', type: 'superset', rounds: 5 })],
      });
      const result = validateProgramGroups(day);
      expect(result).toEqual([]);
    });

    test('accepte repos >= 0', () => {
      const day = createMinimalDay({
        exercises: [
          createExerciseConfigWithName('Développé couché', { groupId: 'group-1', groupType: 'superset' }),
          createExerciseConfigWithName('Rowing', { groupId: 'group-1', groupType: 'superset' }),
        ],
        groups: [createGroup({ id: 'group-1', type: 'superset', restBetweenExercisesSec: 0 })],
      });
      const result = validateProgramGroups(day);
      expect(result).toEqual([]);
    });

    test('rejet rounds <= 0', () => {
      const day = createMinimalDay({
        exercises: [
          createExerciseConfigWithName('Développé couché', { groupId: 'group-1', groupType: 'superset' }),
          createExerciseConfigWithName('Rowing', { groupId: 'group-1', groupType: 'superset' }),
        ],
        groups: [createGroup({ id: 'group-1', type: 'superset', rounds: 0 })],
      });
      const result = validateProgramGroups(day);
      expect(result).toContain('rounds <= 0');
    });

    test('rejet repos négatif', () => {
      const day = createMinimalDay({
        exercises: [
          createExerciseConfigWithName('Développé couché', { groupId: 'group-1', groupType: 'superset' }),
          createExerciseConfigWithName('Rowing', { groupId: 'group-1', groupType: 'superset' }),
        ],
        groups: [createGroup({ id: 'group-1', type: 'superset', restBetweenExercisesSec: -1 })],
      });
      const result = validateProgramGroups(day);
      expect(result).toContain('reposBetweenExercisesSec négatif');
    });

    test('rejette type invalide', () => {
      const day = createMinimalDay({
        exercises: [
          createExerciseConfigWithName('Développé couché', { groupId: 'group-1', groupType: 'superset' }),
          createExerciseConfigWithName('Rowing', { groupId: 'group-1', groupType: 'superset' }),
        ],
        groups: [createGroup({ id: 'group-1', type: 'invalid' })],
      });
      const result = validateProgramGroups(day);
      expect(result).toContain('a un type invalide');
    });

    test('programme ancien sans groupe valide', () => {
      const day = createMinimalDay({
        exercises: [
          createExerciseConfigWithName('Développé couché', { sets: 3, reps: 10 }),
          createExerciseConfigWithName('Rowing', { sets: 3, reps: 8 }),
        ],
        groups: [],
      });
      const result = validateProgramGroups(day);
      expect(result).toEqual([]);
    });
  });
});