export type NavPage =
  | 'accueil'
  | 'programme'
  | 'exercices'
  | 'etirements'
  | 'seance'
  | 'calendrier'
  | 'statistiques'
  | 'objectifs'
  | 'progression'
  | 'profil'
  | 'parametres';

export interface UserProfile {
  name: string;
  level: number;
  currentXp: number;
  nextLevelXp: number;
  streakDays: number;
  bestStreak: number;
  weeklyTargetSessions: number;
  weeklyCompletedSessions: number;
  totalWorkouts: number;
  totalVolumeKg: number;
  joinedDate: string;
}

export type MuscleGroup =
  | 'Pectoraux'
  | 'Dos'
  | 'Épaules'
  | 'Bras'
  | 'Jambes'
  | 'Abdos'
  | 'Full Body'
  | 'Cardio';

export type TargetMuscle =
  | 'Pectoraux'
  | 'Dos'
  | 'Épaules'
  | 'Biceps'
  | 'Triceps'
  | 'Avant-bras'
  | 'Abdominaux'
  | 'Quadriceps'
  | 'Ischio-jambiers'
  | 'Fessiers'
  | 'Mollets'
  | 'Adducteurs'
  | 'Abducteurs'
  | 'Lombaires'
  | 'Cou'
  | 'Poignets'
  | 'Coudes'
  | 'Hanches'
  | 'Genoux'
  | 'Chevilles'
  | 'Mobilité générale';

export type BodyPart =
  | 'Pectoraux'
  | 'Dos'
  | 'Épaules'
  | 'Bras'
  | 'Jambes & Fessiers'
  | 'Abdominaux & Tronc'
  | 'Articulations & Mobilité'
  | 'Cardio';

export type EquipmentType =
  | 'Poids du corps'
  | 'Haltères'
  | 'Barre'
  | 'Banc'
  | 'Élastiques'
  | 'Kettlebell'
  | 'Machines'
  | 'Poulie'
  | 'Barre de traction'
  | 'Cardio'
  | 'Mobilité'
  | 'Étirements'
  | 'Autre';

export type ExerciseDifficulty = 'Débutant' | 'Intermédiaire' | 'Avancé' | 'Tous niveaux';

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscles?: string[];
  bodyPart: BodyPart | string;
  equipment: EquipmentType | string;
  difficulty: ExerciseDifficulty;
  category: 'Musculation' | 'Poids du corps' | 'Cardio' | 'Mobilité & Étirements' | 'Étirements';
  description: string;
  instructions?: string[];
  commonMistakes?: string[];
  tips?: string[];
  variants?: string[];
  similarExerciseIds?: string[];
  defaultSets: number;
  defaultReps: number | string;
  defaultRestSec: number;
  muscleGroup?: MuscleGroup; // backward compatibility
  isCustom?: boolean;
  isFavorite?: boolean;
}

export type ExerciseMode = 'reps' | 'timer';

export interface ProgramExerciseConfig {
  id: string; // unique ID in day config
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number | string;
  mode?: ExerciseMode;
  durationSec?: number;
  // Per-series independent objectives (mode 'reps' -> repsPlan, mode 'timer' -> durationPlan).
  // Both are kept independently; switching mode never overwrites the other plan.
  repsPlan?: (number | string)[];
  durationPlan?: number[];
  // Per-series rest AFTER each set (rest BETWEEN two sets of the same exercise).
  // restPlan[i] = rest after set i+1. Independent from the legacy restSec (which
  // stays the fallback + compat for old programs) and from transitionRestSec
  // (rest AFTER the last set, before the next exercise). The last set's rest is
  // resolved through transitionRestSec when a next exercise exists.
  restPlan?: number[];
  targetWeightKg: number;
  restSec: number;
  transitionRestSec?: number;
  notes?: string;
  // F.1 — Group membership (superset / circuit).
  // Optionnel : absent sur les anciens programmes, inexistant = exercice isolé.
  groupId?: string;
  groupType?: 'superset' | 'circuit';
}

export type StretchSideType = 'side' | 'leg' | 'arm';

export interface StretchItem {
  id: string;
  name: string;
  targetArea: string;
  durationSec: number;
  hasSides?: boolean;
  sideType?: StretchSideType;
  instruction: string;
}

export type DayOfWeek =
  | 'Lundi'
  | 'Mardi'
  | 'Mercredi'
  | 'Jeudi'
  | 'Vendredi'
  | 'Samedi'
  | 'Dimanche'
  | 'Flexible';

export interface WorkoutProgramDay {
  id: string;
  name: string;
  dayOfWeek?: DayOfWeek | string;
  scheduledTime?: string; // e.g. "18:00"
  muscleGroups: MuscleGroup[];
  exerciseIds: string[]; // backward compatible ID array
  exercises?: ProgramExerciseConfig[]; // full rich configuration
  stretches?: StretchItem[]; // End-of-session stretching routine
  notes?: string;
  // F.1 — Groupes superset/circuit (optionnel, F.1-A).
  // Absent sur les anciens programmes = aucun groupe.
  groups?: ProgramExerciseGroup[];
}

export interface WorkoutProgram {
  id: string;
  title: string;
  description: string;
  type?: 'fixed' | 'flexible'; // fixed weekly schedule vs flexible cycles
  daysPerWeek: number;
  level: ExerciseDifficulty;
  isActive: boolean;
  color: string;
  days: WorkoutProgramDay[];
  // LOT D — Programme système (ex: MY_PROGRAM v2) : non supprimable, non modifiable en structure
  // L'interface ne doit PAS permettre de supprimer un programme isSystem.
  isSystem?: boolean;
  // Flag optionnel pour marquer un programme comme protégé (utilisateur ne peut pas le supprimer)
  isProtected?: boolean;
}

export interface WorkoutSet {
  setNumber: number;
  weightKg: number;
  reps: number;
  mode?: ExerciseMode;
  durationSec?: number;
  completed: boolean;
  rpe?: number;
}

export interface SessionExerciseLog {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup | string;
  sets: WorkoutSet[];
  restSec?: number;
  restPlan?: number[];
  transitionRestSec?: number;
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  title: string;
  programId?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  completed: boolean;
  totalVolumeKg: number;
  exercises: SessionExerciseLog[];
  stretchesCompleted?: boolean;
  stretchesCount?: number;
  guided?: boolean; // LOT 4 — true when the session was completed in guided mode
  feeling?: '🔥 Top forme' | '⚡ Normal' | '😴 Difficile' | '💪 Puissant';
  notes?: string;
}

// Guided-session settings (audio / vibration / voice / music / countdown).
// Live state only: never persisted as history, never part of a saved WorkoutSession.
export interface GuidedSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  voiceEnabled: boolean;
  countdownEnabled: boolean;
  musicEnabled: boolean;
  musicVolume: number; // 0..1
  exerciseTransitionRestSec: number; // rest between exercises (global default)
}

// Visual appearance (LOT 6, item 16): UI theme mode and brand accent. Stored in
// the same localStorage settings object, so no IndexedDB migration is required.
// 'system' follows the OS preference (resolved at runtime by App.tsx).
export type ThemeMode = 'dark' | 'light' | 'system';
export type AccentColor = 'violet' | 'blue' | 'green' | 'orange' | 'red' | 'rose';

// App-wide, user-selectable workout preferences (LOT H). Stored in localStorage
// under the 'sporttrack-settings' key — never in IndexedDB, so DB_VERSION stays
// unchanged and no migration is ever required. These are GLOBAL defaults that
// seed NEW guided sessions; an already-started session keeps its own state.
export interface WorkoutSettings {
  soundEnabled: boolean; // session sounds (the existing audio engine)
  voiceEnabled: boolean; // voice announcements (the existing speechSynthesis)
  vibrationEnabled: boolean; // vibration cues (the existing vibration engine)
  defaultRestSec: number; // default rest for new sessions/configs (30/60/90/120/...)
  exerciseTransitionRestSec: number; // rest BETWEEN exercises (15/30/45/60/75/90/120)
  units: 'metric'; // display-only preference; internal data stays canonical
  animationsEnabled: boolean; // display: animations on / reduced
  themeMode: ThemeMode; // display: dark / light / follow the OS preference
  accentColor: AccentColor; // display: brand accent (violet/blue/green/orange/red/rose)
  dashboardBlocks: string[]; // display: ordered, visible dashboard blocks (LOT 6, item 18)
  // LOT 6 — item 17: sound & vibration feedback detail (applies to the shared
  // audio/vibration engines used by both classic and guided sessions).
  feedbackVolume: number; // 0..1 loudness multiplier for the workout cue sounds
  seriesFeedbackEnabled: boolean; // set start / set end cues
  restFeedbackEnabled: boolean; // rest start / rest end cues
  countdownFeedbackEnabled: boolean; // countdown ticks (sound + vibration)
  workoutEndFeedbackEnabled: boolean; // session-completed cue
  recordFeedbackEnabled: boolean; // genuine new personal record cue
}

// Additive (optional) guided-mode checkpoint stored in the auto-saved draft so a
// reload resumes exactly where the guided session was (step, phase, rest timer).
export interface WorkoutDraftGuided {
  enabled: boolean;
  phase: 'prep' | 'countdown' | 'exercise' | 'rest' | 'stretch' | 'pause' | 'completed';
  stepIndex: number;
  restSec: number;
  settings: GuidedSettings;
  timerRemaining: number;
  resumePhase?: 'countdown' | 'exercise' | 'rest' | 'stretch';
}

// Auto-saved snapshot of an in-progress session ("active_draft" in the
// sessionDrafts store, DB v8). Used to survive reloads / accidental navigation.
export interface WorkoutDraft {
  id: string; // 'active_draft'
  title: string;
  exercises: SessionExerciseLog[];
  elapsedSeconds: number;
  isTimerRunning: boolean;
  feeling: '🔥 Top forme' | '⚡ Normal' | '😴 Difficile' | '💪 Puissant';
  notes: string;
  phase: 'musculation' | 'stretching' | 'summary';
  completedStretchesCount: number;
  currentStretchIdx: number;
  currentSideIndex: 1 | 2;
  updatedAt: string;
  guided?: WorkoutDraftGuided;
  restSecondsLeft?: number | null;
  activeTimedSet?: { exIndex: number; setIndex: number } | null;
  timedSecondsLeft?: number;
}

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  date: string;
  previousWeightKg?: number;
}

// Direction of a goal: 'perte' (initialValue > targetValue, e.g. losing weight)
// or 'gain' (initialValue < targetValue, e.g. gaining strength). Legacy goals
// created before V7.8 carry no direction / initialValue and are treated as
// 'gain' with the historic current/target ratio for display.
export type GoalDirection = 'perte' | 'gain';

// The real SportTrack metric a "goal" tracks. Legacy goals (created before the
// smart-goals system) carry no goalMetric and keep the historic display logic.
// Only added categories are present: duration is stored/compared in seconds and
// is never converted to/from reps.
export type GoalMetric =
  | 'reps'
  | 'duration'
  | 'sessions'
  | 'xp'
  | 'streak'
  | 'record'
  | 'weight'
  | 'frequency'
  | 'custom';

// One point of a goal's tracked history (derived from real SportTrack data).
export interface GoalMeasurement {
  date: string; // YYYY-MM-DD
  value: number; // in the goal's own unit (seconds for duration, count for reps/...)
}

export interface Goal {
  id: string;
  title: string;
  category: 'frequency' | 'record' | 'weight' | 'custom';
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline?: string;
  completed: boolean;
  createdAt: string;
  direction?: GoalDirection;
  initialValue?: number;
  // ----- LOT F additive (optional; absent on legacy goals) -----
  goalMetric?: GoalMetric;
  measurementHistory?: GoalMeasurement[];
  description?: string;
  // For reps/duration/record goals: which exercise is tracked (real best data).
  exerciseId?: string;
  exerciseName?: string;
}

export interface BodyMeasurement {
  id: string;
  date: string;
  weightKg: number;
  bodyFatPercent?: number;
  chestCm?: number;
  armsCm?: number;
  waistCm?: number;
  thighsCm?: number;
  notes?: string;
}

export interface ExercisePerformanceSet {
  setNumber: number;
  weightKg: number;
  reps: number;
  mode: ExerciseMode;
  durationSec: number;
  completed: boolean;
}

// One entry per exercise per completed session (id = `${sessionId}-${exerciseId}`).
export interface ExercisePerformance {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sessionId: string;
  sessionTitle: string;
  date: string;
  mode: ExerciseMode;
  setsPlanned: number;
  setsCompleted: number;
  totalReps: number;
  totalDurationSec: number;
  totalVolumeKg: number;
  weightUsedKg: number;
  sets: ExercisePerformanceSet[];
  bestSet: {
    setNumber: number;
    weightKg: number;
    reps: number;
    durationSec?: number;
  } | null;
}

export interface ExerciseBestMetric {
  value: number;
  reps?: number;
  weightKg?: number;
  date: string;
}

export interface ExerciseBest {
  exerciseId: string;
  exerciseName: string;
  bestWeightKg: ExerciseBestMetric | null;
  bestReps: ExerciseBestMetric | null;
  bestVolumeKg: ExerciseBestMetric | null;
  bestDurationSec: ExerciseBestMetric | null;
  lastPerformedDate: string | null;
  timesPerformed: number;
  updatedAt: string;
}

export interface ProgramExerciseGroup {
  id: string;
  type: 'superset' | 'circuit';
  rounds?: number;
  restBetweenExercisesSec?: number;
  restBetweenRoundsSec?: number;
}

export interface ExercisesPageProps {
  exercises: Exercise[];
  exercisePerformances: ExercisePerformance[];
  exerciseBests: ExerciseBest[];
  programs: WorkoutProgram[];
  programUsage: Record<string, number>;
  onAddExercise: (exercise: Exercise) => void;
  onUpdateExercise: (exercise: Exercise) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onToggleFavorite: (exerciseId: string) => void;
  onAddExerciseToProgram: (exercise: Exercise, programId: string, dayId: string) => void;
  initialFilter: string;
}
