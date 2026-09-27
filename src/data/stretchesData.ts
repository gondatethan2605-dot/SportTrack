import { StretchItem, DayOfWeek, MuscleGroup } from '../types';

export const CORE_STRETCHES: StretchItem[] = [
  {
    id: 'stretch-cobra',
    name: 'Étirement cobra (abdos)',
    targetArea: 'Abdos',
    durationSec: 30,
    hasSides: false,
    instruction:
      'Allongé sur le ventre, pousse sur les bras pour lever le buste, bassin au sol, sans forcer.',
  },
  {
    id: 'stretch-lying-twist',
    name: 'Torsion couchée (obliques)',
    targetArea: 'Obliques',
    durationSec: 30,
    hasSides: true,
    sideType: 'side',
    instruction:
      'Allongé sur le dos, genoux pliés vers un côté, épaules au sol, tête tournée à l\'opposé.',
  },
  {
    id: 'stretch-child-pose',
    name: 'Étirement enfant (dos/abdos)',
    targetArea: 'Dos & Abdos',
    durationSec: 30,
    hasSides: false,
    instruction:
      'Assis sur les talons, buste penché en avant, bras tendus devant.',
  },
];

export const LOWER_BODY_STRETCHES: StretchItem[] = [
  {
    id: 'stretch-quads-standing',
    name: 'Étirement quadriceps debout',
    targetArea: 'Quadriceps',
    durationSec: 30,
    hasSides: true,
    sideType: 'leg',
    instruction:
      'Debout, attrape la cheville derrière toi, genoux collés, tire doucement le talon vers la fesse.',
  },
  {
    id: 'stretch-hamstrings',
    name: 'Étirement ischio-jambiers',
    targetArea: 'Ischio-jambiers',
    durationSec: 30,
    hasSides: true,
    sideType: 'leg',
    instruction:
      'Assis ou debout, jambe tendue, penche le buste vers l\'avant sans arrondir excessivement le dos.',
  },
  {
    id: 'stretch-calves-wall',
    name: 'Étirement mollets contre un mur',
    targetArea: 'Mollets',
    durationSec: 30,
    hasSides: true,
    sideType: 'leg',
    instruction:
      'Une jambe en arrière tendue, talon au sol, penche-toi doucement vers le mur.',
  },
  {
    id: 'stretch-glutes-figure4',
    name: 'Étirement fessiers figure 4',
    targetArea: 'Fessiers',
    durationSec: 30,
    hasSides: true,
    sideType: 'side',
    instruction:
      'Allongé sur le dos, croise une cheville sur le genou opposé et tire la jambe vers la poitrine.',
  },
];

export const UPPER_BODY_STRETCHES: StretchItem[] = [
  {
    id: 'stretch-chest-wall',
    name: 'Étirement pectoraux',
    targetArea: 'Pectoraux',
    durationSec: 30,
    hasSides: true,
    sideType: 'side',
    instruction:
      'Avant-bras contre un mur ou un chambranle, coude à 90°, tourne doucement le buste à l\'opposé.',
  },
  {
    id: 'stretch-back-cross-arm',
    name: 'Étirement dos bras tendu croisé',
    targetArea: 'Dos & Épaules',
    durationSec: 30,
    hasSides: true,
    sideType: 'arm',
    instruction:
      'Bras tendu devant, tire-le vers la poitrine avec l\'autre bras.',
  },
  {
    id: 'stretch-triceps-overhead',
    name: 'Étirement triceps',
    targetArea: 'Triceps',
    durationSec: 30,
    hasSides: true,
    sideType: 'arm',
    instruction:
      'Bras plié derrière la tête, pousse doucement le coude vers l\'arrière avec l\'autre main.',
  },
  {
    id: 'stretch-biceps-forearms',
    name: 'Étirement biceps / avant-bras',
    targetArea: 'Biceps & Avant-bras',
    durationSec: 20,
    hasSides: true,
    sideType: 'arm',
    instruction:
      'Bras tendu devant, paume vers le haut, tire doucement les doigts vers le bas avec l\'autre main.',
  },
  {
    id: 'stretch-shoulders-cross',
    name: 'Étirement épaules bras croisé',
    targetArea: 'Épaules',
    durationSec: 20,
    hasSides: true,
    sideType: 'arm',
    instruction:
      'Bras tendu devant le corps, tire-le vers la poitrine avec l\'autre bras.',
  },
];

export const ALL_STRETCH_PRESETS = [
  {
    id: 'preset-core',
    name: 'Core (Lundi & Jeudi)',
    days: ['Lundi', 'Jeudi'],
    target: 'Abdos / Obliques / Tronc',
    stretches: CORE_STRETCHES,
  },
  {
    id: 'preset-lower',
    name: 'Bas du Corps (Mardi & Vendredi)',
    days: ['Mardi', 'Vendredi'],
    target: 'Quadriceps / Ischios / Mollets / Fessiers',
    stretches: LOWER_BODY_STRETCHES,
  },
  {
    id: 'preset-upper',
    name: 'Haut du Corps (Mercredi & Samedi)',
    days: ['Mercredi', 'Samedi'],
    target: 'Pectoraux / Dos / Triceps / Biceps / Épaules',
    stretches: UPPER_BODY_STRETCHES,
  },
];

/**
 * Automatically determine the proper stretching routine according to day of week or muscle group
 */
export function getDefaultStretchesForDay(
  dayOfWeek?: DayOfWeek | string,
  sessionName?: string,
  muscleGroups?: MuscleGroup[]
): StretchItem[] {
  const dow = (dayOfWeek || '').toLowerCase();
  const name = (sessionName || '').toLowerCase();
  const mg = (muscleGroups || []).map((m) => m.toLowerCase());

  // 1. Check exact day of week
  if (dow.includes('lundi') || dow.includes('jeudi')) {
    return CORE_STRETCHES;
  }
  if (dow.includes('mardi') || dow.includes('vendredi')) {
    return LOWER_BODY_STRETCHES;
  }
  if (dow.includes('mercredi') || dow.includes('samedi')) {
    return UPPER_BODY_STRETCHES;
  }

  // 2. Check session title keywords
  if (name.includes('core') || name.includes('abdo') || name.includes('tronc')) {
    return CORE_STRETCHES;
  }
  if (
    name.includes('legs') ||
    name.includes('bas du corps') ||
    name.includes('jambes') ||
    name.includes('lower') ||
    name.includes('cuisses')
  ) {
    return LOWER_BODY_STRETCHES;
  }
  if (
    name.includes('upper') ||
    name.includes('haut du corps') ||
    name.includes('push') ||
    name.includes('pull') ||
    name.includes('pec') ||
    name.includes('bras') ||
    name.includes('épaules') ||
    name.includes('dos')
  ) {
    return UPPER_BODY_STRETCHES;
  }

  // 3. Check muscle groups
  if (mg.includes('abdos') && !mg.includes('jambes') && !mg.includes('pectoraux')) {
    return CORE_STRETCHES;
  }
  if (mg.includes('jambes')) {
    return LOWER_BODY_STRETCHES;
  }
  if (mg.includes('pectoraux') || mg.includes('dos') || mg.includes('épaules') || mg.includes('bras')) {
    return UPPER_BODY_STRETCHES;
  }

  // Default to Upper Body or Core
  return UPPER_BODY_STRETCHES;
}
