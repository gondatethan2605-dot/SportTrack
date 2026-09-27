import { UserProfile, WorkoutProgram, PersonalRecord, WorkoutSession, Goal, BodyMeasurement } from '../types';
import { initialExercises } from './initialExercises';
import { CORE_STRETCHES, LOWER_BODY_STRETCHES, UPPER_BODY_STRETCHES } from './stretchesData';
import { MY_PROGRAM } from './myProgram';

export { initialExercises, CORE_STRETCHES, LOWER_BODY_STRETCHES, UPPER_BODY_STRETCHES };

export const initialProfile: UserProfile = {
  name: 'Athlète',
  level: 1,
  currentXp: 0,
  nextLevelXp: 500,
  streakDays: 0,
  bestStreak: 0,
  weeklyTargetSessions: 7,
  weeklyCompletedSessions: 0,
  totalWorkouts: 0,
  totalVolumeKg: 0,
  joinedDate: new Date().toISOString().split('T')[0],
};

export const initialPrograms: WorkoutProgram[] = [MY_PROGRAM];

// Clean new state: No demo workouts, no demo PRs, no demo goals, no demo measurements
export const initialRecords: PersonalRecord[] = [];

export const initialSessions: WorkoutSession[] = [];

export const initialGoals: Goal[] = [];

export const initialMeasurements: BodyMeasurement[] = [];

