import { Exercise } from '../types';

export const initialExercises: Exercise[] = [
  // ==================== PECTORAUX ====================
  {
    id: 'ex-bench-press',
    name: 'Développé Couché (Barre)',
    primaryMuscle: 'Pectoraux',
    secondaryMuscles: ['Triceps', 'Épaules (faisceau antérieur)'],
    bodyPart: 'Pectoraux',
    equipment: 'Barre',
    difficulty: 'Intermédiaire',
    category: 'Musculation',
    muscleGroup: 'Pectoraux',
    description: 'Le mouvement de référence polyarticulaire pour bâtir force et volume au niveau de la cage thoracique.',
    instructions: [
      'Allongez-vous sur le banc, les yeux sous la barre, pieds solidement ancrés au sol.',
      'Saisissez la barre avec une prise légèrement supérieure à la largeur des épaules.',
      'Resserrez les omoplates (rétraction scapulaire) et descendez la barre de façon contrôlée au niveau du bas des pectoraux.',
      'Poussez avec explosivité sans décoller le bassin ni déverrouiller excessivement les coudes.'
    ],
    tips: ['Expirez en poussant, inspirez en descendant.', 'Gardez les omoplates serrées tout au long du mouvement.', 'Contractez les abdominaux pour stabiliser le tronc.'],
    variants: ['Développé Couché Incliné', 'Développé Couché Décliné', 'Développé Couché aux Haltères'],
    similarExerciseIds: ['ex-incline-dumbbell-press', 'ex-pushups', 'ex-dips-chest'],
    commonMistakes: [
      'Rebondir la barre sur la cage thoracique.',
      'Écarter les coudes à 90° (risque de conflit sous-acromial).',
      'Décoller les fesses du banc pendant la poussée.'
    ],
    defaultSets: 4,
    defaultReps: 8,
    defaultRestSec: 120,
    isFavorite: true,
  },
  {
    id: 'ex-incline-dumbbell-press',
    name: 'Développé Incliné aux Haltères',
    primaryMuscle: 'Pectoraux',
    secondaryMuscles: ['Épaules (avant)', 'Triceps'],
    bodyPart: 'Pectoraux',
    equipment: 'Haltères',
    difficulty: 'Intermédiaire',
    category: 'Musculation',
    muscleGroup: 'Pectoraux',
    description: 'Cible spécifiquement le faisceau claviculaire (haut des pectoraux) avec une grande liberté articulaire.',
    instructions: [
      'Réglez le banc à une inclinaison de 30° à 45°.',
      'Amenez les haltères à hauteur de poitrine, omoplates serrées contre le dossier.',
      'Poussez vers le haut en convergeant légèrement sans faire s’entrechoquer les haltères.',
      'Contrôlez la descente sur 2 à 3 secondes en ressentant l’étirement.'
    ],
    tips: ["Convergez légèrement les haltères en poussant pour mieux contracter.","Gardez les coudes à environ 45° du torse.","Contrôlez la phase négative sur 2-3 secondes."],
    variants: ["Développé Couché Barre Incliné","Développé Incliné Kettlebell","Développé Incliné Arnold"],
    similarExerciseIds: ["ex-bench-press","ex-pushups","ex-cable-crossover"],
    commonMistakes: [
      'Incliner le banc à plus de 45° (transforme l’exercice en travail d’épaules).',
      'Tendre brutalement les coudes en haut du mouvement.'
    ],
    defaultSets: 4,
    defaultReps: 10,
    defaultRestSec: 90,
    isFavorite: true,
  },
  {
    id: 'ex-pushups',
    name: 'Pompes Classiques (Push-ups)',
    primaryMuscle: 'Pectoraux',
    secondaryMuscles: ['Triceps', 'Abdominaux', 'Épaules'],
    bodyPart: 'Pectoraux',
    equipment: 'Poids du corps',
    difficulty: 'Débutant',
    category: 'Poids du corps',
    muscleGroup: 'Pectoraux',
    description: 'Exercice fondamental au poids de corps pour la poitrine, les bras et le gainage général.',
    instructions: [
      'Placez les mains au sol un peu plus larges que les épaules, corps gainé en ligne droite.',
      'Fléchissez les coudes orientés à 45° par rapport au torse jusqu’à effleurer le sol.',
      'Repoussez le sol activement en maintenant les fessiers et abdos contractés.'
    ],
    tips: ["Serrez les abdos et les fessiers comme si vous teniez une planche.","Descendez jusqu'à effleurer le sol avec la poitrine.","Les coudes restent orientés à 45°, jamais à 90°."],
    variants: ["Pompes surélevées (pieds sur banc)","Pompes diamant","Pompes plyométriques"],
    similarExerciseIds: ["ex-bench-press","ex-incline-dumbbell-press","ex-dips-chest"],
    commonMistakes: [
      'Laisser le bassin s’affaisser (perte de gainage lombaire).',
      'Regarder vers le haut au lieu de garder le cou aligné.'
    ],
    defaultSets: 3,
    defaultReps: 15,
    defaultRestSec: 60,
    isFavorite: true,
  },
  {
    id: 'ex-cable-crossover',
    name: 'Écartés à la Poulie Vis-à-Vis',
    primaryMuscle: 'Pectoraux',
    secondaryMuscles: ['Épaules (avant)'],
    bodyPart: 'Pectoraux',
    equipment: 'Poulie',
    difficulty: 'Intermédiaire',
    category: 'Musculation',
    muscleGroup: 'Pectoraux',
    description: 'Permet une tension continue sur toute la course du mouvement et une excellente congestion.',
    instructions: [
      'Positionnez les poulies hautes ou moyennes, faites un pas en avant en position de fente stable.',
      'Bras légèrement fléchis, ramenez les poignées l’une vers l’autre en contractant fort les pectoraux.',
      'Marquez un temps d’arrêt de 1 seconde en contraction maximale avant de contrôler le retour.'
    ],
    tips: ["Croisez les mains légèrement en fin de course pour une contraction maximale.","Gardez une légère flexion constante des coudes.","Le buste reste légèrement penché en avant."],
    variants: ["Croisé Poulie Haute","Croisé Poulie Basse (pour le haut des pectoraux)","Écarté à la machine pec-deck"],
    similarExerciseIds: ["ex-bench-press","ex-pushups","ex-incline-dumbbell-press"],
    commonMistakes: [
      'Plier excessivement les bras (qui transforme le mouvement en développé).',
      'Balancement du buste pour tricher la charge.'
    ],
    defaultSets: 3,
    defaultReps: 12,
    defaultRestSec: 60,
  },
  {
    id: 'ex-dips-chest',
    name: 'Dips Focus Pectoraux',
    primaryMuscle: 'Pectoraux',
    secondaryMuscles: ['Triceps', 'Épaules'],
    bodyPart: 'Pectoraux',
    equipment: 'Poids du corps',
    difficulty: 'Avancé',
    category: 'Poids du corps',
    muscleGroup: 'Pectoraux',
    description: 'Développe la partie inférieure et externe des pectoraux avec une forte charge corporelle.',
    instructions: [
      'Suspendez-vous aux barres parallèles, buste penché vers l’avant à 30°.',
      'Descendez jusqu’à ce que les bras forment un angle de 90°, coudes légèrement ouverts.',
      'Poussez fermement pour remonter sans verrouiller les coudes au sommet.'
    ],
    tips: ["Penchez le buste vers l'avant pour cibler les pectoraux.","Descendez jusqu'à 90° aux coudes, pas plus pour protéger l'épaule.","Gardez la tête neutre sans arrondir les épaules."],
    variants: ["Dips lestés (ceinture)","Dips entre deux bancs (triceps)","Dips assistés machine"],
    similarExerciseIds: ["ex-bench-press","ex-pushups","ex-triceps-rope-pushdown"],
    commonMistakes: [
      'Rester le buste trop droit (qui reporte la tension sur les triceps).',
      'Descendre trop bas si la mobilité de l’épaule est insuffisante.'
    ],
    defaultSets: 3,
    defaultReps: 10,
    defaultRestSec: 90,
  },

  // ==================== DOS ====================
  {
    id: 'ex-deadlift',
    name: 'Soulevé de Terre (Deadlift Conventionnel)',
    primaryMuscle: 'Dos',
    secondaryMuscles: ['Ischio-jambiers', 'Fessiers', 'Lombaires', 'Avant-bras', 'Trapèzes'],
    bodyPart: 'Dos',
    equipment: 'Barre',
    difficulty: 'Avancé',
    category: 'Musculation',
    muscleGroup: 'Dos',
    description: 'Le roi des mouvements de puissance globale engageant toute la chaîne postérieure.',
    instructions: [
      'Pieds écartés largeur de hanches sous la barre, tibias proches de la barre.',
      'Baissez les hanches, saisissez la barre en pronation ou prise inversée, dos parfaitement plat.',
      'Poussez fort dans le sol avec les jambes tout en ouvrant la cage thoracique.',
      'Terminez en extension complète des hanches sans cambrer excessivement les lombaires.'
    ],
    tips: ["Maintenez le dos plat à chaque instant, jamais arrondi.","La barre reste en contact avec les jambes tout au long du mouvement.","Expirez en poussant le sol, inspirez en descendant."],
    variants: ["Soulevé de Terre Sumo","Soulevé de Terre Trap Bar","Soulevé de Terre Roumain"],
    similarExerciseIds: ["ex-barbell-row","ex-romanian-deadlift","ex-barbell-squat"],
    commonMistakes: [
      'Arrondir le bas du dos sous la charge.',
      'Tirer uniquement avec le dos sans engager les jambes.',
      'Éloigner la barre des tibias durant la montée.'
    ],
    defaultSets: 4,
    defaultReps: 5,
    defaultRestSec: 150,
    isFavorite: true,
  },
  {
    id: 'ex-pullups',
    name: 'Tractions Prise Pronation',
    primaryMuscle: 'Dos',
    secondaryMuscles: ['Biceps', 'Avant-bras', 'Trapèzes (inférieurs)'],
    bodyPart: 'Dos',
    equipment: 'Barre de traction',
    difficulty: 'Intermédiaire',
    category: 'Poids du corps',
    muscleGroup: 'Dos',
    description: 'L’exercice suprême au poids de corps pour élargir le grand dorsal.',
    instructions: [
      'Suspendez-vous à la barre, mains en pronation plus larges que les épaules.',
      'Initiez la traction en abaissant et resserrant les omoplates.',
      'Tirez jusqu’à passer le menton au-dessus de la barre en amenant la poitrine vers l’avant.',
      'Redescendez de manière totalement contrôlée jusqu’à l’extension complète des bras.'
    ],
    tips: ["Initiez le mouvement par la rétraction scapulaire, pas par les bras.","Gardez le core gainé pour éviter le balancement.","Descendez complètement avant de relancer."],
    variants: ["Tractions Supination (Chin-ups)","Tractions avec élastique assisté","Tractions lestées"],
    similarExerciseIds: ["ex-lat-pulldown","ex-barbell-row","ex-seated-cable-row"],
    commonMistakes: [
      'Donner des à-coups avec les jambes (kipping non maîtrisé).',
      'Ne pas descendre en bas du mouvement (amplitudes partielles).'
    ],
    defaultSets: 4,
    defaultReps: 8,
    defaultRestSec: 90,
    isFavorite: true,
  },
  {
    id: 'ex-barbell-row',
    name: 'Rowing Barre Buste Penché (Yates / Pendlay)',
    primaryMuscle: 'Dos',
    secondaryMuscles: ['Biceps', 'Arrière d’épaules', 'Lombaires'],
    bodyPart: 'Dos',
    equipment: 'Barre',
    difficulty: 'Intermédiaire',
    category: 'Musculation',
    muscleGroup: 'Dos',
    description: 'Développe l’épaisseur du dos, les rhomboïdes et le milieu des trapèzes.',
    instructions: [
      'Genoux légèrement fléchis, inclinez le buste à 45° en gardant le dos droit et stable.',
      'Tirez la barre vers le nombril en guidant le mouvement avec les coudes.',
      'Resserrez fort les omoplates en haut puis contrôlez la phase négative.'
    ],
    tips: ["Le dos reste parallèle au sol ou à 45°, jamais arrondi.","Tirez avec les coudes, pas avec les mains.","Serrez les omoplates en fin de mouvement."],
    variants: ["Rowing Pendlay (buste parallèle)","Rowing Yates (prise supination)","Rowing haltère unilatéral"],
    similarExerciseIds: ["ex-seated-cable-row","ex-lat-pulldown","ex-pullups"],
    commonMistakes: [
      'Arrondir la colonne vertébrale.',
      'Se redresser brutalement pour donner de l’élan.'
    ],
    defaultSets: 4,
    defaultReps: 8,
    defaultRestSec: 90,
  },
  {
    id: 'ex-lat-pulldown',
    name: 'Tirage Vertical à la Machine / Poulie Haute',
    primaryMuscle: 'Dos',
    secondaryMuscles: ['Biceps', 'Avant-bras'],
    bodyPart: 'Dos',
    equipment: 'Machines',
    difficulty: 'Débutant',
    category: 'Musculation',
    muscleGroup: 'Dos',
    description: 'Excellente alternative aux tractions pour isoler le grand dorsal avec une charge ajustable.',
    instructions: [
      'Assis, cuisses calées sous les boudins de maintien, saisissez la barre large.',
      'Inclinez légèrement le buste en arrière et tirez la barre vers le haut des pectoraux.',
      'Ressentez la contraction des dorsaux puis relâchez progressivement vers le haut.'
    ],
    tips: ["Inclinez le buste légèrement en arrière (environ 15°).","Tirez la barre vers le haut des pectoraux, pas vers la nuque.","Contrôlez la remontée en sentant l'étirement des dorsaux."],
    variants: ["Tirage supination","Tirage en prise étroite (V-bar)","Tirage unilatéral"],
    similarExerciseIds: ["ex-pullups","ex-seated-cable-row","ex-barbell-row"],
    commonMistakes: [
      'Tirer la barre derrière la nuque (stress excessif pour la coiffe des rotateurs).',
      'Se pencher excessivement en arrière pour compenser une charge trop lourde.'
    ],
    defaultSets: 3,
    defaultReps: 10,
    defaultRestSec: 75,
  },
  {
    id: 'ex-seated-cable-row',
    name: 'Tirage Horizontal Prise Serrée (Poulie Basse)',
    primaryMuscle: 'Dos',
    secondaryMuscles: ['Biceps', 'Trapèzes', 'Lombaires'],
    bodyPart: 'Dos',
    equipment: 'Poulie',
    difficulty: 'Débutant',
    category: 'Musculation',
    muscleGroup: 'Dos',
    description: 'Renforce l’épaisseur du milieu du dos et la posture scapulaire.',
    instructions: [
      'Assis face à la poulie, pieds calés, genoux souples, saisissez la poignée triangle.',
      'Tirez la poignée vers le bas-ventre en ouvrant la poitrine et en serrant les coudes près du corps.',
      'Revenez lentement vers l’avant en gardant le bas du dos neutre.'
    ],
    tips: ["Le dos reste droit tout au long du mouvement.","Ouvrez la poitrine et serrez les omoplates en tirant.","Évitez de vous pencher trop en avant en relâchant."],
    variants: ["Rowing poulie prise large","Rowing poulie unilatéral","Tirage horizontal corde"],
    similarExerciseIds: ["ex-barbell-row","ex-lat-pulldown","ex-pullups"],
    commonMistakes: [
      'Cambrer ou arrondir excessivement le dos en balançant le buste.',
      'Lever les épaules vers les oreilles au lieu de les abaisser.'
    ],
    defaultSets: 3,
    defaultReps: 12,
    defaultRestSec: 60,
  },

  // ==================== ÉPAULES ====================
  {
    id: 'ex-military-press',
    name: 'Développé Militaire Debout (Overhead Press)',
    primaryMuscle: 'Épaules',
    secondaryMuscles: ['Triceps', 'Haut des pectoraux', 'Gainage abdos'],
    bodyPart: 'Épaules',
    equipment: 'Barre',
    difficulty: 'Intermédiaire',
    category: 'Musculation',
    muscleGroup: 'Épaules',
    description: 'Mouvement polyarticulaire fondamental pour la puissance et la masse des deltoïdes.',
    instructions: [
      'Debout, pieds écartés largeur d’épaules, barre posée sur les clavicules.',
      'Gainez abdos et fessiers, poussez la barre verticalement au-dessus de la tête.',
      'Passez la tête légèrement en avant une fois la barre au-dessus du front pour verrouiller la trajectoire.'
    ],
    tips: ["Gainez abdos et fessiers pour protéger les lombaires.","Poussez la barre en ligne droite devant le visage.","Ne cambrez pas excessivement le dos."],
    variants: ["Développé Militaire Assis","Push Press (avec élan des jambes)","Développé Arnold"],
    similarExerciseIds: ["ex-lateral-raises","ex-face-pull","ex-pushups"],
    commonMistakes: [
      'Cambrer dangereusement les lombaires en poussant la charge.',
      'Pousser avec l’aide des genoux (ce qui deviendrait un push press).'
    ],
    defaultSets: 4,
    defaultReps: 8,
    defaultRestSec: 90,
    isFavorite: true,
  },
  {
    id: 'ex-lateral-raises',
    name: 'Élévations Latérales aux Haltères',
    primaryMuscle: 'Épaules',
    secondaryMuscles: ['Trapèzes (supérieurs)'],
    bodyPart: 'Épaules',
    equipment: 'Haltères',
    difficulty: 'Débutant',
    category: 'Musculation',
    muscleGroup: 'Épaules',
    description: 'L’exercice d’isolation n°1 pour élargir la carrure et cibler le deltoïde latéral.',
    instructions: [
      'Debout ou assis, haltères le long des cuisses, coudes très légèrement fléchis.',
      'Élevez les bras sur les côtés jusqu’à l’horizontale, petit doigt légèrement plus haut que le pouce.',
      'Contrôlez la descente sans vous aider de l’élan du corps.'
    ],
    tips: ["Gardez les coudes légèrement fléchis, les mains à hauteur des épaules.","Utilisez des charges légères pour un contrôle optimal.","Inclinez le buste très légèrement en avant pour mieux cibler le deltoïde latéral."],
    variants: ["Élévations latérales à la poulie","Élévations latérales penché","Élévations alternées assis"],
    similarExerciseIds: ["ex-military-press","ex-face-pull","ex-reverse-fly"],
    commonMistakes: [
      'Prendre trop lourd et balancer le buste.',
      'Monter les bras au-delà de l’horizontale en haussant les trapèzes.'
    ],
    defaultSets: 4,
    defaultReps: 15,
    defaultRestSec: 60,
    isFavorite: true,
  },
  {
    id: 'ex-face-pull',
    name: 'Face Pull à la Poulie / Élastique',
    primaryMuscle: 'Épaules',
    secondaryMuscles: ['Arrière d’épaules', 'Rhomboïdes', 'Coiffe des rotateurs'],
    bodyPart: 'Épaules',
    equipment: 'Poulie',
    difficulty: 'Débutant',
    category: 'Musculation',
    muscleGroup: 'Épaules',
    description: 'Indispensable pour la santé des épaules, la posture et l’équilibre musculaire antérieur/postérieur.',
    instructions: [
      'Fixez une corde sur la poulie haute, tenez-la en prise neutre.',
      'Reculez d’un pas, tirez la corde vers vos yeux en écartant activement les mains et coudes.',
      'Terminez par une rotation externe des poignets (pouces vers l’arrière) et maintenez 1s.'
    ],
    tips: ["Tirez vers les yeux, pas vers le menton.","La rotation externe en fin de course est essentielle.","Gardez les coudes au niveau des épaules, pas en dessous."],
    variants: ["Face Pull élastique","Face Pull à la poulie basse (mui)","Face Pull avec rotation complète"],
    similarExerciseIds: ["ex-reverse-fly","ex-lateral-raises","ex-military-press"],
    commonMistakes: [
      'Tirer vers le bas ou le cou sans ouvrir les coudes.',
      'Avancer la tête vers la corde au lieu de tirer la corde au visage.'
    ],
    defaultSets: 3,
    defaultReps: 15,
    defaultRestSec: 60,
  },
  {
    id: 'ex-reverse-fly',
    name: 'Oiseau Buste Penché (Reverse Fly Haltères)',
    primaryMuscle: 'Épaules',
    secondaryMuscles: ['Arrière d’épaules', 'Haut du dos'],
    bodyPart: 'Épaules',
    equipment: 'Haltères',
    difficulty: 'Débutant',
    category: 'Musculation',
    muscleGroup: 'Épaules',
    description: 'Isole le deltoïde postérieur pour un galbe d’épaule complet en 3D.',
    instructions: [
      'Buste penché vers l’avant à l’horizontale, dos droit, genoux fléchis.',
      'Écartez les bras vers le plafond en contractant l’arrière des épaules.',
      'Marquez une courte pause au sommet puis redescendez en retenant la charge.'
    ],
    tips: ["Gardez le dos droit et le buste parallèle au sol.","Les bras restent presque tendus avec une légère courbure aux coudes.","Ne serrez pas les omoplates trop fort pour isoler le deltoïde postérieur."],
    variants: ["Oiseau à la machine (pec-deck inversé)","Oiseau à la poulie","Oiseau sur banc incliné"],
    similarExerciseIds: ["ex-face-pull","ex-lateral-raises","ex-barbell-row"],
    commonMistakes: [
      'Resserrer excessivement les omoplates qui transfère la charge sur les rhomboïdes.',
      'Prendre trop lourd et plier trop les bras.'
    ],
    defaultSets: 3,
    defaultReps: 12,
    defaultRestSec: 60,
  },

  // ==================== BICEPS ====================
  {
    id: 'ex-biceps-ez-curl',
    name: 'Curl Biceps à la Barre EZ',
    primaryMuscle: 'Biceps',
    secondaryMuscles: ['Avant-bras', 'Brachial antérieur'],
    bodyPart: 'Bras',
    equipment: 'Barre',
    difficulty: 'Débutant',
    category: 'Musculation',
    muscleGroup: 'Bras',
    description: 'Exercice de base pour la masse des biceps avec une prise coudée préservant les poignets.',
    instructions: [
      'Debout, saisissez la barre EZ en supination au niveau des courbures.',
      'Gardez les coudes collés aux flancs, fléchissez les bras jusqu’à contraction maximale.',
      'Redescendez lentement sans relâcher la tension musculaire en bas.'
    ],
    tips: ["Les coudes restent collés aux flancs, ne bougent pas.","Contrôlez la descente pendant 2-3 secondes.","Expirez en montant la charge, inspirez en descendant."],
    variants: ["Curl barre droite","Curl barre EZ debout","Curl barre au pupitre"],
    similarExerciseIds: ["ex-incline-dumbbell-curl","ex-hammer-curl","ex-self-resisted-curl"],
    commonMistakes: [
      'Donner un élan avec les hanches ou le dos.',
      'Avancer les coudes en avant pour faciliter la fin du mouvement.'
    ],
    defaultSets: 4,
    defaultReps: 10,
    defaultRestSec: 60,
    isFavorite: true,
  },
  {
    id: 'ex-incline-dumbbell-curl',
    name: 'Curl Incliné aux Haltères',
    primaryMuscle: 'Biceps',
    secondaryMuscles: ['Avant-bras'],
    bodyPart: 'Bras',
    equipment: 'Haltères',
    difficulty: 'Intermédiaire',
    category: 'Musculation',
    muscleGroup: 'Bras',
    description: 'Place le chef long du biceps dans un étirement maximal grâce à l’inclinaison du banc.',
    instructions: [
      'Assis sur un banc incliné à 60°, bras ballants vers le sol avec haltères.',
      'Fléchissez les avant-bras tout en effectuant une supination (tourner la paume vers le haut).',
      'Contrôlez soigneusement la descente pour profiter du réflexe myotatique.'
    ],
    tips: ["L'angle de 60° maximise l'étirement du chef long du biceps.","Ne décollez pas les épaules du dossier.","Effectuez une légère supination en haut pour une contraction complète."],
    variants: ["Curl sur banc à 90°","Curl concentré","Curl alterne assis"],
    similarExerciseIds: ["ex-biceps-ez-curl","ex-hammer-curl","ex-self-resisted-curl"],
    commonMistakes: [
      'Décoller les épaules du dossier.',
      'Laisser tomber les haltères rapidement en phase excentrique.'
    ],
    defaultSets: 3,
    defaultReps: 12,
    defaultRestSec: 60,
  },
  {
    id: 'ex-hammer-curl',
    name: 'Curl Marteau (Hammer Curl)',
    primaryMuscle: 'Biceps',
    secondaryMuscles: ['Avant-bras (brachio-radial)', 'Brachial antérieur'],
    bodyPart: 'Bras',
    equipment: 'Haltères',
    difficulty: 'Débutant',
    category: 'Musculation',
    muscleGroup: 'Bras',
    description: 'Renforce l’épaisseur du bras et le brachio-radial en prise neutre.',
    instructions: [
      'Debout, paumes de mains face à face (prise neutre), haltères en mains.',
      'Montez les haltères alternativement ou simultanément en gardant les poignets neutres.',
      'Contractez fort au sommet et redescendez sous contrôle.'
    ],
    tips: ["Ne cassez pas les poignets, ils restent alignés.","Alternez les bras pour mieux contrôler le mouvement.","Montez les haltères sans balancer le corps."],
    variants: ["Curl marteau sur banc incliné","Curl marteau à la poulie","Curl marteau alterne"],
    similarExerciseIds: ["ex-biceps-ez-curl","ex-incline-dumbbell-curl","ex-wrist-curls"],
    commonMistakes: [
      'Casser les poignets.',
      'Balancement excessif du torse.'
    ],
    defaultSets: 3,
    defaultReps: 12,
    defaultRestSec: 60,
  },

  // ==================== TRICEPS ====================
  {
    id: 'ex-skull-crushers',
    name: 'Barre au Front (Skull Crushers)',
    primaryMuscle: 'Triceps',
    secondaryMuscles: ['Avant-bras'],
    bodyPart: 'Bras',
    equipment: 'Barre',
    difficulty: 'Intermédiaire',
    category: 'Musculation',
    muscleGroup: 'Bras',
    description: 'Cible avec prédilection le chef long et le chef médial des triceps.',
    instructions: [
      'Allongé sur un banc, bras verticaux tenant la barre EZ prise serrée.',
      'Fléchissez uniquement les avant-bras vers le front ou légèrement derrière la tête.',
      'Étendez les bras avec force en maintenant les coudes fixes et resserrés.'
    ],
    tips: ["Les coudes pointent vers le plafond et ne bougent pas.","Fléchissez les avant-bras jusqu'à amener la barre au front.","Étendez complètement les bras sans verrouiller violemment les coudes."],
    variants: ["Extensions Nuque avec haltère","Extensions sur banc incliné","Extensions à la poulie overhead"],
    similarExerciseIds: ["ex-triceps-rope-pushdown","ex-dips-chest","ex-bench-press"],
    commonMistakes: [
      'Écarter les coudes vers l’extérieur.',
      'Faire bouger les bras au lieu d’articuler seulement les avant-bras.'
    ],
    defaultSets: 4,
    defaultReps: 10,
    defaultRestSec: 75,
    isFavorite: true,
  },
  {
    id: 'ex-triceps-rope-pushdown',
    name: 'Extensions Triceps à la Corde (Poulie Haute)',
    primaryMuscle: 'Triceps',
    secondaryMuscles: ['Avant-bras'],
    bodyPart: 'Bras',
    equipment: 'Poulie',
    difficulty: 'Débutant',
    category: 'Musculation',
    muscleGroup: 'Bras',
    description: 'Permet d’écarter la corde en bas pour une contraction maximale du chef latéral.',
    instructions: [
      'Face à la poulie haute, coudes calés contre les côtes.',
      'Poussez la corde vers le bas en écartant les deux extrémités en fin de course.',
      'Verrouillez 1 seconde en bas puis remontez jusqu’à 90° de flexion.'
    ],
    tips: ["Les coudes restent plaqués contre les côtes.","Écartez la corde en bas pour maximiser la contraction.","Remontez jusqu'à 90° de flexion du coude."],
    variants: ["Extensions poulie barre droite","Extensions poulie reverse grip","Extensions poulie overhead corde"],
    similarExerciseIds: ["ex-skull-crushers","ex-dips-chest","ex-farmer-walk"],
    commonMistakes: [
      'Décoller les coudes des flancs pour appuyer avec le poids du corps.',
      'Remonter les mains trop haut au détriment de la tension triceps.'
    ],
    defaultSets: 3,
    defaultReps: 12,
    defaultRestSec: 60,
  },

  // ==================== AVANT-BRAS ====================
  {
    id: 'ex-farmer-walk',
    name: 'Marche du Fermier (Farmer Walk)',
    primaryMuscle: 'Avant-bras',
    secondaryMuscles: ['Trapèzes', 'Gainage abdos', 'Poignets', 'Mollets'],
    bodyPart: 'Bras',
    equipment: 'Haltères',
    difficulty: 'Débutant',
    category: 'Musculation',
    muscleGroup: 'Bras',
    description: 'Renforcement fonctionnel redoutable de la poigne (grip), des avant-bras et de la posture.',
    instructions: [
      'Saisissez deux charges très lourdes (haltères, kettlebells ou barres de fermier).',
      'Redressez-vous avec le torse fier, épaules basses, abdos verrouillés.',
      'Marchez à pas mesurés et contrôlés sur une distance donnée sans osciller.'
    ],
    tips: ["Gardez le torse droit et les épaules basses.","Faites des pas mesurés sans osciller.","Respirez régulièrement sans bloquer la respiration."],
    variants: ["Marche du Fermier unilatérale","Marche du Fermier sur les pointes","Marche avec kettlebell en carry frontal"],
    similarExerciseIds: ["ex-wrist-curls","ex-pullups","ex-barbell-squat"],
    commonMistakes: [
      'Laisser les épaules s’affaisser vers l’avant.',
      'Faire de trop grands pas déséquilibrés.'
    ],
    defaultSets: 3,
    defaultReps: '40 mètres',
    defaultRestSec: 90,
  },
  {
    id: 'ex-wrist-curls',
    name: 'Flexions de Poignets aux Haltères',
    primaryMuscle: 'Avant-bras',
    secondaryMuscles: ['Poignets'],
    bodyPart: 'Bras',
    equipment: 'Haltères',
    difficulty: 'Débutant',
    category: 'Musculation',
    muscleGroup: 'Bras',
    description: 'Isolation des fléchisseurs des doigts et du poignet pour développer l’épaisseur de l’avant-bras.',
    instructions: [
      'Avant-bras posés à plat sur un banc, poignets dépassant du bord, paumes vers le haut.',
      'Descendez les haltères jusqu’au bout des doigts, puis enroulez avec force vers le haut.',
      'Contrôlez chaque répétition sans secousses.'
    ],
    tips: ["Utilisez des charges légères pour éviter les tendinites.","Laissez les haltères redescendre jusqu'au bout des doigts.","Ne soulevez pas les avant-bras du support."],
    variants: ["Curl poignet au pupitre","Curl poignet avec barre","Extension poignet (face reversée)"],
    similarExerciseIds: ["ex-farmer-walk","ex-pronation-supination","ex-hammer-curl"],
    commonMistakes: [
      'Prendre des charges excessives risquant l’irritation des tendons fléchisseurs.',
      'Décoller les avant-bras du support.'
    ],
    defaultSets: 3,
    defaultReps: 15,
    defaultRestSec: 45,
  },

  // ==================== ABDOMINAUX & TRONC ====================
  {
    id: 'ex-hanging-leg-raise',
    name: 'Relevé de Jambes Suspendu à la Barre',
    primaryMuscle: 'Abdominaux',
    secondaryMuscles: ['Fléchisseurs de hanches', 'Avant-bras (grip)'],
    bodyPart: 'Abdominaux & Tronc',
    equipment: 'Barre de traction',
    difficulty: 'Avancé',
    category: 'Poids du corps',
    muscleGroup: 'Abdos',
    description: 'Exercice de référence pour la portion basse des abdominaux et la force fonctionnelle du tronc.',
    instructions: [
      'Suspendez-vous à la barre, corps immobile sans balancement.',
      'Enroulez le bassin vers la poitrine en montant les jambes tendues ou genoux fléchis.',
      'Contrôlez la descente sur 2 secondes complètes sans cambrer le bas du dos.'
    ],
    tips: ["Accrochez-vous fermement et contrôlez le balancement.","Levez les jambes en rétroversant le bassin pour cibler les abdos.","La descente doit être lente et contrôlée."],
    variants: ["Relevé de genoux suspendu (plus facile)","Relevé de jambes obliques","Relevé de jambes avec poids"],
    similarExerciseIds: ["ex-plank","ex-ab-wheel","ex-leg-flutters"],
    commonMistakes: [
      'Utiliser le balancier du corps pour monter les jambes.',
      'Lever les cuisses sans rétroversion du bassin (ne travaille que le psoas).'
    ],
    defaultSets: 3,
    defaultReps: 12,
    defaultRestSec: 60,
    isFavorite: true,
  },
  {
    id: 'ex-plank',
    name: 'Gainage Planche Abdominale',
    primaryMuscle: 'Abdominaux',
    secondaryMuscles: ['Lombaires', 'Épaules', 'Fessiers'],
    bodyPart: 'Abdominaux & Tronc',
    equipment: 'Poids du corps',
    difficulty: 'Débutant',
    category: 'Poids du corps',
    muscleGroup: 'Abdos',
    description: 'Renforcement isométrique du transverse profond pour un ventre plat et une colonne protégée.',
    instructions: [
      'En appui sur les avant-bras et la pointe des pieds, coudes sous les épaules.',
      'Rétroversez le bassin, serrez fessiers et nombril vers la colonne.',
      'Maintenez la position en respirant calmement.'
    ],
    tips: ["Rétroversez le bassin pour activer le transverse.","Inspirez et expirez normalement, ne retenez pas votre respiration.","Maintenez une ligne droite de la tête aux talons."],
    variants: ["Planche sur les mains","Planche latérale","Planche dynamique"],
    similarExerciseIds: ["ex-plank-bodyweight","ex-ab-wheel","ex-hanging-leg-raise"],
    commonMistakes: [
      'Laisser le bas du dos se creuser vers le sol.',
      'Monter les fesses en l’air pour soulager l’effort.'
    ],
    defaultSets: 3,
    defaultReps: '45 sec',
    defaultRestSec: 45,
  },
  {
    id: 'ex-ab-wheel',
    name: 'Roue Abdominale (Ab Wheel Rollout)',
    primaryMuscle: 'Abdominaux',
    secondaryMuscles: ['Dorsaux', 'Triceps', 'Lombaires'],
    bodyPart: 'Abdominaux & Tronc',
    equipment: 'Autre',
    difficulty: 'Avancé',
    category: 'Musculation',
    muscleGroup: 'Abdos',
    description: 'L’un des exercices les plus intenses pour la chaîne abdominale antérieure.',
    instructions: [
      'À genoux, tenez les poignées de la roue au sol devant vous.',
      'Faites rouler lentement la roue vers l’avant en gardant le bassin verrouillé.',
      'Revenez à la position initiale grâce à la force exclusive des abdominaux.'
    ],
    tips: ["Commencez avec une amplitude courte et augmentez progressivement.","Ne laissez pas le bas du dos se creuser.","Expirez en revenant à la position de départ."],
    variants: ["Roue abdominale à genoux (plus facile)","Roue depuis les pieds (avancé)","Rollout avec barre lestée"],
    similarExerciseIds: ["ex-plank","ex-hanging-leg-raise","ex-russian-twist"],
    commonMistakes: [
      'Cambrer brutalement le bas du dos en fin d’extension.',
      'Tirer avec les hanches au lieu des abdominaux.'
    ],
    defaultSets: 3,
    defaultReps: 8,
    defaultRestSec: 75,
  },

  // ==================== QUADRICEPS ====================
  {
    id: 'ex-barbell-squat',
    name: 'Squat Arrière à la Barre (Back Squat)',
    primaryMuscle: 'Quadriceps',
    secondaryMuscles: ['Fessiers', 'Adducteurs', 'Lombaires', 'Abdominaux'],
    bodyPart: 'Jambes & Fessiers',
    equipment: 'Barre',
    difficulty: 'Avancé',
    category: 'Musculation',
    muscleGroup: 'Jambes',
    description: 'Le pilier du renforcement des membres inférieurs et de la sécrétion hormonale anabolique.',
    instructions: [
      'Barre posée sur les trapèzes, pieds un peu plus larges que les épaules, pointes ouvertes.',
      'Initiez la descente en poussant les hanches en arrière et en ouvrant les genoux dans l’axe des orteils.',
      'Descendez au moins jusqu’à ce que les cuisses soient parallèles au sol (creux de hanche sous le genou).',
      'Poussez fort sur tout le pied pour remonter en gardant le torse fier.'
    ],
    tips: ["Ouvrez les genoux dans l'axe des pieds tout au long de la descente.","Gardez le regard devant vous et le dos droit.","Descendez au moins à parallèle pour un recrutement maximal."],
    variants: ["Squat avant (barre devant)","Squat Goblet avec haltère","Squat en box (banc)"],
    similarExerciseIds: ["ex-leg-press","ex-bulgarian-split-squat","ex-hip-thrust"],
    commonMistakes: [
      'Rentrer les genoux vers l’intérieur (valgus dynamique du genou).',
      'Décoller les talons du sol pendant la flexion.',
      'Arrondir le dos (buttwink excessif).'
    ],
    defaultSets: 4,
    defaultReps: 6,
    defaultRestSec: 120,
    isFavorite: true,
  },
  {
    id: 'ex-leg-press',
    name: 'Presse à Cuisses Inclinée à 45°',
    primaryMuscle: 'Quadriceps',
    secondaryMuscles: ['Fessiers', 'Ischio-jambiers'],
    bodyPart: 'Jambes & Fessiers',
    equipment: 'Machines',
    difficulty: 'Débutant',
    category: 'Musculation',
    muscleGroup: 'Jambes',
    description: 'Permet de surcharger les quadriceps en toute sécurité sans compression axiale vertébrale.',
    instructions: [
      'Dos et fessiers fermement calés contre le dossier, pieds au centre du plateau.',
      'Déverrouillez la sécurité, descendez le plateau jusqu’à un angle de 90° aux genoux.',
      'Repoussez le plateau sans bloquer/hyperextensionner les genoux en haut.'
    ],
    tips: ["Ne décollez jamais les fesses du siège en bas du mouvement.","Les pieds restent bien à plat sur le plateau.","Ne verrouillez pas les genoux en extension."],
    variants: ["Presse à cuisses horizontale","Presse avec pieds hauts (plus de fessiers)","Presse unilatérale"],
    similarExerciseIds: ["ex-barbell-squat","ex-bulgarian-split-squat","ex-sumo-squat-pause"],
    commonMistakes: [
      'Décoller les fesses ou le bas du dos du siège en bas du mouvement.',
      'Verrouiller brutalement les genoux en fin d’extension.'
    ],
    defaultSets: 4,
    defaultReps: 10,
    defaultRestSec: 90,
  },
  {
    id: 'ex-bulgarian-split-squat',
    name: 'Fentes Bulgares aux Haltères',
    primaryMuscle: 'Quadriceps',
    secondaryMuscles: ['Fessiers', 'Ischio-jambiers', 'Équilibre'],
    bodyPart: 'Jambes & Fessiers',
    equipment: 'Haltères',
    difficulty: 'Intermédiaire',
    category: 'Musculation',
    muscleGroup: 'Jambes',
    description: 'Exercice unilatéral formidable pour corriger les asymétries et forger cuisses et fessiers.',
    instructions: [
      'Un pied posé sur un banc derrière vous, l’autre pied bien ancré 1 mètre en avant.',
      'Descendez le genou arrière vers le sol jusqu’à frôler la surface.',
      'Poussez sur le talon avant pour remonter de manière fluide.'
    ],
    tips: ["Gardez le buste droit, ne penchez pas de travers.","Le genou avant ne dépasse pas la pointe du pied.","Poussez sur le talon avant pour remonter."],
    variants: ["Fente arrière statique","Fente bulgare avec barre","Fente bulgare avec pause en bas"],
    similarExerciseIds: ["ex-barbell-squat","ex-leg-press","ex-reverse-lunges"],
    commonMistakes: [
      'Pied avant trop proche du banc (trop de contrainte patellaire).',
      'Pencher excessivement le buste de travers.'
    ],
    defaultSets: 3,
    defaultReps: 10,
    defaultRestSec: 75,
    isFavorite: true,
  },

  // ==================== ISCHIO-JAMBIERS ====================
  {
    id: 'ex-romanian-deadlift',
    name: 'Soulevé de Terre Roumain (RDL Haltères / Barre)',
    primaryMuscle: 'Ischio-jambiers',
    secondaryMuscles: ['Fessiers', 'Lombaires', 'Avant-bras'],
    bodyPart: 'Jambes & Fessiers',
    equipment: 'Haltères',
    difficulty: 'Intermédiaire',
    category: 'Musculation',
    muscleGroup: 'Jambes',
    description: 'Le meilleur exercice pour étirer et hypertrophier les ischios avec un hip hinge parfait.',
    instructions: [
      'Debout, genoux déverrouillés (très légers 15° de flexion), barre/haltères contre les cuisses.',
      'Poussez les fesses loin en arrière tout en penchant le buste en avant dos plat.',
      'Descendez les poids sous les genoux jusqu’à ressentir un étirement net des ischios.',
      'Contractez les fessiers pour ramener les hanches en avant.'
    ],
    tips: ["Poussez les hanches très loin en arrière.","Descendez jusqu'à ressentir un étirement intense des ischios.","Gardez le dos plat, ne cherchez jamais le sol."],
    variants: ["RDL unilatéral","RDL avec barre","RDL déficit (sur marche)"],
    similarExerciseIds: ["ex-deadlift","ex-lying-leg-curl","ex-hip-thrust"],
    commonMistakes: [
      'Fléchir trop les genoux (transforme le mouvement en squat).',
      'Arrondir la colonne vertébrale pour aller chercher le sol.'
    ],
    defaultSets: 4,
    defaultReps: 10,
    defaultRestSec: 90,
    isFavorite: true,
  },
  {
    id: 'ex-lying-leg-curl',
    name: 'Leg Curl Couché à la Machine',
    primaryMuscle: 'Ischio-jambiers',
    secondaryMuscles: ['Mollets'],
    bodyPart: 'Jambes & Fessiers',
    equipment: 'Machines',
    difficulty: 'Débutant',
    category: 'Musculation',
    muscleGroup: 'Jambes',
    description: 'Isolation directe de la fonction de flexion du genou des ischio-jambiers.',
    instructions: [
      'Allongé à plat ventre, boudin positionné juste au-dessus des talons.',
      'Fléchissez les jambes vers les fessiers en gardant le bassin plaqué au banc.',
      'Contrôlez la descente sans relâcher la charge.'
    ],
    tips: ["Plaquez le bassin au sol pour éviter de compenser.","Montez le boudin de façon contrôlée sans élan.","La descente est lente pour profiter de l'excentrique."],
    variants: ["Leg Curl debout","Leg Curl assis","Leg Curl avec élastique"],
    similarExerciseIds: ["ex-romanian-deadlift","ex-barbell-squat","ex-nordic-negative"],
    commonMistakes: [
      'Décoller le bassin du banc pendant la contraction.',
      'Utiliser l’élan pour lancer le boudin.'
    ],
    defaultSets: 3,
    defaultReps: 12,
    defaultRestSec: 60,
  },

  // ==================== FESSIERS ====================
  {
    id: 'ex-hip-thrust',
    name: 'Hip Thrust à la Barre sur Banc',
    primaryMuscle: 'Fessiers',
    secondaryMuscles: ['Ischio-jambiers', 'Quadriceps', 'Abdos'],
    bodyPart: 'Jambes & Fessiers',
    equipment: 'Barre',
    difficulty: 'Intermédiaire',
    category: 'Musculation',
    muscleGroup: 'Jambes',
    description: 'L’exercice roi pour la force et le développement du grand fessier.',
    instructions: [
      'Haut du dos calé contre le banc, barre capitonnée posée sur le creux des hanches.',
      'Pieds au sol écartés largeur d’épaules, tibias verticaux en haut du mouvement.',
      'Poussez dans les talons pour monter le bassin jusqu’à aligner genoux, hanches et épaules.',
      'Serrez fort les fessiers 1 à 2 secondes au sommet avec rétroversion du bassin.'
    ],
    tips: ["Serrez très fort les fessiers en haut et maintenez 1-2 secondes.","Le menton reste rentré, le regard vers les genoux.","Poussez par les talons, pas par les orteils."],
    variants: ["Hip Thrust unilatéral","Hip Thrust avec haltère sur le bassin","Glute Bridge au sol (plus simple)"],
    similarExerciseIds: ["ex-glute-kickback-cable","ex-barbell-squat","ex-romanian-deadlift"],
    commonMistakes: [
      'Hyperextension lombaire (cambrer le bas du dos au lieu de contracter les fesses).',
      'Pieds trop en avant ou trop en arrière.'
    ],
    defaultSets: 4,
    defaultReps: 10,
    defaultRestSec: 90,
    isFavorite: true,
  },
  {
    id: 'ex-glute-kickback-cable',
    name: 'Kickback Fessier à la Poulie Basse / Élastique',
    primaryMuscle: 'Fessiers',
    secondaryMuscles: ['Ischio-jambiers'],
    bodyPart: 'Jambes & Fessiers',
    equipment: 'Poulie',
    difficulty: 'Débutant',
    category: 'Musculation',
    muscleGroup: 'Jambes',
    description: 'Isolation ciblée de la portion haute et médiane du grand fessier.',
    instructions: [
      'Sangle de cheville attachée à la poulie basse, buste légèrement incliné en appui.',
      'Poussez la jambe vers l’arrière et légèrement vers l’extérieur en contractant le fessier.',
      'Maintenez 1s en fin de course sans cambrer le bas du dos.'
    ],
    tips: ["Ne cambrez pas le bas du dos en poussant la jambe.","Le buste reste stable et légèrement incliné.","Concentrez-vous sur la contraction du fessier, pas sur l'amplitude."],
    variants: ["Kickback fessier avec élastique","Kickback fessier machine","Donkey kick au sol"],
    similarExerciseIds: ["ex-hip-thrust","ex-abductor-clamshell","ex-bulgarian-split-squat"],
    commonMistakes: [
      'Faire pivoter le bassin de travers.',
      'Balancement du buste.'
    ],
    defaultSets: 3,
    defaultReps: 15,
    defaultRestSec: 45,
  },

  // ==================== MOLLETS ====================
  {
    id: 'ex-standing-calf-raises',
    name: 'Mollets Debout à la Machine / Haltère',
    primaryMuscle: 'Mollets',
    secondaryMuscles: ['Chevilles', 'Plante des pieds'],
    bodyPart: 'Jambes & Fessiers',
    equipment: 'Machines',
    difficulty: 'Débutant',
    category: 'Musculation',
    muscleGroup: 'Jambes',
    description: 'Sollicite les jumeaux (gastrocnémiens) du mollet en position jambes tendues.',
    instructions: [
      'Pointe des pieds posée sur le rebord de la cale, talons dans le vide.',
      'Descendez au maximum pour un étirement complet du mollet.',
      'Montez sur la pointe des pieds aussi haut que possible et marquez une pause au sommet.'
    ],
    tips: ["Montez sur la pointe des pieds et marquez une pause de 1-2 secondes.","Descendez lentement pour étirer complètement le mollet.","Ne pliez pas les genoux, gardez-les tendus."],
    variants: ["Mollets assis à la machine","Mollets debout avec haltères","Mollets sur marche (amplitude)"],
    similarExerciseIds: ["ex-bodyweight-calf-raises","ex-jump-rope","ex-heel-toe-walk"],
    commonMistakes: [
      'Rebonds rapides sans temps d’arrêt.',
      'Plier les genoux pendant l’exercice.'
    ],
    defaultSets: 4,
    defaultReps: 15,
    defaultRestSec: 60,
  },

  // ==================== ADDUCTEURS & ABDUCTEURS ====================
  {
    id: 'ex-adductor-machine',
    name: 'Machine Adducteurs (Assis)',
    primaryMuscle: 'Adducteurs',
    secondaryMuscles: ['Hanches', 'Plancher pelvien'],
    bodyPart: 'Jambes & Fessiers',
    equipment: 'Machines',
    difficulty: 'Débutant',
    category: 'Musculation',
    muscleGroup: 'Jambes',
    description: 'Renforce l’intérieur des cuisses et protège l’aine des blessures sportives.',
    instructions: [
      'Assis le dos droit contre le dossier, jambes écartées contre les coussins.',
      'Resserrez les jambes de façon fluide et contrôlée jusqu’au contact.',
      'Contrôlez l’ouverture sans laisser les plaques claquer.'
    ],
    tips: ["Contrôlez le mouvement dans les deux sens.","Ne chargez pas trop pour éviter les blessures à l'aine.","Le dos reste droit contre le dossier."],
    variants: ["Adducteurs avec élastique allongé","Écarté adducteur sur banc","Étirement papillon"],
    similarExerciseIds: ["ex-abductor-clamshell","ex-bulgarian-split-squat","ex-sumo-squat-pause"],
    commonMistakes: [
      'Ouvrir trop brutalement avec une charge excessive.',
      'Décoller les fesses du siège.'
    ],
    defaultSets: 3,
    defaultReps: 15,
    defaultRestSec: 45,
  },
  {
    id: 'ex-abductor-clamshell',
    name: 'Clamshell avec Élastique (Moyen Fessier / Abducteurs)',
    primaryMuscle: 'Abducteurs',
    secondaryMuscles: ['Fessiers (moyen/petit)', 'Stabilité de hanche'],
    bodyPart: 'Jambes & Fessiers',
    equipment: 'Élastiques',
    difficulty: 'Débutant',
    category: 'Mobilité & Étirements',
    muscleGroup: 'Jambes',
    description: 'Renforcement du moyen fessier pour stabiliser le bassin et le genou lors de la marche et course.',
    instructions: [
      'Allongé sur le côté, élastique autour des genoux, hanches fléchies à 45° et genoux à 90°.',
      'Gardez les pieds joints et ouvrez le genou supérieur vers le haut comme un coquillage.',
      'Redescendez lentement sans tourner le bassin vers l’arrière.'
    ],
    tips: ["Ne tournez pas le bassin vers l'arrière en ouvrant le genou.","Contrôlez le retour sans laisser le genou retomber.","Respirez normalement pendant l'exercice."],
    variants: ["Clamshell allongé sur le dos","Abduction debout avec élastique","Side-lying hip abduction"],
    similarExerciseIds: ["ex-adductor-machine","ex-glute-kickback-cable","ex-hip-thrust"],
    commonMistakes: [
      'Laisser le bassin basculer en arrière.',
      'Décoller les pieds l’un de l’autre.'
    ],
    defaultSets: 3,
    defaultReps: 20,
    defaultRestSec: 30,
  },

  // ==================== LOMBAIRES ====================
  {
    id: 'ex-hyperextension-bench',
    name: 'Hyperextensions au Banc Lombaire 45°',
    primaryMuscle: 'Lombaires',
    secondaryMuscles: ['Fessiers', 'Ischio-jambiers'],
    bodyPart: 'Abdominaux & Tronc',
    equipment: 'Banc',
    difficulty: 'Débutant',
    category: 'Musculation',
    muscleGroup: 'Dos',
    description: 'Renforce les érecteurs du rachis et prévient les douleurs lombaires chroniques.',
    instructions: [
      'Bassin calé sur le coussin (sous la crête iliaque pour permettre la flexion de hanche), chevilles bloquées.',
      'Fléchissez le buste vers le sol, puis remontez en alignant le tronc avec les jambes.',
      'Ne dépassez pas la ligne neutre (ne pas hyper-cambrer en haut).'
    ],
    tips: ["Ne dépassez pas la ligne droite en haut du mouvement.","Croisez les bras sur la poitrine pour plus de stabilité.","Le mouvement est lent et contrôlé."],
    variants: ["Hyperextensions avec haltère","Hyperextensions à 90°","Superman au sol"],
    similarExerciseIds: ["ex-deadlift","ex-romanian-deadlift","ex-barbell-row"],
    commonMistakes: [
      'Hyperextension violente du dos en fin de montée.',
      'Mouvements saccadés.'
    ],
    defaultSets: 3,
    defaultReps: 12,
    defaultRestSec: 60,
  },

  // ==================== COU & POIGNETS ====================
  {
    id: 'ex-neck-flexion-isometric',
    name: 'Renforcement Isométrique du Cou (4 Directions)',
    primaryMuscle: 'Cou',
    secondaryMuscles: ['Trapèzes'],
    bodyPart: 'Articulations & Mobilité',
    equipment: 'Poids du corps',
    difficulty: 'Débutant',
    category: 'Mobilité & Étirements',
    muscleGroup: 'Full Body',
    description: 'Consolide la colonne cervicale et prévient les tensions dues aux écrans.',
    instructions: [
      'Assis droit, placez la paume de main sur le front et appliquez une pression modérée vers l’arrière tout en résistant avec le cou (sans bouger).',
      'Répétez sur l’arrière du crâne, puis sur le côté gauche et le côté droit.',
      'Maintenez chaque contraction 6 à 8 secondes.'
    ],
    tips: ["La pression doit être progressive, jamais brutale.","Gardez le dos droit et les épaules relâchées.","Contractez 6-8 secondes par direction."],
    variants: ["Isométrie du cou avec élastique","Réhabilitation du cou avec mouvement lent","Extension isométrique du cou"],
    similarExerciseIds: ["ex-scapular-squeeze","ex-plank","ex-wall-isometric-press"],
    commonMistakes: [
      'Forcer trop brutalement.',
      'Perdre l’alignement de la nuque.'
    ],
    defaultSets: 3,
    defaultReps: '8 sec / direction',
    defaultRestSec: 30,
  },
  {
    id: 'ex-wrist-roller-mobility',
    name: 'Rotations et Mobilité Articulaire des Poignets',
    primaryMuscle: 'Poignets',
    secondaryMuscles: ['Avant-bras'],
    bodyPart: 'Articulations & Mobilité',
    equipment: 'Poids du corps',
    difficulty: 'Débutant',
    category: 'Mobilité & Étirements',
    muscleGroup: 'Bras',
    description: 'Délie les capsules articulaires et réchauffe le liquide synovial des poignets.',
    instructions: [
      'Entrecroisez les doigts et réalisez des cercles lents en forme de 8.',
      'Placez ensuite le dos des mains l’un contre l’autre coudes ouverts pour étirer doucement les extenseurs.',
      'Effectuez 20 rotations dans chaque sens.'
    ],
    tips: ["Les mouvements doivent être lents et progressifs.","Ne forcez pas en cas de douleur.","Utilisez le mouvement en huit infini pour mobiliser toutes les directions."],
    variants: ["Rotations poignet avec bouteille remplie","Flexion/extension passive du poignet","Étirement du poignet en flexion"],
    similarExerciseIds: ["ex-reverse-prayer","ex-pronation-supination","ex-wrist-curls"],
    commonMistakes: [
      'Mouvements trop rapides ou douloureux.'
    ],
    defaultSets: 2,
    defaultReps: '20 rotations',
    defaultRestSec: 30,
  },

  // ==================== HANCHES, GENOUX & MOBILITÉ ====================
  {
    id: 'ex-90-90-hip-mobility',
    name: 'Mobilité des Hanches 90/90 (Rotation Interne & Externe)',
    primaryMuscle: 'Hanches',
    secondaryMuscles: ['Fessiers', 'Adducteurs', 'Bassin'],
    bodyPart: 'Articulations & Mobilité',
    equipment: 'Mobilité',
    difficulty: 'Intermédiaire',
    category: 'Mobilité & Étirements',
    muscleGroup: 'Jambes',
    description: 'Débloque la rotation interne et externe des hanches pour des squats plus profonds et sans douleur.',
    instructions: [
      'Assis au sol, placez une jambe pliée à 90° devant vous et l’autre pliée à 90° sur le côté.',
      'Buste bien droit, penchez-vous doucement sur la jambe avant pendant 30 secondes.',
      'Basculez les genoux de l’autre côté sans vous aider des mains si possible.'
    ],
    tips: ["Penchez-vous depuis les hanches, pas du dos.","La douleur ne doit jamais être acute, ajustez l'amplitude.","Basculez doucement d'un côté à l'autre."],
    variants: ["90/90 avec rotation thoracique","90/90 actif sans les mains","Pigeon stretch au sol"],
    similarExerciseIds: ["ex-worlds-greatest-stretch","ex-ankle-dorsiflexion-wall","ex-barbell-squat"],
    commonMistakes: [
      'Arrondir le dos au lieu de basculer au niveau du bassin.',
      'Forcer en cas de douleur aiguë au genou.'
    ],
    defaultSets: 2,
    defaultReps: '10 transitions',
    defaultRestSec: 45,
  },
  {
    id: 'ex-tibialis-raises',
    name: 'Élévations Tibiales (Santé des Genoux & Chevilles)',
    primaryMuscle: 'Genoux',
    secondaryMuscles: ['Chevilles', 'Jambier antérieur'],
    bodyPart: 'Articulations & Mobilité',
    equipment: 'Poids du corps',
    difficulty: 'Débutant',
    category: 'Musculation',
    muscleGroup: 'Jambes',
    description: 'Renforce le muscle tibial antérieur pour absorber les chocs et protéger les tendons rotuliens.',
    instructions: [
      'Dos appuyé contre un mur, pieds avancés d’environ 50 cm, jambes droites.',
      'Levez les orteils et l’avant du pied le plus haut possible vers le tibia en restant sur les talons.',
      'Maintenez 1 seconde en haut puis redescendez lentement.'
    ],
    tips: ["Montez les orteils le plus haut possible vers le tibia.","Descendez lentement pour un travail excentrique efficace.","Ne pliez pas les genoux."],
    variants: ["Tibialis avec élastique","Tibialis avec pied en pointe sur marche","Tibialis unilatéral"],
    similarExerciseIds: ["ex-standing-calf-raises","ex-ankle-dorsiflexion-wall","ex-foot-alphabet"],
    commonMistakes: [
      'Plier les genoux pour compenser.',
      'Faire des mouvements partiels.'
    ],
    defaultSets: 3,
    defaultReps: 20,
    defaultRestSec: 45,
  },
  {
    id: 'ex-ankle-dorsiflexion-wall',
    name: 'Dorsiflexion de Cheville Contre Mur',
    primaryMuscle: 'Chevilles',
    secondaryMuscles: ['Mollets', 'Tendon d’Achille'],
    bodyPart: 'Articulations & Mobilité',
    equipment: 'Étirements',
    difficulty: 'Débutant',
    category: 'Mobilité & Étirements',
    muscleGroup: 'Jambes',
    description: 'Augmente l’amplitude de flexion de la cheville indispensable pour un squat profond et stable.',
    instructions: [
      'Face à un mur en fente, pied avant à environ 10 cm du mur.',
      'Poussez le genou avant vers le mur sans décoller le talon du sol.',
      'Touchez le mur avec le genou, maintenez 2 secondes, puis reculez légèrement le pied si c’est trop facile.'
    ],
    tips: ["Le talon reste plaqué au sol pendant toute la poussée.","Le genou va droit vers le mur, pas vers l'intérieur.","Augmentez progressivement la distance au mur."],
    variants: ["Dorsiflexion en squat","Dorsiflexion avec élastique","Mobilisation cheville assise"],
    similarExerciseIds: ["ex-90-90-hip-mobility","ex-tibialis-raises","ex-foot-alphabet"],
    commonMistakes: [
      'Décoller le talon avant du sol.',
      'Faire dévier le genou vers l’intérieur.'
    ],
    defaultSets: 3,
    defaultReps: '10 reps / côté',
    defaultRestSec: 30,
  },
  {
    id: 'ex-worlds-greatest-stretch',
    name: 'Le Plus Grand Étirement du Monde (World’s Greatest Stretch)',
    primaryMuscle: 'Mobilité générale',
    secondaryMuscles: ['Hanches', 'Rachis thoracique', 'Ischios', 'Psoas', 'Épaules'],
    bodyPart: 'Articulations & Mobilité',
    equipment: 'Mobilité',
    difficulty: 'Intermédiaire',
    category: 'Mobilité & Étirements',
    muscleGroup: 'Full Body',
    description: 'L’échauffement dynamique complet mobilisant l’ensemble des grandes chaînes articulaires en un seul enchaînement.',
    instructions: [
      'Mettez-vous en fente avant profonde, mains au sol à l’intérieur du pied avant.',
      'Descendez le coude intérieur vers le sol pour étirer la hanche.',
      'Tournez le torse et tendez ce même bras vers le plafond en regardant votre main (rotation thoracique).',
      'Reposez la main et tendez la jambe avant pour étirer les ischio-jambiers.'
    ],
    tips: ["Respirez profondément à chaque étape du mouvement.","Ne forcez pas l'étirement, progressez par la respiration.","Alternez les côtés de façon symétrique."],
    variants: ["World's Greatest Stretch avec rotation complète","Variante sans rotation thoracique (débutant)","Enchaînement avec fente rotative"],
    similarExerciseIds: ["ex-90-90-hip-mobility","ex-ankle-dorsiflexion-wall","ex-barbell-squat"],
    commonMistakes: [
      'Précipiter les mouvements sans respirer profondément.',
      'Bloquer la rotation thoracique.'
    ],
    defaultSets: 2,
    defaultReps: '5 par côté',
    defaultRestSec: 45,
    isFavorite: true,
  },

  // ==================== CARDIO ====================
  {
    id: 'ex-jump-rope',
    name: 'Corde à Sauter Rapide',
    primaryMuscle: 'Mollets',
    secondaryMuscles: ['Épaules', 'Cardio', 'Abdominaux'],
    bodyPart: 'Cardio',
    equipment: 'Cardio',
    difficulty: 'Débutant',
    category: 'Cardio',
    muscleGroup: 'Cardio',
    description: 'Excellent brûleur de calories améliorant la coordination, la réactivité des chevilles et l’endurance.',
    instructions: [
      'Coudes près du corps, rotation assurée uniquement par les poignets.',
      'Rebondissez souplement sur la pointe des pieds en amortissant avec les genoux.',
      'Maintenez un rythme régulier et respirez par le nez.'
    ],
    tips: ["Rebondissez sur la pointe des pieds, jamais à plat.","Les coudes restent proches du corps, rotation par les poignets.","Gardez un rythme régulier plutôt que de sauter haut."],
    variants: ["Double-unders (double rotation)","Corde à sauter sur un pied","Corde avec esquive latérale"],
    similarExerciseIds: ["ex-jumping-jacks","ex-rower-hiit","ex-standing-calf-raises"],
    commonMistakes: [
      'Sauter trop haut avec les jambes raides.',
      'Faire tourner les bras entiers au lieu des poignets.'
    ],
    defaultSets: 4,
    defaultReps: '2 minutes',
    defaultRestSec: 45,
  },
  {
    id: 'ex-rower-hiit',
    name: 'Rameur Ergometer (Fractionné ou Continu)',
    primaryMuscle: 'Dos',
    secondaryMuscles: ['Jambes', 'Cardio', 'Biceps', 'Tronc'],
    bodyPart: 'Cardio',
    equipment: 'Cardio',
    difficulty: 'Intermédiaire',
    category: 'Cardio',
    muscleGroup: 'Cardio',
    description: 'Sollicite 85% de la masse musculaire totale pour une capacité aérobie et anaérobie maximale.',
    instructions: [
      'Séquence de poussée : Jambes (60%) -> Tronc (20%) -> Bras (20%).',
      'Séquence de retour : Bras -> Tronc -> Jambes.',
      'Gardez le dos droit et tirez la poignée sous la poitrine.'
    ],
    tips: ["La poussée des jambes représente 60% de l'effort.","Le dos reste droit, ne cambrez pas.","Respirez sur l'effort en inspirant à la poussée."],
    variants: ["Rowing en endurance continue","Rowing Tabata (20s effort / 10s repos)","Rowing avec résistance fixe élevée"],
    similarExerciseIds: ["ex-jump-rope","ex-jumping-jacks","ex-barbell-row"],
    commonMistakes: [
      'Tirer avec les bras avant d’avoir poussé avec les jambes.',
      'Arrondir le dos à l’avant du rail.'
    ],
    defaultSets: 4,
    defaultReps: '500 mètres',
    defaultRestSec: 60,
  },

  {
    id: 'ex-jumping-jacks', name: 'Jumping jacks', primaryMuscle: 'Cardio', secondaryMuscles: ['Jambes','Épaules'], bodyPart: 'Cardio', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Cardio', muscleGroup: 'Cardio', description: 'Échauffement dynamique.', instructions: ['Rythme modéré, mouvements contrôlés.'], tips: ["Gardez les mouvements amples mais contrôlés.","Atterrissez souplement sur la pointe des pieds.","Respirez régulièrement tout au long de l'exercice."],variants: ["Jumping Jacks latéraux","Star Jacks (avec extensions)","Jumping Jacks à bras tendus"],similarExerciseIds: ["ex-jump-rope","ex-rower-hiit","ex-wall-sit"],defaultSets: 1, defaultReps: '30 sec', defaultRestSec: 15,
  },
  {
    id: 'ex-pelvic-lift', name: 'Relevé de bassin', primaryMuscle: 'Abdominaux', secondaryMuscles: ['Hanches'], bodyPart: 'Abdominaux & Tronc', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Poids du corps', muscleGroup: 'Abdos', description: 'Relevé du bassin jambes vers le plafond.', instructions: ['Décolle le bassin sans élan.'], tips: ["Contrôlez la montée et la descente sans élan.","Serrez les fessiers en haut du mouvement.","Gardez les bras le long du corps pour stabilité."],variants: ["Pont fessier unilatéral","Pont fessier avec charge sur le bassin","Pont fessier sur un pied"],similarExerciseIds: ["ex-hip-thrust","ex-hyperextension-bench","ex-plank"],defaultSets: 4, defaultReps: 15, defaultRestSec: 30,
  },
  {
    id: 'ex-leg-flutters', name: 'Battements de jambes', primaryMuscle: 'Abdominaux', secondaryMuscles: ['Hanches'], bodyPart: 'Abdominaux & Tronc', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Poids du corps', muscleGroup: 'Abdos', description: 'Battements alternés jambes tendues.', instructions: ['Garde le bas du dos plaqué au sol.'], tips: ["Le bas du dos reste plaqué au sol tout au long.","Les jambes sont tendues, les orteils pointés.","Gardez le rythme régulier, ne dépassez pas l'amplitude de confort."],variants: ["Battements en planche","Battements avec genoux pliés","Battements verticaux"],similarExerciseIds: ["ex-scissors","ex-hanging-leg-raise","ex-plank"],defaultSets: 4, defaultReps: '50 sec', defaultRestSec: 30,
  },
  {
    id: 'ex-scissors', name: 'Ciseaux', primaryMuscle: 'Abdominaux', secondaryMuscles: ['Hanches'], bodyPart: 'Abdominaux & Tronc', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Poids du corps', muscleGroup: 'Abdos', description: 'Croisement contrôlé des jambes.', instructions: ['Évite les rebonds.'], tips: ["Croisez les jambes de façon contrôlée sans élan.","Le bas du dos reste au sol.","Gardez le mouvement régulier et la respiration constante."],variants: ["Ciseaux horizontaux","Ciseaux en planche","Ciseaux avec haltères aux chevilles"],similarExerciseIds: ["ex-leg-flutters","ex-hanging-leg-raise","ex-plank"],defaultSets: 4, defaultReps: '50 sec', defaultRestSec: 30,
  },
  {
    id: 'ex-side-plank-rotation', name: 'Planche latérale + rotation', primaryMuscle: 'Abdominaux', secondaryMuscles: ['Épaules','Obliques'], bodyPart: 'Abdominaux & Tronc', equipment: 'Poids du corps', difficulty: 'Intermédiaire', category: 'Poids du corps', muscleGroup: 'Abdos', description: 'Planche latérale avec rotation du tronc.', instructions: ['Corps aligné, rotation contrôlée.'], tips: ["Gardez les hanches alignées, ne laissez pas le bassin tomber.","La rotation se fait depuis le tronc, pas les bras.","Regardez la main qui monte pendant la rotation."],variants: ["Planche latérale statique","Planche latérale avec élévation de hanche","Planche latérale sur genoux"],similarExerciseIds: ["ex-plank","ex-russian-twist","ex-plank-bodyweight"],defaultSets: 4, defaultReps: '30 sec/côté', defaultRestSec: 20,
  },
  {
    id: 'ex-russian-twist', name: 'Russian twist sans poids', primaryMuscle: 'Abdominaux', secondaryMuscles: ['Obliques'], bodyPart: 'Abdominaux & Tronc', equipment: 'Poids du corps', difficulty: 'Intermédiaire', category: 'Poids du corps', muscleGroup: 'Abdos', description: 'Rotation du tronc sans charge.', instructions: ['Tourne le buste entier, pas seulement les bras.'], tips: ["Tournez le buste entier, pas seulement les bras.","Gardez les pieds légèrement au sol pour la stabilité.","Le dos reste droit, ne cambrez pas."],variants: ["Russian Twist avec poids","Russian Twist avec rotation complète","Russian Twist en V-sit"],similarExerciseIds: ["ex-side-plank-rotation","ex-plank","ex-hanging-leg-raise"],defaultSets: 4, defaultReps: 20, defaultRestSec: 30,
  },
  {
    id: 'ex-plank-bodyweight', name: 'Planche', primaryMuscle: 'Abdominaux', secondaryMuscles: ['Épaules','Lombaires'], bodyPart: 'Abdominaux & Tronc', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Poids du corps', muscleGroup: 'Abdos', description: 'Gainage frontal.', instructions: ['Garde le dos plat.'], tips: ["Gardez le dos strictement plat.","Serrez les abdos et les fessiers.","Ne retenez pas votre respiration."],variants: ["Planche sur les mains","Planche avec élévation de jambe","Planche dynamique (avant-bras/main)"],similarExerciseIds: ["ex-plank","ex-shoulder-tap-plank","ex-side-plank-rotation"],defaultSets: 4, defaultReps: '45 sec', defaultRestSec: 30,
  },
  {
    id: 'ex-bodyweight-squat', name: 'Squats', primaryMuscle: 'Quadriceps', secondaryMuscles: ['Fessiers','Ischio-jambiers'], bodyPart: 'Jambes & Fessiers', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Poids du corps', muscleGroup: 'Jambes', description: 'Squat au poids du corps.', instructions: ['Garde les genoux dans l’axe des pieds.'], tips: ["Les genoux suivent l'axe des pieds sans rentrer.","Descendez au moins à parallèle au sol.","Gardez le dos droit et le regard devant."],variants: ["Squat pause","Squat sumo","Squat sur une jambe (pistol)"],similarExerciseIds: ["ex-barbell-squat","ex-bulgarian-split-squat","ex-wall-sit"],defaultSets: 5, defaultReps: 20, defaultRestSec: 30,
  },
  {
    id: 'ex-reverse-lunges', name: 'Fentes arrière', primaryMuscle: 'Quadriceps', secondaryMuscles: ['Fessiers','Ischio-jambiers'], bodyPart: 'Jambes & Fessiers', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Poids du corps', muscleGroup: 'Jambes', description: 'Fente vers l’arrière.', instructions: ['Contrôle la descente.'], tips: ["Faites un pas ample vers l'arrière pour préserver le genou.","Le genou avant ne dépasse pas la pointe du pied.","Le buste reste droit pendant la descente."],variants: ["Fentes avant","Fentes latérales","Fentes marchées (en avant)"],similarExerciseIds: ["ex-bulgarian-split-squat","ex-barbell-squat","ex-bodyweight-squat"],defaultSets: 4, defaultReps: '20 reps (10/jambe)', defaultRestSec: 30,
  },
  {
    id: 'ex-single-leg-glute-bridge', name: 'Pont fessier unilatéral', primaryMuscle: 'Fessiers', secondaryMuscles: ['Ischio-jambiers'], bodyPart: 'Jambes & Fessiers', equipment: 'Poids du corps', difficulty: 'Intermédiaire', category: 'Poids du corps', muscleGroup: 'Jambes', description: 'Extension de hanche sur une jambe.', instructions: ['Pousse par le talon et contrôle la descente.'], tips: ["Poussez par le talon de la jambe d'appui.","Gardez les hanches nivelées sans rotation.","Serrez le fessier en haut et maintenez 1 seconde."],variants: ["Pont fessier bilatéral","Pont fessier avec charge sur le bassin","Hip Thrust sur banc"],similarExerciseIds: ["ex-hip-thrust","ex-glute-kickback-cable","ex-pelvic-lift"],defaultSets: 4, defaultReps: '12 reps/jambe', defaultRestSec: 30,
  },
  {
    id: 'ex-bodyweight-calf-raises', name: 'Élévation mollets', primaryMuscle: 'Mollets', secondaryMuscles: [], bodyPart: 'Jambes & Fessiers', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Poids du corps', muscleGroup: 'Jambes', description: 'Élévation sur la pointe des pieds.', instructions: ['Monte haut et redescends lentement.'], tips: ["Montez sur la pointe des pieds et maintenez 1 seconde.","Descendez lentement pour un étirement complet.","Utilisez un support pour l'équilibre si besoin."],variants: ["Mollets unilatéraux","Mollets sur marche","Mollets en pause 3 secondes en bas"],similarExerciseIds: ["ex-standing-calf-raises","ex-jump-rope","ex-heel-toe-walk"],defaultSets: 5, defaultReps: 25, defaultRestSec: 20,
  },
  {
    id: 'ex-wall-sit', name: 'La chaise', primaryMuscle: 'Quadriceps', secondaryMuscles: ['Fessiers'], bodyPart: 'Jambes & Fessiers', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Poids du corps', muscleGroup: 'Jambes', description: 'Maintien isométrique contre un mur.', instructions: ['Cuisses parallèles au sol si possible.'], tips: ["Les cuisses sont parallèles au sol, genoux à 90°.","Le dos est bien plaqué contre le mur.","Gardez la respiration régulière, ne bloquez pas."],variants: ["La chaise avec un ballon entre les genoux","La chaise unilatérale","La chaise avec charge sur les cuisses"],similarExerciseIds: ["ex-bodyweight-squat","ex-barbell-squat","ex-bulgarian-split-squat"],defaultSets: 4, defaultReps: '45 sec', defaultRestSec: 30,
  },
  {
    id: 'ex-nordic-negative', name: 'Nordic curl négatif', primaryMuscle: 'Ischio-jambiers', secondaryMuscles: ['Fessiers'], bodyPart: 'Jambes & Fessiers', equipment: 'Poids du corps', difficulty: 'Avancé', category: 'Poids du corps', muscleGroup: 'Jambes', description: 'Phase négative du Nordic curl.', instructions: ['Utilise un support stable pour bloquer les chevilles.'], tips: ["La phase excentrique doit durer au moins 3-5 secondes.","Utilisez les mains pour freiner si nécessaire.","Commencez avec une amplitude réduite et augmentez progressivement."],variants: ["Nordic curl complet (avec concentrique)","Nordic curl avec élastique assisté","Nordic curl sur machine"],similarExerciseIds: ["ex-romanian-deadlift","ex-lying-leg-curl","ex-barbell-squat"],defaultSets: 3, defaultReps: 5, defaultRestSec: 45,
  },
  {
    id: 'ex-glute-ham-raise-floor-assisted', name: 'Glute Ham Raise - Reverse Lying', primaryMuscle: 'Ischio-jambiers', secondaryMuscles: ['Fessiers'], bodyPart: 'Jambes & Fessiers', equipment: 'Poids du corps', difficulty: 'Intermédiaire', category: 'Poids du corps', muscleGroup: 'Jambes', description: 'Glute Ham Raise en version reverse lying : chevilles calées sous un support stable, bras croisés, aucun appui sur les mains, retour excentrique lent.', instructions: ['Allongé sur le dos, jambes tendues, chevilles calées fermement sous un meuble stable.', 'Bras croisés sur la poitrine (aucun appui sur les mains).', 'Contracte les ischio-jambiers et les fessiers pour tirer les talons vers toi, ce qui fait glisser le bassin vers l\'avant au fur et à mesure.', 'Reviens à la position tendue en contrôlant très lentement le retour : c\'est la phase la plus importante pour les ischios.'], tips: ["Ne va pas trop vite sur le retour à la position tendue.","La phase lente et contrôlée muscle vraiment les ischio-jambiers.","Contracte ischios et fessiers pour lancer le glissement du bassin."],variants: ["Glute-ham raise complet","Glute-ham raise évasion avec élastique","Glute-ham raise sur machine"],similarExerciseIds: ["ex-nordic-negative","ex-reverse-hyperextension","ex-single-leg-glute-bridge"],defaultSets: 4, defaultReps: 15, defaultRestSec: 30,
  },

  {
    id: 'ex-superman-ytw', name: 'Superman Y-T-W', primaryMuscle: 'Dos', secondaryMuscles: ['Épaules'], bodyPart: 'Dos', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Poids du corps', muscleGroup: 'Dos', description: 'Renforcement du haut du dos en position ventrale.', instructions: ['Effectue les positions Y, T et W lentement.'], tips: ["Gardez le front au sol pour protéger la nuque.","Le mouvement est lent et contrôlé, pas d'élan.","Contractez les omoplates en position T et W."],variants: ["Superman classique (bras tendus devant)","Superman avec rotation","Superman sur un banc"],similarExerciseIds: ["ex-swimming","ex-reverse-fly","ex-hyperextension-bench"],defaultSets: 4, defaultReps: 12, defaultRestSec: 30,
  },
  {
    id: 'ex-swimming', name: 'Nage / Swimming', primaryMuscle: 'Dos', secondaryMuscles: ['Épaules','Fessiers'], bodyPart: 'Dos', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Poids du corps', muscleGroup: 'Dos', description: 'Mouvement de nage au sol.', instructions: ['Allongé sur le ventre, alterne les mouvements bras/jambes.'], tips: ["Gardez le front au sol pour aligner la colonne.","Alternez les bras et jambes de façon coordonnée.","Le mouvement est lent et continu, sans élan."],variants: ["Natation sur le dos (superman inversé)","Natation avec tempo lent","Natation avec haltères légers"],similarExerciseIds: ["ex-superman-ytw","ex-reverse-fly","ex-hyperextension-bench"],defaultSets: 4, defaultReps: '30 sec', defaultRestSec: 30,
  },
  {
    id: 'ex-wall-isometric-press', name: 'Pression isométrique contre le mur (coude collé au corps)', primaryMuscle: 'Pectoraux', secondaryMuscles: ['Épaules','Triceps'], bodyPart: 'Pectoraux', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Poids du corps', muscleGroup: 'Pectoraux', description: 'Pression isométrique contre un mur, coude collé au corps, sans déplacer l’épaule.', instructions: ['Coude collé au corps (pas écarté à 90°), avant-bras contre le mur.', 'Pousse doucement sans forcer.', 'Maintiens 5 secondes par répétition.'], tips: ["Poussez contre le mur sans déplacer les épaules.","Le coude reste collé au corps pour protéger l'épaule.","Respirez normalement, ne bloquez pas."],variants: ["Pression isométrique en appui frontal","Pression isométrique sur genoux","Pression avec élastique"],similarExerciseIds: ["ex-bench-press","ex-pushups","ex-dips-chest"],defaultSets: 4, defaultReps: '8 reps x 5 sec', defaultRestSec: 20,
  },
  {
    id: 'ex-self-resisted-curl', name: 'Curl isométrique auto-résistance', primaryMuscle: 'Biceps', secondaryMuscles: ['Avant-bras'], bodyPart: 'Bras', equipment: 'Poids du corps', difficulty: 'Intermédiaire', category: 'Poids du corps', muscleGroup: 'Bras', description: 'Curl avec résistance de la main opposée.', instructions: ['La main opposée doit résister fortement.'], tips: ["La main opposée doit résister fortement tout au long.","Utilisez environ 50% de la force maximale.","Gardez le coude collé au corps."],variants: ["Curl auto-résisté en pronation","Curl auto-résisté assis","Curl auto-résisté avec tempo"],similarExerciseIds: ["ex-biceps-ez-curl","ex-hammer-curl","ex-incline-dumbbell-curl"],defaultSets: 4, defaultReps: '10 reps/bras', defaultRestSec: 30,
  },
  {
    id: 'ex-shoulder-tap-plank', name: 'Planche touché d’épaule', primaryMuscle: 'Abdominaux', secondaryMuscles: ['Épaules','Pectoraux'], bodyPart: 'Abdominaux & Tronc', equipment: 'Poids du corps', difficulty: 'Intermédiaire', category: 'Poids du corps', muscleGroup: 'Abdos', description: 'Gainage dynamique avec toucher d’épaule.', instructions: ['Évite de faire pivoter le bassin.'], tips: ["Le bassin reste stable, ne bougez pas les hanches.","Touchez l'épaule opposée avec contrôle.","Gardez les coudes sous les épaules."],variants: ["Planche touché d'épaule avec genoux au sol","Planche touché d'épaule dynamique","Planche avec rotation + toucher"],similarExerciseIds: ["ex-plank","ex-plank-bodyweight","ex-side-plank-rotation"],defaultSets: 4, defaultReps: 20, defaultRestSec: 30,
  },
  {
    id: 'ex-rhomboid-contraction', name: 'Contraction inclinée des rhomboïdes', primaryMuscle: 'Dos', secondaryMuscles: ['Épaules'], bodyPart: 'Dos', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Poids du corps', muscleGroup: 'Dos', description: 'Contraction des omoplates en position inclinée.', instructions: ['Tire les coudes vers l’arrière.'], tips: ["Concentrez-vous sur la contraction des omoplates.","Gardez les épaules basses, pas haussées.","Le mouvement est lent et contrôlé."],variants: ["Contraction rhomboïdes debout","Contraction rhomboïdes avec élastique","Face pull élastique"],similarExerciseIds: ["ex-scapular-squeeze","ex-reverse-fly","ex-face-pull"],defaultSets: 4, defaultReps: 15, defaultRestSec: 30,
  },
  {
    id: 'ex-ytwl', name: 'Y-T-W-L adaptatif', primaryMuscle: 'Épaules', secondaryMuscles: ['Dos'], bodyPart: 'Articulations & Mobilité', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Mobilité & Étirements', muscleGroup: 'Épaules', description: 'Contrôle des mouvements Y-T-W-L.', instructions: ['Mouvement lent et contrôlé.'], tips: ["Mouvement lent et contrôlé à chaque lettre.","Ne haussez pas les épaules en position Y.","Sentir la contraction de chaque groupe musculaire."],variants: ["YTWL allongé sur le ventre","YTWL avec élastique","YTWL debout avec haltères très légers"],similarExerciseIds: ["ex-superman-ytw","ex-reverse-fly","ex-face-pull"],defaultSets: 2, defaultReps: '10 reps par lettre', defaultRestSec: 20,
  },
  {
    id: 'ex-scapular-squeeze', name: 'Serré d’omoplates', primaryMuscle: 'Dos', secondaryMuscles: ['Épaules'], bodyPart: 'Dos', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Mobilité & Étirements', muscleGroup: 'Dos', description: 'Rétraction contrôlée des omoplates.', instructions: ['Maintiens 2 secondes puis relâche.'], tips: ["Serrez les omoplates comme pour écraser un crayon entre elles.","Maintenez la contraction 2 secondes au maximum.","Ne haussez pas les épaules."],variants: ["Serrage d'omoplates debout","Serrage avec élastique devant soi","Serrage avec rotation externe"],similarExerciseIds: ["ex-rhomboid-contraction","ex-face-pull","ex-reverse-fly"],defaultSets: 3, defaultReps: 12, defaultRestSec: 15,
  },
  {
    id: 'ex-jefferson-curl', name: 'Jefferson Curl à vide', primaryMuscle: 'Lombaires', secondaryMuscles: ['Ischio-jambiers'], bodyPart: 'Articulations & Mobilité', equipment: 'Poids du corps', difficulty: 'Intermédiaire', category: 'Mobilité & Étirements', muscleGroup: 'Jambes', description: 'Flexion contrôlée de la colonne sans charge.', instructions: ['Enroule et déroule très lentement.'], tips: ["Enroulez la colonne vertèbre par vertèbre.","Le mouvement est très lent, pas d'élan.","Ne descendez que jusqu'à la limite de souplesse confortable."],variants: ["Jefferson Curl avec poids léger","Jefferson Curl sur box","Jefferson Curl avec pause en bas"],similarExerciseIds: ["ex-hyperextension-bench","ex-romanian-deadlift","ex-worlds-greatest-stretch"],defaultSets: 3, defaultReps: 8, defaultRestSec: 20,
  },
  {
    id: 'ex-step-down', name: 'Step-down contrôlé', primaryMuscle: 'Quadriceps', secondaryMuscles: ['Fessiers'], bodyPart: 'Articulations & Mobilité', equipment: 'Autre', difficulty: 'Intermédiaire', category: 'Mobilité & Étirements', muscleGroup: 'Jambes', description: 'Contrôle du genou en descente depuis une marche stable.', instructions: ['Descends lentement et garde le genou aligné.'], tips: ["Le genou reste aligné avec le pied, ne rentre pas à l'intérieur.","La descente est très lente et contrôlée.","Gardez le buste droit, ne penchez pas en avant."],variants: ["Step-down avec haltères","Step-down depuis une hauteur plus importante","Step-down avec pause en bas"],similarExerciseIds: ["ex-bulgarian-split-squat","ex-knee-isometric-extension","ex-bodyweight-squat"],defaultSets: 3, defaultReps: '10 reps/jambe', defaultRestSec: 20,
  },
  {
    id: 'ex-knee-isometric-extension', name: 'Extension isométrique', primaryMuscle: 'Quadriceps', secondaryMuscles: [], bodyPart: 'Articulations & Mobilité', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Mobilité & Étirements', muscleGroup: 'Jambes', description: 'Contraction isométrique du quadriceps.', instructions: ['Jambe tendue, contracte sans douleur.'], tips: ["La contraction ne doit pas provoquer de douleur.","Maintenez la contraction 10 secondes maximum.","Relâchez progressivement sans élan."],variants: ["Extension isométrique avec sélecteur de force","Extension isométrique en début d'amplitude","Extension isométrique en fin d'amplitude"],similarExerciseIds: ["ex-wall-sit","ex-step-down","ex-bodyweight-squat"],defaultSets: 3, defaultReps: '10 sec/jambe', defaultRestSec: 15,
  },
  {
    id: 'ex-sumo-squat-pause', name: 'Squat sumo avec pause', primaryMuscle: 'Quadriceps', secondaryMuscles: ['Fessiers','Adducteurs'], bodyPart: 'Jambes & Fessiers', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Mobilité & Étirements', muscleGroup: 'Jambes', description: 'Squat sumo avec pause en bas.', instructions: ['Pieds larges, pointes légèrement vers l’extérieur, pause 3 secondes.'], tips: ["Les pieds sont larges et les pointes vers l'extérieur à 45°.","Maintenez la position basse pendant 3 secondes.","Poussez par les talons pour remonter."],variants: ["Sumo squat avec haltère","Sumo squat en relevé de talons","Sumo squat isométrique (pause longue)"],similarExerciseIds: ["ex-barbell-squat","ex-bodyweight-squat","ex-leg-press"],defaultSets: 3, defaultReps: '10 reps (pause 3 sec)', defaultRestSec: 30,
  },
  {
    id: 'ex-finger-pushups', name: 'Pompage sur les doigts', primaryMuscle: 'Avant-bras', secondaryMuscles: ['Poignets'], bodyPart: 'Articulations & Mobilité', equipment: 'Poids du corps', difficulty: 'Avancé', category: 'Mobilité & Étirements', muscleGroup: 'Bras', description: 'Mobilité et renforcement des doigts.', instructions: ['Utilise une amplitude confortable.'], tips: ["Utilisez une amplitude confortable sans douleur.","Commencez sur les genoux pour vous habituer.","Ne forcez pas les doigts au-delà de leur amplitude."],variants: ["Pompes sur les poings","Pompes sur les doigts en position inclinée","Pompes sur les doigts avec genoux au sol"],similarExerciseIds: ["ex-pushups","ex-wrist-curls","ex-pronation-supination"],defaultSets: 2, defaultReps: 8, defaultRestSec: 20,
  },
  {
    id: 'ex-reverse-prayer', name: 'Prière inversée', primaryMuscle: 'Poignets', secondaryMuscles: ['Avant-bras'], bodyPart: 'Articulations & Mobilité', equipment: 'Mobilité', difficulty: 'Débutant', category: 'Mobilité & Étirements', muscleGroup: 'Bras', description: 'Étirement des poignets en prière inversée.', instructions: ['Monte doucement les mains.'], tips: ["Montez les mains doucement sans forcer.","Maintenez la position 20 secondes.","Respirez profondément pendant l'étirement."],variants: ["Prière inversée assise","Prière inversée debout avec bras tendus","Prière inversée avec rotation"],similarExerciseIds: ["ex-pronation-supination","ex-wrist-roller-mobility","ex-foot-alphabet"],defaultSets: 3, defaultReps: '20 sec', defaultRestSec: 15,
  },
  {
    id: 'ex-pronation-supination', name: 'Pronation / supination', primaryMuscle: 'Avant-bras', secondaryMuscles: ['Poignets'], bodyPart: 'Articulations & Mobilité', equipment: 'Mobilité', difficulty: 'Débutant', category: 'Mobilité & Étirements', muscleGroup: 'Bras', description: 'Rotation de l’avant-bras.', instructions: ['Coude à 90° et proche du corps.'], tips: ["Le coude reste à 90° et collé au corps.","Le mouvement est lent et complet.","Utilisez un haltère léger pour commencer."],variants: ["Pronation/supination avec élastique","Pronation/supination avec bâton","Pronation/supination accélérée"],similarExerciseIds: ["ex-wrist-curls","ex-reverse-prayer","ex-wrist-roller-mobility"],defaultSets: 2, defaultReps: '12 reps/bras', defaultRestSec: 15,
  },
  {
    id: 'ex-foot-alphabet', name: 'Alphabet avec le pied', primaryMuscle: 'Chevilles', secondaryMuscles: [], bodyPart: 'Articulations & Mobilité', equipment: 'Mobilité', difficulty: 'Débutant', category: 'Mobilité & Étirements', muscleGroup: 'Jambes', description: 'Mobilité de cheville en dessinant l’alphabet.', instructions: ['Dessine les lettres avec la pointe du pied.'], tips: ["Dessinez chaque lettre avec la pointe du pied.","Le mouvement vient de la cheville, pas de la hanche.","Une fois par pied suffit pour un bon échauffement."],variants: ["Alphabet en rotation","Alphabet lent et contrôlé","Alphabet du pied avec resistance (bande)"],similarExerciseIds: ["ex-ankle-dorsiflexion-wall","ex-tibialis-raises","ex-single-leg-balance"],defaultSets: 1, defaultReps: '1 fois par pied', defaultRestSec: 15,
  },
  {
    id: 'ex-heel-toe-walk', name: 'Marche talons/pointes', primaryMuscle: 'Mollets', secondaryMuscles: ['Chevilles'], bodyPart: 'Articulations & Mobilité', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Mobilité & Étirements', muscleGroup: 'Jambes', description: 'Marche alternée sur talons et pointes.', instructions: ['10 m sur les talons puis 10 m sur les pointes.'], tips: ["10 m sur les talons puis 10 m sur les pointes.","Gardez le dos droit et le regard devant.","Pas besoin de vitesse, privilégiez le contrôle."],variants: ["Marche sur les talons à reculons","Marche sur les pointes avec hauteur","Marche sur les bords externes"],similarExerciseIds: ["ex-standing-calf-raises","ex-bodyweight-calf-raises","ex-single-leg-balance"],defaultSets: 2, defaultReps: '20 m', defaultRestSec: 20,
  },
  {
    id: 'ex-single-leg-balance', name: 'Équilibre sur une jambe', primaryMuscle: 'Chevilles', secondaryMuscles: ['Jambes'], bodyPart: 'Articulations & Mobilité', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Mobilité & Étirements', muscleGroup: 'Jambes', description: 'Travail d’équilibre et de stabilité.', instructions: ['Yeux ouverts ; ferme-les seulement si tu progresses et en sécurité.'], tips: ["Commencez avec les yeux ouverts, puis testez les yeux fermés.","Le genou est légèrement fléchi, pas en hyperextension.","Fixez un point devant vous pour faciliter l'équilibre."],variants: ["Équilibre sur une jambe les yeux fermés","Équilibre sur une jambe avec bras tendus","Équilibre sur une jambe sur surface instable"],similarExerciseIds: ["ex-foot-alphabet","ex-ankle-dorsiflexion-wall","ex-tibialis-raises"],defaultSets: 3, defaultReps: '20 sec/jambe', defaultRestSec: 15,
  },
  {
    id: 'ex-high-knees', name: 'Montées de genoux sur place', primaryMuscle: 'Jambes', secondaryMuscles: ['Quadriceps','Mollets','Abdominaux'], bodyPart: 'Cardio', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Cardio', muscleGroup: 'Cardio', description: 'Échauffement cardio en montant les genoux vers la poitrine.', instructions: ['Montez les genoux en alternance jusqu’à hauteur du bassin.', 'Gardez un rythme régulier sur la pointe des pieds.', 'Buste droit et bras légers balancés.'], tips: ["Montez les genoux à hauteur du bassin à chaque répétition.","Atterrissez souplement sur l'avant du pied.","Gardez un rythme régulier et respirez."],
    variants: ["Montées de genoux rapides","Montées de genoux en marchant","Montées de genoux avec rotation de hanche"],
    similarExerciseIds: ["ex-jumping-jacks","ex-jump-rope","ex-bodyweight-squat"],
    commonMistakes: ["Courber le dos vers l'avant.","Descendre les genoux en dessous de la hauteur du bassin."],
    defaultSets: 1, defaultReps: '30 sec', defaultRestSec: 15,
  },
  {
    id: 'ex-starfish-crunch', name: 'Étoile de mer / crunch latéral', primaryMuscle: 'Abdominaux', secondaryMuscles: ['Obliques','Hanches'], bodyPart: 'Abdominaux & Tronc', equipment: 'Poids du corps', difficulty: 'Débutant', category: 'Poids du corps', muscleGroup: 'Abdos', description: 'Crunch latéral en étoile : on décolle côté opposé jambe+tore sans appui sur les bras.', instructions: ['Allongé jambes tendues en étoile, bras au sol.', 'Décollez un côté jambe contre bras opposé en contractant les obliques.', 'Redescendez lentement puis alternez de côté.'], tips: ["Aucun appui sur les bras, ce sont les abdos qui travaillent.","Décollez la jambe et le buste ensemble de façon contrôlée.","Le mouvement est lent, sans élan."],
    variants: ["Étoile de mer statique","Étoile de mer avec genou plié","Crunch latéral genoux fléchis"],
    similarExerciseIds: ["ex-side-plank-rotation","ex-russian-twist","ex-scissors"],
    commonMistakes: ["Se servir des bras pour s'aider (appui).","Utiliser l'élan au lieu de la contraction des obliques."],
    defaultSets: 4, defaultReps: '15 reps/côté', defaultRestSec: 30,
  }
];
