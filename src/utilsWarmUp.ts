// ----------------------------------------------------------------------------
// LOT 9 — Item 9.6 : échauffement / retour au calme.
// Pure, presentational ONLY: a static, default warm-up routine suggestion keyed
// by muscle group and a cooldown label helper. Nothing here is persisted, no XP
// is affected and no exercise catalogue is required. The actual session never
// depends on this data (it only decorates the UI).
// ----------------------------------------------------------------------------

export interface WarmUpItem {
  id: string;
  title: string;
  detail: string;
  durationSec: number;
}

export interface WarmUpSuggestion {
  summary: string;
  items: WarmUpItem[];
}

const GENERIC_ROTATION: WarmUpItem[] = [
  { id: 'w-cervicales', title: 'Rotation des cervicales', detail: '4 rotations par sens, lentes.', durationSec: 30 },
  { id: 'w-epaules', title: 'Cercles d’épaules', detail: '10 cercles avant, 10 arrière.', durationSec: 20 },
  { id: 'w-bassins', title: 'Cercles de bassin', detail: '8 cercles par sens.', durationSec: 20 },
  { id: 'w-cardio', title: 'Activation cardio légère', detail: 'Jumping jacks ou montées de genoux à rythme modéré.', durationSec: 60 },
];

const MUSCLE_WARMUPS: Record<string, WarmUpItem[]> = {
  Pectoraux: [
    { id: 'w-pec-stretch', title: 'Étirements thoraciques dynamiques', detail: 'Ouverture de poitrine dos à un support.', durationSec: 30 },
    { id: 'w-pec-pump', title: 'Pompes au sol lentes (série de réveil)', detail: '8 à 10 pompes complètes et lentes.', durationSec: 30 },
  ],
  Dos: [
    { id: 'w-back-cat', title: 'Chat / vache', detail: '8 cycles lents, colonne mobile.', durationSec: 30 },
    { id: 'w-back-row', title: 'Rétractions d’omoplates', detail: '12 rétractions contrôlées.', durationSec: 30 },
  ],
  Abdos: [
    { id: 'w-core-dead', title: 'Dead bug', detail: '8 répétitions par côté, dos plaqué.', durationSec: 40 },
    { id: 'w-core-plank', title: 'Planche courte', detail: '20 secondes, gainage éveillé.', durationSec: 20 },
  ],
  Jambes: [
    { id: 'w-leg-swing', title: 'Balançoirs de jambe', detail: '10 par jambe, amplitude progressive.', durationSec: 40 },
    { id: 'w-leg-squat', title: 'Squats au poids du corps', detail: '10 squats complets, talons ancrés.', durationSec: 30 },
  ],
};

const SYNONYMS: Record<string, string> = {
  'Abdominaux': 'Abdos',
  'Épaules': 'Pectoraux',
  Triceps: 'Pectoraux',
  Biceps: 'Dos',
  'Ischio-jambiers': 'Jambes',
  Quadriceps: 'Jambes',
  Mollets: 'Jambes',
  Fessiers: 'Jambes',
};

const DEFAULT_CARDIO: WarmUpItem = {
  id: 'w-cardio-light',
  title: 'Activation cardio 2 min',
  detail: 'Marche rapide ou vélo léger, sans essoufflement.',
  durationSec: 120,
};

// Default warm-up suggestion for the muscle groups of the day. Always returns a
// finite list (generic rotation + per-muscle items + light cardio), keyed on the
// primary muscles only — it is a UI hint, never instructions to be executed by
// the data model.
export function buildWarmUpSuggestion(muscleGroups: (string | undefined)[] = []): WarmUpSuggestion {
  const names = (muscleGroups || []).filter(Boolean) as string[];
  const items: WarmUpItem[] = [...GENERIC_ROTATION];

  const focused = new Set<string>();
  for (const raw of names) {
    const key = SYNONYMS[raw] || raw;
    if (key && MUSCLE_WARMUPS[key]) {
      for (const item of MUSCLE_WARMUPS[key]) {
        if (!focused.has(item.id)) {
          focused.add(item.id);
          items.push(item);
        }
      }
    }
  }

  if (names.length > 0) items.push(DEFAULT_CARDIO);

  return {
    summary: names.length > 0 ? `Échauffement suggéré — ${names.join(' · ')}` : 'Échauffement général suggéré',
    items,
  };
}

export function warmUpTotalDuration(suggestion: WarmUpSuggestion): number {
  return suggestion.items.reduce((acc, i) => acc + i.durationSec, 0);
}

// i18n labels reused at the UI level (kept here so tests can pin them).
export const WARM_UP_LABEL = 'Échauffement';
export const COOL_DOWN_LABEL = 'Retour au calme & étirements';

// Cooldown hint (presentational, no logic): lengthened after a muscle session.
export function cooldownHint(hasExercises: boolean): string {
  return hasExercises
    ? 'Étirements doux et respiration calme pour relâcher les groupes travaillés.'
    : 'Étirements généraux et respiration calme.';
}