import { WorkoutProgram, ProgramExerciseConfig, ExerciseMode } from '../types';
import { CORE_STRETCHES, LOWER_BODY_STRETCHES } from './stretchesData';

// Straight sets: every set of an exercise is completed before moving to the
// next exercise. Reps-mode configs carry a per-set repsPlan; timer-mode configs
// carry a per-set durationPlan. targetWeightKg is always 0 (bodyweight).
const repsCfg = (
  id: string,
  exerciseId: string,
  exerciseName: string,
  sets: number,
  reps: number,
  restSec: number,
  notes = ''
): ProgramExerciseConfig => ({
  id,
  exerciseId,
  exerciseName,
  sets,
  reps,
  mode: 'reps' as ExerciseMode,
  durationSec: 0,
  repsPlan: Array.from({ length: sets }, () => reps),
  durationPlan: Array.from({ length: sets }, () => 0),
  targetWeightKg: 0,
  restSec,
  notes,
});

const timerCfg = (
  id: string,
  exerciseId: string,
  exerciseName: string,
  sets: number,
  durationSec: number,
  restSec: number,
  notes = ''
): ProgramExerciseConfig => ({
  id,
  exerciseId,
  exerciseName,
  sets,
  reps: `${durationSec} sec`,
  mode: 'timer' as ExerciseMode,
  durationSec,
  repsPlan: Array.from({ length: sets }, () => `${durationSec} sec`),
  durationPlan: Array.from({ length: sets }, () => durationSec),
  targetWeightKg: 0,
  restSec,
  notes,
});

// CORE COMPLET — foncièrement identique pour tous ses jours (Lundi, Mercredi, Vendredi).
// Chaque exercice porte son propre repos APRÈS l'exercice (transitionRestSec) :
// montées de genoux 15, tous les exercices du cœur 30, et 0 (aucune transition)
// pour la Planche, dernier exercice avant les étirements (le repos inter-étirements
// du mode guidé gère ensuite la bascule vers la phase d'étirements).
const CORE_REST = [15, 30, 30, 30, 30, 30, 0];

const baseCore = (prefix: string): ProgramExerciseConfig[] => [
  timerCfg(`cfg-${prefix}-1`, 'ex-high-knees', 'Montées de genoux sur place', 1, 30, 15, 'Échauffement : cours sur place, genoux à hauteur de hanche, bras pliés qui ne montent pas au-dessus des épaules.'),
  repsCfg(`cfg-${prefix}-2`, 'ex-pelvic-lift', 'Relevé de bassin', 4, 15, 30, 'Jambes tendues vers le plafond, décolle le bassin sans élan.'),
  timerCfg(`cfg-${prefix}-3`, 'ex-leg-flutters', 'Battements de jambes', 4, 50, 30, 'Bas du dos plaqué au sol en permanence.'),
  timerCfg(`cfg-${prefix}-4`, 'ex-scissors', 'Ciseaux', 4, 50, 30, 'Amplitude contrôlée, pas de rebond.'),
  repsCfg(`cfg-${prefix}-5`, 'ex-oblique-crunch', 'Crunch oblique', 4, 15, 30, 'Allongé sur le dos, genoux pliés, mains derrière la tête sans tirer sur la nuque. Monte en diagonale en amenant le coude droit vers le genou gauche, redescends, alterne. 15 reps par côté.'),
  repsCfg(`cfg-${prefix}-6`, 'ex-russian-twist', 'Russian twist sans poids', 4, 20, 30, 'Assis, buste incliné à 45° (dos droit), pieds légèrement décollés, touche le sol de chaque côté avec les mains jointes. 20 reps, soit 10 par côté. La rotation vient du buste, pas des bras.'),
  timerCfg(`cfg-${prefix}-7`, 'ex-plank-bodyweight', 'Planche', 4, 45, 30, 'Appui sur avant-bras, dos plat, ne pas cambrer ni casser le dos.'),
];

const buildCore = (prefix: string): ProgramExerciseConfig[] =>
  baseCore(prefix).map((cfg, i) => ({ ...cfg, transitionRestSec: CORE_REST[i] }));

// BAS DU CORPS COMPLET — foncièrement identique pour tous ses jours (Mardi, Jeudi, Samedi).
// Repos du document : montées 15, squats/fentes/pont 30, mollets 20, chaise 30,
// GHR 30 ; transition nulle pour le GHR (dernier exercice avant les étirements).
const LOWER_REST = [15, 30, 30, 30, 20, 30, 0];

const baseLower = (prefix: string): ProgramExerciseConfig[] => [
  timerCfg(`cfg-${prefix}-1`, 'ex-high-knees', 'Montées de genoux sur place', 1, 30, 15, 'Échauffement : même que le Core.'),
  repsCfg(`cfg-${prefix}-2`, 'ex-bodyweight-squat', 'Squats', 5, 20, 30, 'Genoux dans l’axe des pieds, descends jusqu’à cuisses parallèles au sol.'),
  repsCfg(`cfg-${prefix}-3`, 'ex-reverse-lunges', 'Fentes arrière', 4, 20, 30, 'Genou avant à 90°, genou arrière frôle le sol. 20 reps, soit 10 par jambe.'),
  repsCfg(`cfg-${prefix}-4`, 'ex-single-leg-glute-bridge', 'Pont fessier unilatéral', 4, 12, 30, 'Une jambe tendue en l’air, pousse sur le talon de l’autre pour lever le bassin. 12 reps par jambe.'),
  repsCfg(`cfg-${prefix}-5`, 'ex-bodyweight-calf-raises', 'Élévation mollets', 5, 25, 20, 'Monte sur la pointe des pieds le plus haut possible, redescends lentement (2 s).'),
  timerCfg(`cfg-${prefix}-6`, 'ex-wall-sit', 'La chaise', 4, 45, 30, 'Dos plat contre un mur, cuisses parallèles au sol.'),
  repsCfg(`cfg-${prefix}-7`, 'ex-glute-ham-raise-floor-assisted', 'Glute Ham Raise - Reverse Lying', 4, 15, 30, 'Allongé sur le dos, jambes tendues, chevilles calées fermement sous un meuble stable. Bras croisés sur la poitrine (aucun appui sur les mains). Contracte ischios et fessiers pour tirer les talons vers toi, ce qui fait glisser le bassin vers l’avant. Reviens en contrôlant très lentement le retour (phase la plus importante).'),
];

const buildLower = (prefix: string): ProgramExerciseConfig[] =>
  baseLower(prefix).map((cfg, i) => ({ ...cfg, transitionRestSec: LOWER_REST[i] }));

// MOBILITÉ & ARTICULATIONS (Dimanche) — repos du document par exercice.
const MOBILITY_REST = [20, 15, 20, 20, 20, 20, 15, 30, 20, 15, 15, 15, 20, 0];

const buildMobility = (): ProgramExerciseConfig[] => [
  // Section épaules (version adaptée)
  repsCfg('cfg-mob-1', 'ex-wall-isometric-press', 'Pression isométrique contre le mur (coude collé au corps)', 3, 8, 20, 'Coude collé au corps (pas écarté à 90°), avant-bras contre le mur, pousse doucement sans forcer. Maintien 5 s par répétition.'),
  repsCfg('cfg-mob-2', 'ex-scapular-squeeze', 'Serré d’omoplates', 3, 12, 15, 'Bras le long du corps, serre les omoplates l’une vers l’autre 2 s puis relâche.'),
  // Section bas du dos / bassin
  repsCfg('cfg-mob-3', 'ex-90-90-hip-mobility', 'Gobelet de hanche / 90-90', 2, 8, 20, '8 reps par côté. Assis, une jambe pliée à 90° devant, l’autre à 90° sur le côté, buste droit.'),
  repsCfg('cfg-mob-4', 'ex-single-leg-glute-bridge', 'Pont fessier une jambe', 3, 12, 20, '12 reps par jambe. Une jambe tendue, pousse sur le talon de l’autre pour lever le bassin, contrôle la descente.'),
  repsCfg('cfg-mob-5', 'ex-jefferson-curl', 'Jefferson Curl à vide', 3, 8, 20, 'Enroule la colonne vertèbre par vertèbre vers le bas très lentement, puis déroule dans l’autre sens.'),
  // Section genoux
  repsCfg('cfg-mob-6', 'ex-step-down', 'Step-down contrôlé', 3, 10, 20, '10 reps par jambe. Descends d’une marche vers le sol très lentement en contrôlant, remonte.'),
  timerCfg('cfg-mob-7', 'ex-knee-isometric-extension', 'Extension isométrique', 3, 10, 15, '10 s par jambe. Assis, jambe tendue à l’horizontale, contracte le quadriceps et maintiens.'),
  repsCfg('cfg-mob-8', 'ex-sumo-squat-pause', 'Squat sumo avec pause', 3, 10, 30, 'Pieds larges, pointes vers l’extérieur, arrêt de 3 s en bas avant de remonter.'),
  // Section poignets / coudes
  repsCfg('cfg-mob-9', 'ex-finger-pushups', 'Pompage sur les doigts', 2, 8, 20, 'Position pompe mais appui sur la pulpe des doigts, genoux au sol si besoin.'),
  timerCfg('cfg-mob-10', 'ex-reverse-prayer', 'Prière inversée', 3, 20, 15, 'Dos des mains jointes devant la poitrine, monte doucement pour étirer les poignets.'),
  repsCfg('cfg-mob-11', 'ex-pronation-supination', 'Pronation / supination', 2, 12, 15, '12 reps par bras. Coude plié à 90° collé au corps, tourne l’avant-bras paume vers le haut puis vers le bas.'),
  // Section chevilles
  repsCfg('cfg-mob-12', 'ex-foot-alphabet', 'Alphabet avec le pied', 1, 26, 15, '1 série par pied — alphabet complet dessiné avec la pointe du pied.'),
  repsCfg('cfg-mob-13', 'ex-heel-toe-walk', 'Marche talons / pointes', 2, 20, 20, '20 m : 10 m sur les talons puis 10 m sur les pointes, garde l’équilibre.'),
  timerCfg('cfg-mob-14', 'ex-single-leg-balance', 'Équilibre sur une jambe', 3, 20, 15, '20 s par jambe. Yeux ouverts puis fermés si tu progresses, garde le buste stable.'),
];

// Sessions réutilisées comme « copie fonctionnelle » par leurs jours jumeaux.
const MONDAY_CORE = buildCore('core-l');
const TUESDAY_LOWER = buildLower('lower-m');
const WEDNESDAY_CORE = buildCore('core-w');
const THURSDAY_LOWER = buildLower('lower-th');
const FRIDAY_CORE = buildCore('core-f');
const SATURDAY_LOWER = buildLower('lower-sa');

export const MY_PROGRAM: WorkoutProgram = {
  id: 'prog-my-personal-bodyweight',
  title: 'Programme de Recomposition Corporelle — Poids de corps (v2)',
  description:
    'Recomposition corporelle au poids de corps (17 ans, 1,78 m, 75 kg) : perte de masse graisseuse + prise de muscle. Séances de 45 min minimum, 4-5 séries par exercice, méthode en séries droites. Planning : Core complet (Lundi, Mercredi, Vendredi), Bas du corps (Mardi, Jeudi, Samedi), Mobilité & articulations (Dimanche). Version adaptée à une épaule droite en récupération — pas de séance Haut du corps pour l\'instant.',
  type: 'fixed',
  daysPerWeek: 7,
  level: 'Tous niveaux',
  isActive: true,
  color: '#8b5cf6',
  isSystem: true,
  days: [
    {
      id: 'day-core-lundi',
      name: 'Lundi — Core complet',
      dayOfWeek: 'Lundi',
      scheduledTime: '18:00',
      muscleGroups: ['Abdos'],
      exerciseIds: MONDAY_CORE.map((c) => c.exerciseId),
      stretches: CORE_STRETCHES,
      exercises: MONDAY_CORE,
    },
    {
      id: 'day-lower-mardi',
      name: 'Mardi — Bas du corps complet',
      dayOfWeek: 'Mardi',
      scheduledTime: '18:00',
      muscleGroups: ['Jambes'],
      exerciseIds: TUESDAY_LOWER.map((c) => c.exerciseId),
      stretches: LOWER_BODY_STRETCHES,
      exercises: TUESDAY_LOWER,
    },
    {
      id: 'day-core-mercredi',
      name: 'Mercredi — Core complet',
      dayOfWeek: 'Mercredi',
      scheduledTime: '18:00',
      muscleGroups: ['Abdos'],
      exerciseIds: WEDNESDAY_CORE.map((c) => c.exerciseId),
      stretches: CORE_STRETCHES,
      // Copie fonctionnelle exacte de la séance Core du lundi.
      exercises: WEDNESDAY_CORE,
    },
    {
      id: 'day-lower-jeudi',
      name: 'Jeudi — Bas du corps complet',
      dayOfWeek: 'Jeudi',
      scheduledTime: '18:00',
      muscleGroups: ['Jambes'],
      exerciseIds: THURSDAY_LOWER.map((c) => c.exerciseId),
      stretches: LOWER_BODY_STRETCHES,
      // Copie fonctionnelle exacte de la séance Bas du corps du mardi.
      exercises: THURSDAY_LOWER,
    },
    {
      id: 'day-core-vendredi',
      name: 'Vendredi — Core complet',
      dayOfWeek: 'Vendredi',
      scheduledTime: '18:00',
      muscleGroups: ['Abdos'],
      exerciseIds: FRIDAY_CORE.map((c) => c.exerciseId),
      stretches: CORE_STRETCHES,
      // Copie fonctionnelle exacte de la séance Core du lundi.
      exercises: FRIDAY_CORE,
    },
    {
      id: 'day-lower-samedi',
      name: 'Samedi — Bas du corps complet',
      dayOfWeek: 'Samedi',
      scheduledTime: '18:00',
      muscleGroups: ['Jambes'],
      exerciseIds: SATURDAY_LOWER.map((c) => c.exerciseId),
      stretches: LOWER_BODY_STRETCHES,
      // Copie fonctionnelle exacte de la séance Bas du corps du mardi.
      exercises: SATURDAY_LOWER,
    },
    {
      id: 'day-mobility-dimanche',
      name: 'Dimanche — Mobilité & articulations',
      dayOfWeek: 'Dimanche',
      scheduledTime: '10:30',
      muscleGroups: ['Full Body'],
      exerciseIds: [
        'ex-wall-isometric-press',
        'ex-scapular-squeeze',
        'ex-90-90-hip-mobility',
        'ex-single-leg-glute-bridge',
        'ex-jefferson-curl',
        'ex-step-down',
        'ex-knee-isometric-extension',
        'ex-sumo-squat-pause',
        'ex-finger-pushups',
        'ex-reverse-prayer',
        'ex-pronation-supination',
        'ex-foot-alphabet',
        'ex-heel-toe-walk',
        'ex-single-leg-balance',
      ],
      stretches: [],
      notes: 'Mobilité & articulations : épaules, bas du dos/pelvis, genoux, poignets/coudes et chevilles.',
      exercises: buildMobility().map((cfg, i) => ({
        ...cfg,
        transitionRestSec: MOBILITY_REST[i],
      })),
    },
  ],
};