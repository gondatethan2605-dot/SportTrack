import { GOAL_METRICS } from './utilsGoals';

// ----------------------------------------------------------------------------
// LOT 9 — Item 9.1 : onboarding.
// Pure + localStorage helpers. Reuses GOAL_METRICS labels for the primary goal
// and the 4 real training focus categories as practice modes — it never invents
// a new data model, creates no Goal object and requires no DB change. Every
// localStorage access is exception-safe and window-guarded.
// ----------------------------------------------------------------------------

export const ONBOARDING_STORAGE_KEY = 'sporttrack:onboardingDone';
export const ONBOARDING_GOAL_KEY = 'sporttrack:onboardingGoal';
export const ONBOARDING_MODE_KEY = 'sporttrack:onboardingMode';

export type OnboardingGoal = 'reps' | 'duration' | 'sessions' | 'weight';
export type OnboardingMode = 'Musculation' | 'Poids du corps' | 'Cardio' | 'Mobilité & Étirements';

const GOALS: { id: OnboardingGoal; metric: string; label: string; description: string }[] = [
  { id: 'reps', metric: 'reps', label: 'Répétitions', description: 'Gagner en force et en répétitions.' },
  { id: 'duration', metric: 'duration', label: 'Durée', description: "Améliorer l'endurance et les temps de maintien." },
  { id: 'sessions', metric: 'sessions', label: 'Séances', description: 'Être régulier et garder la cadence.' },
  { id: 'weight', metric: 'weight', label: 'Poids', description: 'Augmenter les charges soulevées.' },
];

const MODES: { id: OnboardingMode; label: string; description: string }[] = [
  { id: 'Musculation', label: 'Musculation', description: 'Charges et machines, force maximale.' },
  { id: 'Poids du corps', label: 'Poids du corps', description: 'Sans matériel, mouvements fonctionnels.' },
  { id: 'Cardio', label: 'Cardio', description: 'Endurance, fréquence, dépense énergétique.' },
  { id: 'Mobilité & Étirements', label: 'Mobilité & Étirements', description: 'Souplesse, récupération et prévention.' },
];

function safeGet(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage unavailable/quota — onboarding stays non-blocking
  }
}

function isGoal(value: string | null): value is OnboardingGoal {
  return !!value && GOALS.some((g) => g.id === value);
}

function isMode(value: string | null): value is OnboardingMode {
  return !!value && MODES.some((m) => m.id === value);
}

export function isOnboardingDone(): boolean {
  return safeGet(ONBOARDING_STORAGE_KEY) === '1';
}

export function getOnboardingPreferences(): { goal: OnboardingGoal | null; mode: OnboardingMode | null } {
  const rawGoal = safeGet(ONBOARDING_GOAL_KEY);
  const rawMode = safeGet(ONBOARDING_MODE_KEY);
  return {
    goal: isGoal(rawGoal) ? rawGoal : null,
    mode: isMode(rawMode) ? rawMode : null,
  };
}

// Permanently completes onboarding and stores the chosen preferences.
export function markOnboardingDone(goal?: OnboardingGoal | null, mode?: OnboardingMode | null): void {
  safeSet(ONBOARDING_STORAGE_KEY, '1');
  if (isGoal(goal)) safeSet(ONBOARDING_GOAL_KEY, goal);
  if (isMode(mode)) safeSet(ONBOARDING_MODE_KEY, mode);
}

// Skips onboarding (marked done, no preferences recorded — never force a goal).
export function skipOnboarding(): void {
  safeSet(ONBOARDING_STORAGE_KEY, '1');
}

// The ordered steps of the welcome flow. GOAL_METRICS labels are reused for the
// goal step so the app's vocabulary never diverges.
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  choices: { id: string; label: string; description: string }[];
}

export function buildOnboardingSteps(): OnboardingStep[] {
  return [
    {
      id: 'goal',
      title: 'Quel est votre objectif principal ?',
      description:
        'Ce choix oriente simplement vos recommandations. Il n\'enregistre aucun objectif dans votre historique.',
      choices: GOALS.map((g) => ({
        id: g.id,
        label: GOAL_METRICS.find((m) => m.metric === g.metric)?.label || g.label,
        description: g.description,
      })),
    },
    {
      id: 'mode',
      title: 'Comment aimez-vous vous entraîner ?',
      description: 'Votre style de pratique préféré. Modifiable à tout moment.',
      choices: MODES.map((m) => ({ id: m.id, label: m.label, description: m.description })),
    },
  ];
}

export function isOnboardingGoalValue(value: string | null | undefined): boolean {
  return isGoal(value);
}

export function isOnboardingModeValue(value: string | null | undefined): boolean {
  return isMode(value);
}