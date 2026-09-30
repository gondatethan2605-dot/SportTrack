import { StretchItem, DayOfWeek, MuscleGroup } from '../types';
import { LIBRARY_EXPANSION_STRETCHES } from './libraryExpansion';

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

// ----------------------------------------------------------------------------
// LOT 12 — Bibliothèque individuelle d'étirements (appliquable par fiche de
// votre choix). Les presets CORE/LOWER/UPPER restent inchangés pour ne pas
// toucher aux programmes officiels ; cette liste ne sert qu'à l'exploration
// de la bibliothèque (StretchesPage).
// ----------------------------------------------------------------------------
export const ALL_INDIVIDUAL_STRETCHES: StretchItem[] = [
  // ---- Bas du corps : ischios / quadriceps / adducteurs ----
  {
    id: 'stretch-hamstring-sitting',
    name: 'Étirement ischios assis avec une jambe tendue',
    targetArea: 'Ischio-jambiers',
    durationSec: 30,
    hasSides: true,
    sideType: 'leg',
    instruction:
      'Assis, une jambe tendue, penche le buste vers le pied en gardant le dos le plus plat possible.',
  },
  {
    id: 'stretch-hamstring-wall',
    name: 'Étirement ischios jambe contre un mur',
    targetArea: 'Ischio-jambiers',
    durationSec: 30,
    hasSides: true,
    sideType: 'leg',
    instruction:
      'Allongé sur le dos, une jambe levée contre le mur, pousse doucement la jambe tendue vers soi en fléchissant la hanche.',
  },
  {
    id: 'stretch-hamstring-stair',
    name: 'Étirement ischios pied surélevé',
    targetArea: 'Ischio-jambiers',
    durationSec: 30,
    hasSides: true,
    sideType: 'leg',
    instruction:
      'Une jambe posée sur un support à hauteur de hanche, buste droit, penche-toi vers l’avant en poussant la hanche en arrière.',
  },
  {
    id: 'stretch-quads-lying',
    name: 'Étirement quadriceps allongé sur le côté',
    targetArea: 'Quadriceps',
    durationSec: 30,
    hasSides: true,
    sideType: 'side',
    instruction:
      'Allongé sur le côté, attrape la cheville au-dessus et tire le talon vers la fesse, bassin stable.',
  },
  {
    id: 'stretch-quads-wall',
    name: 'Étirement quadriceps contre le mur',
    targetArea: 'Quadriceps',
    durationSec: 30,
    hasSides: true,
    sideType: 'leg',
    instruction:
      'Debout face au mur, plie la jambe arrière et pose le dessus du pied contre le mur, genou au sol, en poussant le bassin vers l’avant.',
  },
  {
    id: 'stretch-happy-baby',
    name: 'Étirement bébé heureux',
    targetArea: 'Adducteurs',
    durationSec: 30,
    hasSides: false,
    instruction:
      'Allongé sur le dos, attrape l’extérieur de tes pieds ou mollets et tire les genoux vers les aisselles en conservant le dos plaqué au sol.',
  },
  {
    id: 'stretch-butterfly',
    name: 'Étirement papillon',
    targetArea: 'Adducteurs',
    durationSec: 30,
    hasSides: false,
    instruction:
      'Assis, plantes de pieds jointes, genoux tombants, penche doucement le buste vers les pieds sans forcer sur les genoux.',
  },
  {
    id: 'stretch-side-lunge-adductors',
    name: 'Fente latérale d’étirement des adducteurs',
    targetArea: 'Adducteurs',
    durationSec: 30,
    hasSides: true,
    sideType: 'leg',
    instruction:
      'Grand pas sur le côté, plie la jambe active et pousse la hanche en arrière, l’autre jambe tendue.',
  },
  {
    id: 'stretch-froggie-stretch',
    name: 'Étirement grenouille (adducteurs profonds)',
    targetArea: 'Adducteurs',
    durationSec: 30,
    hasSides: false,
    instruction:
      'À quatre pattes, écarte largement les genoux, pieds en arrière, et recule les hanches vers les talons en gardant le buste droit.',
  },
  {
    id: 'stretch-lizard',
    name: 'Étirement lézard (psoas et adducteurs)',
    targetArea: 'Fessiers & Hanches',
    durationSec: 30,
    hasSides: true,
    sideType: 'side',
    instruction:
      'En fente basse, abaisse le coude du côté du pied avant vers le sol en laissant la hanche arrière descendre.',
  },
  // ---- Bas du corps : fessiers / hanches ----
  {
    id: 'stretch-hip-flexor-lunge',
    name: 'Étirement fléchisseurs de hanche en fente',
    targetArea: 'Fessiers & Hanches',
    durationSec: 30,
    hasSides: true,
    sideType: 'side',
    instruction:
      'Une jambe fléchie en fente avant, genou arrière au sol, pousse le bassin vers l’avant en gardant le buste droit.',
  },
  {
    id: 'stretch-psoas-contract',
    name: 'Étirement du psoas avec contraction',
    targetArea: 'Fessiers & Hanches',
    durationSec: 20,
    hasSides: true,
    sideType: 'side',
    instruction:
      'En fente, contracte le fessier arrière pour créer une rétroversion du bassin, puis relâche et descends un peu plus bas.',
  },
  {
    id: 'stretch-hip-flexor-kneeling',
    name: 'Étirement de la hanche à genou levé',
    targetArea: 'Fessiers & Hanches',
    durationSec: 30,
    hasSides: true,
    sideType: 'side',
    instruction:
      'À genoux, monte un pied devant toi à 90°, garde le buste droit et pousse légèrement les hanches vers l’avant.',
  },
  {
    id: 'stretch-glutes-pigeon',
    name: 'Étirement fessiers du pigeon',
    targetArea: 'Fessiers',
    durationSec: 30,
    hasSides: true,
    sideType: 'side',
    instruction:
      'Tibia avant posé au sol devant toi, jambe arrière tendue, penche le buste vers l’avant en gardant les hanches de face.',
  },
  {
    id: 'stretch-glutes-piriformis',
    name: 'Étirement du piriforme assis',
    targetArea: 'Fessiers',
    durationSec: 30,
    hasSides: true,
    sideType: 'leg',
    instruction:
      'Assis, croise une cheville sur le genou opposé et penche le buste vers l’avant en appuyant doucement sur le genou levé.',
  },
  {
    id: 'stretch-glutes-standing-figure4',
    name: 'Étirement fessiers debout figure 4',
    targetArea: 'Fessiers',
    durationSec: 30,
    hasSides: true,
    sideType: 'leg',
    instruction:
      'Debout, croise une cheville sur le genou opposé, fléchis la jambe d’appui et pousse le bassin en arrière.',
  },
  {
    id: 'stretch-glutes-clamshell-stretch',
    name: 'Étirement moyen fessier allongé',
    targetArea: 'Fessiers',
    durationSec: 30,
    hasSides: true,
    sideType: 'side',
    instruction:
      'Allongé sur le dos, croise une jambe par-dessus l’autre et tire le genou croisé vers la poitrine avec les mains.',
  },
  {
    id: 'stretch-90-90',
    name: 'Étirement hanches 90/90',
    targetArea: 'Hanches',
    durationSec: 30,
    hasSides: true,
    sideType: 'side',
    instruction:
      'Assis jambes à 90°, une jambe devant et l’autre de côté, pivote lentement les genoux de l’autre côté en gardant le buste droit.',
  },
  {
    id: 'stretch-tfl-side',
    name: 'Étirement TFL / fessier moyen debout',
    targetArea: 'Fessiers & Hanches',
    durationSec: 30,
    hasSides: true,
    sideType: 'leg',
    instruction:
      'Debout, croise une jambe derrière l’autre, penche le buste du côté opposé en poussant la hanche vers l’extérieur.',
  },
  // ---- Bas du corps : mollets / chevilles ----
  {
    id: 'stretch-calf-step',
    name: 'Étirement mollet sur une marche',
    targetArea: 'Mollets',
    durationSec: 30,
    hasSides: true,
    sideType: 'leg',
    instruction:
      'Avant-pied posé sur le rebord d’une marche, laisse descendre le talon dans le vide jusqu’à sentir l’étirement.',
  },
  {
    id: 'stretch-calf-bent-knee',
    name: 'Étirement soléaire genou fléchi contre le mur',
    targetArea: 'Mollets',
    durationSec: 20,
    hasSides: true,
    sideType: 'leg',
    instruction:
      'Genou fléchi contre le mur, talon au sol, pousse le genou vers l’avant pour étirer la partie basse du mollet.',
  },
  {
    id: 'stretch-achilles-wall',
    name: 'Étirement du tendon d’Achille',
    targetArea: 'Mollets',
    durationSec: 20,
    hasSides: true,
    sideType: 'leg',
    instruction:
      'En fente contre un mur, recule légèrement le pied arrière, descends le talon au sol et pousse le genou vers l’avant.',
  },
  {
    id: 'stretch-ankle-circles',
    name: 'Cercles de cheville',
    targetArea: 'Chevilles',
    durationSec: 20,
    hasSides: true,
    sideType: 'leg',
    instruction:
      'Assis, une jambe levée, dessine de grands cercles avec la pointe du pied dans les deux sens.',
  },
  {
    id: 'stretch-tibialis',
    name: 'Étirement du jambier antérieur',
    targetArea: 'Chevilles',
    durationSec: 20,
    hasSides: true,
    sideType: 'leg',
    instruction:
      'Assis sur les talons, pointe des pieds écartée légèrement en arrière (dessus du pied au sol), recule doucement le bassin.',
  },
  {
    id: 'stretch-ankle-pump',
    name: 'Pompage de cheville (dynamique)',
    targetArea: 'Chevilles',
    durationSec: 15,
    hasSides: true,
    sideType: 'leg',
    instruction:
      'Assis, fléchis le pied vers le tibia puis pointe le pied au maximum, en alternance lente et contrôlée.',
  },
  // ---- Haut du corps : cou / trapèzes ----
  {
    id: 'stretch-neck-side',
    name: 'Étirement du cou latéral',
    targetArea: 'Cou',
    durationSec: 20,
    hasSides: true,
    sideType: 'side',
    instruction:
      'Incline la tête vers une épaule, main du même côté légèrement sur la tête, l’épaule opposée vers le bas.',
  },
  {
    id: 'stretch-neck-diagonal',
    name: 'Étirement du cou en diagonale',
    targetArea: 'Cou',
    durationSec: 20,
    hasSides: true,
    sideType: 'side',
    instruction:
      'Regarde vers ton aisselle, puis accompagne doucement la tête de la main opposée pour accentuer la torsion cervicale.',
  },
  {
    id: 'stretch-chin-tuck',
    name: 'Rétractions du menton',
    targetArea: 'Cou',
    durationSec: 15,
    hasSides: false,
    instruction:
      'Tête droite, tire le menton vers l’arrière comme pour créer un double menton, maintiens puis relâche.',
  },
  {
    id: 'stretch-trap-side',
    name: 'Étirement du trapèze supérieur',
    targetArea: 'Trapèzes',
    durationSec: 20,
    hasSides: true,
    sideType: 'side',
    instruction:
      'Incline la tête à 45° en avant, main sur le crâne, et tire doucement vers la diagonale en abaissant l’épaule opposée.',
  },
  {
    id: 'stretch-upper-traps-relax',
    name: 'Relâchement du haut des trapèzes',
    targetArea: 'Trapèzes',
    durationSec: 20,
    hasSides: false,
    instruction:
      'Debout, enroule lentement les épaules vers l’arrière puis laisse-les retomber, en étirant le haut des trapèzes vers le plafond.',
  },
  // ---- Haut du corps : poitrine / dos / épaules ----
  {
    id: 'stretch-chest-doorway',
    name: 'Étirement pectoraux dans un cadre de porte',
    targetArea: 'Pectoraux',
    durationSec: 30,
    hasSides: false,
    instruction:
      'Avant-bras en appui sur chaque montant d’un cadre, avance doucement le buste en gardant les épaules basses.',
  },
  {
    id: 'stretch-chest-lying',
    name: 'Étirement pectoraux allongé',
    targetArea: 'Pectoraux',
    durationSec: 30,
    hasSides: true,
    sideType: 'side',
    instruction:
      'Allongé sur le côté, ce bras tendu en arrière, laisse la poitrine s’ouvrir sans décoller le buste.',
  },
  {
    id: 'stretch-lat-hang',
    name: 'Étirement des dorsaux en suspension',
    targetArea: 'Dos & Épaules',
    durationSec: 30,
    hasSides: false,
    instruction:
      'Suspendu à une barre, relâche les épaules et laisse le corps s’allonger pour étirer les grand dorsaux.',
  },
  {
    id: 'stretch-lat-side',
    name: 'Étirement latéral des dorsaux',
    targetArea: 'Dos',
    durationSec: 30,
    hasSides: true,
    sideType: 'side',
    instruction:
      'Debout, bras levé au-dessus de la tête, penche le buste sur le côté en gardant les deux bras tendus et joints.',
  },
  {
    id: 'stretch-lat-child',
    name: 'Étirement dorsaux en position enfant',
    targetArea: 'Dos & Épaules',
    durationSec: 30,
    hasSides: false,
    instruction:
      'Assis sur les talons, bras tendus loin devant sur le sol, recule le buste et creuse entre les épaules.',
  },
  {
    id: 'stretch-thoracic-open-book',
    name: 'Livre ouvert (rotation thoracique)',
    targetArea: 'Dos & Thorax',
    durationSec: 30,
    hasSides: true,
    sideType: 'side',
    instruction:
      'Allongé de côté, genoux fléchis, ouvre le bras supérieur vers le plafond jusqu’à poser le dos au sol, puis reviens.',
  },
  {
    id: 'stretch-thoracic-rotation-4pt',
    name: 'Rotation thoracique à quatre pattes',
    targetArea: 'Dos & Thorax',
    durationSec: 20,
    hasSides: true,
    sideType: 'side',
    instruction:
      'À quatre pattes, passe une main sous ton buste vers le côté opposé, puis ouvre le bras vers le plafond en tournant le tronc.',
  },
  {
    id: 'stretch-shoulder-sleeper',
    name: 'Sleeper stretch (épaule)',
    targetArea: 'Épaules',
    durationSec: 30,
    hasSides: true,
    sideType: 'side',
    instruction:
      'Allongé sur le côté, coude à 90°, avant-bras vers le haut, pousse doucement l’avant-bras vers le sol.',
  },
  {
    id: 'stretch-shoulder-rear',
    name: 'Étirement deltoïde postérieur',
    targetArea: 'Épaules',
    durationSec: 20,
    hasSides: true,
    sideType: 'arm',
    instruction:
      'Bras tendu devant, tire-le vers la poitrine avec l’autre main en gardant l’épaule abaissée.',
  },
  {
    id: 'stretch-shoulder-wrap',
    name: 'Enroulement circulaire des épaules',
    targetArea: 'Épaules',
    durationSec: 20,
    hasSides: false,
    instruction:
      'Debout, effectue de grandes rotations d’épaules vers l’avant puis vers l’arrière, en mouvement et en contrôle.',
  },
  {
    id: 'stretch-scapular-walls',
    name: 'Glissements scapulaires contre le mur',
    targetArea: 'Épaules & Dos',
    durationSec: 20,
    hasSides: false,
    instruction:
      'Dos plat contre un mur, bras levés coudes pliés, fais glisser les avant-bras vers le haut sans décoller les épaules du mur.',
  },
  // ---- Haut du corps : bras / avant-bras / poignets ----
  {
    id: 'stretch-triceps-wall',
    name: 'Étirement triceps contre le mur',
    targetArea: 'Triceps',
    durationSec: 20,
    hasSides: true,
    sideType: 'arm',
    instruction:
      'Main contre le mur à hauteur d’épaule, coude fléchi derrière la tête, pousse doucement ce coude avec l’autre main.',
  },
  {
    id: 'stretch-biceps-bar',
    name: 'Étirement biceps bras tendu en arrière',
    targetArea: 'Biceps & Avant-bras',
    durationSec: 20,
    hasSides: true,
    sideType: 'arm',
    instruction:
      'Bras tendu en arrière, main contre un support, paume vers le bas, écarte doucement le bras de l’axe du corps.',
  },
  {
    id: 'stretch-forearm-extensor',
    name: 'Étirement extenseurs de l’avant-bras',
    targetArea: 'Avant-bras',
    durationSec: 20,
    hasSides: true,
    sideType: 'arm',
    instruction:
      'Bras tendu devant, paume vers le bas, tire les doigts vers le bas avec l’autre main.',
  },
  {
    id: 'stretch-forearm-flexor',
    name: 'Étirement fléchisseurs de l’avant-bras',
    targetArea: 'Avant-bras',
    durationSec: 20,
    hasSides: true,
    sideType: 'arm',
    instruction:
      'Bras tendu devant, paume vers le haut, tire les doigts vers le bas avec l’autre main en gardant le coude tendu.',
  },
  {
    id: 'stretch-fingers-counter',
    name: 'Étirement des doigts contre un support',
    targetArea: 'Poignets',
    durationSec: 15,
    hasSides: false,
    instruction:
      'Bouts des doigts contre une table, mains à hauteur de poitrine, pousse doucement les talons de mains vers la table.',
  },
  {
    id: 'stretch-wrist-rotations',
    name: 'Rotations de poignets',
    targetArea: 'Poignets',
    durationSec: 15,
    hasSides: false,
    instruction:
      'Bras tendus devant, réalise de grandes rotations de poignets dans un sens puis dans l’autre, en mouvement lent.',
  },
  {
    id: 'stretch-wrist-prayer',
    name: 'Étirement poignets en prière',
    targetArea: 'Poignets',
    durationSec: 20,
    hasSides: false,
    instruction:
      'Paumes jointes devant la poitrine, coudes écartés, descends doucement les mains vers le bas en gardant les paumes collées.',
  },
  // ---- Core & tronc ----
  {
    id: 'stretch-spinal-rotation-seated',
    name: 'Torsion assise de la colonne',
    targetArea: 'Dos & Tronc',
    durationSec: 30,
    hasSides: true,
    sideType: 'side',
    instruction:
      'Assis, une main derrière soi, l’autre sur le genou opposé, tourne doucement le buste en expirant.',
  },
  {
    id: 'stretch-spinal-rotation-lying',
    name: 'Torsion de la colonne allongée',
    targetArea: 'Obliques',
    durationSec: 30,
    hasSides: true,
    sideType: 'side',
    instruction:
      'Allongé sur le dos, genoux pliés vers un côté, épaules plaquées au sol, tête tournée à l’opposé.',
  },
  {
    id: 'stretch-knees-to-chest',
    name: 'Genoux à la poitrine',
    targetArea: 'Lombaires',
    durationSec: 20,
    hasSides: false,
    instruction:
      'Allongé sur le dos, attrape les genoux et tire-les doucement vers la poitrine en gardant le bassin au sol.',
  },
  {
    id: 'stretch-lower-back-seated',
    name: 'Étirement lombaire assis',
    targetArea: 'Lombaires',
    durationSec: 30,
    hasSides: false,
    instruction:
      'Assis, jambes écartées, penche le buste vers l’avant en enroulant la colonne vertèbre par vertèbre.',
  },
  {
    id: 'stretch-standing-lumbar',
    name: 'Étirement du carré des lombaires debout',
    targetArea: 'Lombaires',
    durationSec: 20,
    hasSides: true,
    sideType: 'side',
    instruction:
      'Debout, jambe croisée derrière, penche le buste du côté opposé en gardant le dos droit et le bassin de face.',
  },
  {
    id: 'stretch-side-body-stretch',
    name: 'Flexion latérale du buste',
    targetArea: 'Obliques',
    durationSec: 20,
    hasSides: true,
    sideType: 'side',
    instruction:
      'Debout, bras tendus joints au-dessus de la tête, penche le buste sur le côté sans basculer le bassin.',
  },
  {
    id: 'stretch-stomach-lying',
    name: 'Extension dorsale allongée (abdos)',
    targetArea: 'Abdos',
    durationSec: 20,
    hasSides: false,
    instruction:
      'Allongé sur le ventre, mains sous les épaules, pousse sur les bras pour soulever le buste en gardant le bassin collé au sol.',
  },
  {
    id: 'stretch-spine-unroll',
    name: 'Déroulé de la colonne vertébrale',
    targetArea: 'Dos & Tronc',
    durationSec: 20,
    hasSides: false,
    instruction:
      'Debout, enroule la colonne vertèbre par vertèbre vers le sol, laisse pendre les bras, puis déroule lentement en remontant.',
  },
  // ---- Dynamiques ----
  {
    id: 'stretch-arm-circles',
    name: 'Cercles de bras (dynamique)',
    targetArea: 'Épaules',
    durationSec: 15,
    hasSides: false,
    instruction:
      'Bras tendus, réalise de grands cercles vers l’avant, puis vers l’arrière, en augmentant progressivement l’amplitude.',
  },
  {
    id: 'stretch-hip-circles',
    name: 'Cercles de hanche (dynamique)',
    targetArea: 'Hanches',
    durationSec: 15,
    hasSides: true,
    sideType: 'side',
    instruction:
      'Debout, une main en appui, dessine de grands cercles avec la hanche dans un sens puis dans l’autre.',
  },
  {
    id: 'stretch-torso-twists',
    name: 'Rotations du buste debout (dynamique)',
    targetArea: 'Tronc',
    durationSec: 15,
    hasSides: false,
    instruction:
      'Debout, bras le long du buste ou levés, tourne le buste de gauche à droite en gardant le bassin stable.',
  },
  {
    id: 'stretch-leg-swing-front',
    name: 'Balancements de jambe avant (dynamique)',
    targetArea: 'Jambes & Hanches',
    durationSec: 15,
    hasSides: true,
    sideType: 'leg',
    instruction:
      'En appui sur une jambe, balance l’autre jambe tendue vers l’avant et vers l’arrière avec contrôle.',
  },
  {
    id: 'stretch-leg-swing-side',
    name: 'Balancements de jambe latéraux (dynamique)',
    targetArea: 'Hanches & Jambes',
    durationSec: 15,
    hasSides: true,
    sideType: 'leg',
    instruction:
      'En appui sur une jambe, balance l’autre jambe de gauche à droite devant toi en gardant le buste droit.',
  },
  {
    id: 'stretch-butt-kicks',
    name: 'Talons-fesses debout (dynamique)',
    targetArea: 'Quadriceps',
    durationSec: 15,
    hasSides: true,
    sideType: 'leg',
    instruction:
      'Debout, ramène alternativement chaque talon vers la fesse en fléchissant le genou, rythme régulier.',
  },
  // LOT 13 — Extension de la bibliothèque individuelle (aucun preset modifié).
  ...LIBRARY_EXPANSION_STRETCHES,
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
