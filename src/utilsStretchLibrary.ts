import {
  BodyPart,
  Exercise,
  ExerciseDifficulty,
  MuscleGroup,
  StretchItem,
} from './types';
import { ALL_INDIVIDUAL_STRETCHES } from './data/stretchesData';

// ---------------------------------------------------------------
// Bibliothèque UNIFIÉE — étirements individuels dans la bibliothèque
// principale des exercices.
//
// Aucune donnée n'est dupliquée : ce module traduit UNIQUEMENT les 113
// StretchItem sources (src/data/stretchesData.ts) en entrées compatibles
// avec le modèle Exercise de la bibliothèque, via des champs de mise en
// forme (muscle, zone, catégorie, équipement...) DERIVÉS de la source.
// La source de vérité reste stretchesData ; les presets (12) ne sont PAS
// transformés en exercices individuels.
// ---------------------------------------------------------------

// Règles de classement d'une cible (targetArea) → champs filtrables du modèle
// exercice. Ordre important pour les cibles composées ("Biceps & Avant-bras",
// "Dos & Hanches", "Fessiers & Hanches"...).
const STRETCH_AREA_RULES: {
  key: string;
  muscle: string;
  group: MuscleGroup;
  bodyPart: BodyPart | string;
}[] = [
  { key: 'quadriceps', muscle: 'Quadriceps', group: 'Jambes', bodyPart: 'Jambes & Fessiers' },
  { key: 'ischio', muscle: 'Ischio-jambiers', group: 'Jambes', bodyPart: 'Jambes & Fessiers' },
  { key: 'mollet', muscle: 'Mollets', group: 'Jambes', bodyPart: 'Jambes & Fessiers' },
  { key: 'fessier', muscle: 'Fessiers', group: 'Jambes', bodyPart: 'Jambes & Fessiers' },
  { key: 'adducteur', muscle: 'Adducteurs', group: 'Jambes', bodyPart: 'Jambes & Fessiers' },
  { key: 'lombaire', muscle: 'Lombaires', group: 'Dos', bodyPart: 'Abdominaux & Tronc' },
  { key: 'cheville', muscle: 'Chevilles', group: 'Jambes', bodyPart: 'Jambes & Fessiers' },
  { key: 'genou', muscle: 'Genoux', group: 'Jambes', bodyPart: 'Jambes & Fessiers' },
  { key: 'pector', muscle: 'Pectoraux', group: 'Pectoraux', bodyPart: 'Pectoraux' },
  { key: 'trapèze', muscle: 'Dos', group: 'Dos', bodyPart: 'Dos' },
  { key: 'dos', muscle: 'Dos', group: 'Dos', bodyPart: 'Dos' },
  { key: 'épaule', muscle: 'Épaules', group: 'Épaules', bodyPart: 'Épaules' },
  { key: 'triceps', muscle: 'Triceps', group: 'Bras', bodyPart: 'Bras' },
  { key: 'biceps', muscle: 'Biceps', group: 'Bras', bodyPart: 'Bras' },
  { key: 'avant-bras', muscle: 'Avant-bras', group: 'Bras', bodyPart: 'Bras' },
  { key: 'poignet', muscle: 'Poignets', group: 'Bras', bodyPart: 'Bras' },
  { key: 'coude', muscle: 'Coudes', group: 'Bras', bodyPart: 'Bras' },
  { key: 'cou', muscle: 'Cou', group: 'Épaules', bodyPart: 'Articulations & Mobilité' },
  { key: 'oblique', muscle: 'Abdominaux', group: 'Abdos', bodyPart: 'Abdominaux & Tronc' },
  { key: 'tronc', muscle: 'Abdominaux', group: 'Abdos', bodyPart: 'Abdominaux & Tronc' },
  { key: 'abdo', muscle: 'Abdominaux', group: 'Abdos', bodyPart: 'Abdominaux & Tronc' },
  { key: 'hanche', muscle: 'Hanches', group: 'Jambes', bodyPart: 'Jambes & Fessiers' },
];

const FALLBACK_AREA = { muscle: 'Mobilité générale', group: 'Full Body' as MuscleGroup, bodyPart: 'Articulations & Mobilité' as BodyPart | string };

function classifyArea(area: string) {
  const a = area.toLowerCase();
  const rule = STRETCH_AREA_RULES.find((r) => a.includes(r.key));
  if (rule) return { muscle: rule.muscle, group: rule.group, bodyPart: rule.bodyPart };
  return { ...FALLBACK_AREA };
}

export interface StretchLibraryItem extends Exercise {
  kind: 'stretch';
  stretch: StretchItem;
  // Champ prétraité pour la recherche instantanée (nom + zone + consigne + mot-clé).
  searchText: string;
}

export type UnifiedLibraryItem =
  | (Exercise & { kind: 'exercise' })
  | StretchLibraryItem;

function toLibraryItem(s: StretchItem): StretchLibraryItem {
  const cls = classifyArea(s.targetArea);
  return {
    kind: 'stretch',
    id: s.id,
    name: s.name,
    primaryMuscle: cls.muscle,
    secondaryMuscles: [],
    bodyPart: cls.bodyPart,
    equipment: 'Aucun matériel',
    difficulty: 'Débutant' as ExerciseDifficulty,
    category: 'Étirements',
    description: s.instruction,
    instructions: [s.instruction],
    defaultSets: 1,
    defaultReps: `${s.durationSec}s`,
    defaultRestSec: 0,
    muscleGroup: cls.group,
    stretch: s,
    searchText: `${s.name} ${s.targetArea} ${s.instruction} étirement ${cls.muscle}`,
  };
}

// Les 113 étirements individuels intégrés dans la bibliothèque principale.
// Calculé une seule fois au chargement (liste statique, aucune dépendance
// lourde, aucune recréation par rendu).
export const STRETCH_LIBRARY_ITEMS: StretchLibraryItem[] =
  ALL_INDIVIDUAL_STRETCHES.map(toLibraryItem);

export const STRETCH_LIBRARY_COUNT = STRETCH_LIBRARY_ITEMS.length;