import { WorkoutProgram } from '../types';

// Exact snapshot of the PREVIOUS official default program (the version seeded
// before the v2 default-program upgrade). Used ONLY by the app-level, migration-
// free seed upgrade in indexedDb.ts: the stored official default may be replaced
// in place ONLY when it is byte-identical to this snapshot (i.e. the user never
// edited it). Any difference means the program was modified by the user and is
// preserved as-is.
export const DEFAULT_PROGRAM_V1: WorkoutProgram = {
  "id": "prog-my-personal-bodyweight",
  "title": "Programme de Recomposition Corporelle — Poids de corps (v2)",
  "description": "Recomposition corporelle au poids de corps (17 ans, 1,78 m, 75 kg) : perte de masse graisseuse + prise de muscle. Séances de 45 min minimum, 4-5 séries par exercice, méthode en séries droites. Planning : Core complet (Lundi, Mercredi, Vendredi), Bas du corps (Mardi, Jeudi, Samedi), Mobilité & articulations (Dimanche). Version adaptée à une épaule droite en récupération — pas de séance Haut du corps pour l’instant.",
  "type": "fixed",
  "daysPerWeek": 6,
  "level": "Tous niveaux",
  "isActive": true,
  "color": "#8b5cf6",
  "days": [
    {
      "id": "day-core-lundi",
      "name": "Lundi — Core complet",
      "dayOfWeek": "Lundi",
      "scheduledTime": "18:00",
      "muscleGroups": [
        "Abdos"
      ],
      "exerciseIds": [
        "ex-high-knees",
        "ex-pelvic-lift",
        "ex-leg-flutters",
        "ex-scissors",
        "ex-starfish-crunch",
        "ex-russian-twist",
        "ex-plank-bodyweight"
      ],
      "stretches": [
        {
          "id": "stretch-cobra",
          "name": "Étirement cobra (abdos)",
          "targetArea": "Abdos",
          "durationSec": 30,
          "hasSides": false,
          "instruction": "Allongé sur le ventre, pousse sur les bras pour lever le buste, bassin au sol, sans forcer."
        },
        {
          "id": "stretch-lying-twist",
          "name": "Torsion couchée (obliques)",
          "targetArea": "Obliques",
          "durationSec": 30,
          "hasSides": true,
          "sideType": "side",
          "instruction": "Allongé sur le dos, genoux pliés vers un côté, épaules au sol, tête tournée à l'opposé."
        },
        {
          "id": "stretch-child-pose",
          "name": "Étirement enfant (dos/abdos)",
          "targetArea": "Dos & Abdos",
          "durationSec": 30,
          "hasSides": false,
          "instruction": "Assis sur les talons, buste penché en avant, bras tendus devant."
        }
      ],
      "exercises": [
        {
          "id": "cfg-core-l-1",
          "exerciseId": "ex-high-knees",
          "exerciseName": "Montées de genoux sur place",
          "sets": 1,
          "reps": "30 sec",
          "mode": "timer",
          "durationSec": 30,
          "repsPlan": [
            "30 sec"
          ],
          "durationPlan": [
            30
          ],
          "targetWeightKg": 0,
          "restSec": 15,
          "notes": "Échauffement : cours sur place, genoux à hauteur de hanche, bras pliés qui ne montent pas au-dessus des épaules.",
          "transitionRestSec": 15
        },
        {
          "id": "cfg-core-l-2",
          "exerciseId": "ex-pelvic-lift",
          "exerciseName": "Relevé de bassin",
          "sets": 4,
          "reps": 15,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            15,
            15,
            15,
            15
          ],
          "durationPlan": [
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Jambes tendues vers le plafond, décolle le bassin sans élan.",
          "transitionRestSec": 30
        },
        {
          "id": "cfg-core-l-3",
          "exerciseId": "ex-leg-flutters",
          "exerciseName": "Battements de jambes",
          "sets": 4,
          "reps": "50 sec",
          "mode": "timer",
          "durationSec": 50,
          "repsPlan": [
            "50 sec",
            "50 sec",
            "50 sec",
            "50 sec"
          ],
          "durationPlan": [
            50,
            50,
            50,
            50
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Bas du dos plaqué au sol en permanence.",
          "transitionRestSec": 30
        },
        {
          "id": "cfg-core-l-4",
          "exerciseId": "ex-scissors",
          "exerciseName": "Ciseaux",
          "sets": 4,
          "reps": "50 sec",
          "mode": "timer",
          "durationSec": 50,
          "repsPlan": [
            "50 sec",
            "50 sec",
            "50 sec",
            "50 sec"
          ],
          "durationPlan": [
            50,
            50,
            50,
            50
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Amplitude contrôlée, pas de rebond.",
          "transitionRestSec": 30
        },
        {
          "id": "cfg-core-l-5",
          "exerciseId": "ex-starfish-crunch",
          "exerciseName": "Étoile de mer (crunch latéral)",
          "sets": 4,
          "reps": 15,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            15,
            15,
            15,
            15
          ],
          "durationPlan": [
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Allongé sur le dos, bras et jambes en croix. Ramène le genou et le coude du même côté l’un vers l’autre en contractant l’oblique, redescends, change de côté. 15 reps par côté. Aucun appui sur les bras.",
          "transitionRestSec": 20
        },
        {
          "id": "cfg-core-l-6",
          "exerciseId": "ex-russian-twist",
          "exerciseName": "Russian twist sans poids",
          "sets": 4,
          "reps": 20,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            20,
            20,
            20,
            20
          ],
          "durationPlan": [
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Assis, buste incliné à 45° (dos droit), pieds légèrement décollés, touche le sol de chaque côté avec les mains jointes. 20 reps, soit 10 par côté. La rotation vient du buste, pas des bras.",
          "transitionRestSec": 30
        },
        {
          "id": "cfg-core-l-7",
          "exerciseId": "ex-plank-bodyweight",
          "exerciseName": "Planche",
          "sets": 4,
          "reps": "45 sec",
          "mode": "timer",
          "durationSec": 45,
          "repsPlan": [
            "45 sec",
            "45 sec",
            "45 sec",
            "45 sec"
          ],
          "durationPlan": [
            45,
            45,
            45,
            45
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Appui sur avant-bras, dos plat, ne pas cambrer ni casser le dos.",
          "transitionRestSec": 0
        }
      ]
    },
    {
      "id": "day-lower-mardi",
      "name": "Mardi — Bas du corps complet",
      "dayOfWeek": "Mardi",
      "scheduledTime": "18:00",
      "muscleGroups": [
        "Jambes"
      ],
      "exerciseIds": [
        "ex-high-knees",
        "ex-bodyweight-squat",
        "ex-reverse-lunges",
        "ex-single-leg-glute-bridge",
        "ex-bodyweight-calf-raises",
        "ex-wall-sit",
        "ex-glute-ham-raise-floor-assisted"
      ],
      "stretches": [
        {
          "id": "stretch-quads-standing",
          "name": "Étirement quadriceps debout",
          "targetArea": "Quadriceps",
          "durationSec": 30,
          "hasSides": true,
          "sideType": "leg",
          "instruction": "Debout, attrape la cheville derrière toi, genoux collés, tire doucement le talon vers la fesse."
        },
        {
          "id": "stretch-hamstrings",
          "name": "Étirement ischio-jambiers",
          "targetArea": "Ischio-jambiers",
          "durationSec": 30,
          "hasSides": true,
          "sideType": "leg",
          "instruction": "Assis ou debout, jambe tendue, penche le buste vers l'avant sans arrondir excessivement le dos."
        },
        {
          "id": "stretch-calves-wall",
          "name": "Étirement mollets contre un mur",
          "targetArea": "Mollets",
          "durationSec": 30,
          "hasSides": true,
          "sideType": "leg",
          "instruction": "Une jambe en arrière tendue, talon au sol, penche-toi doucement vers le mur."
        },
        {
          "id": "stretch-glutes-figure4",
          "name": "Étirement fessiers figure 4",
          "targetArea": "Fessiers",
          "durationSec": 30,
          "hasSides": true,
          "sideType": "side",
          "instruction": "Allongé sur le dos, croise une cheville sur le genou opposé et tire la jambe vers la poitrine."
        }
      ],
      "exercises": [
        {
          "id": "cfg-lower-m-1",
          "exerciseId": "ex-high-knees",
          "exerciseName": "Montées de genoux sur place",
          "sets": 1,
          "reps": "30 sec",
          "mode": "timer",
          "durationSec": 30,
          "repsPlan": [
            "30 sec"
          ],
          "durationPlan": [
            30
          ],
          "targetWeightKg": 0,
          "restSec": 15,
          "notes": "Échauffement : même que le Core."
        },
        {
          "id": "cfg-lower-m-2",
          "exerciseId": "ex-bodyweight-squat",
          "exerciseName": "Squats",
          "sets": 5,
          "reps": 20,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            20,
            20,
            20,
            20,
            20
          ],
          "durationPlan": [
            0,
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Genoux dans l’axe des pieds, descends jusqu’à cuisses parallèles au sol."
        },
        {
          "id": "cfg-lower-m-3",
          "exerciseId": "ex-reverse-lunges",
          "exerciseName": "Fentes arrière",
          "sets": 4,
          "reps": 20,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            20,
            20,
            20,
            20
          ],
          "durationPlan": [
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Genou avant à 90°, genou arrière frôle le sol. 20 reps, soit 10 par jambe."
        },
        {
          "id": "cfg-lower-m-4",
          "exerciseId": "ex-single-leg-glute-bridge",
          "exerciseName": "Pont fessier unilatéral",
          "sets": 4,
          "reps": 12,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            12,
            12,
            12,
            12
          ],
          "durationPlan": [
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Une jambe tendue en l’air, pousse sur le talon de l’autre pour lever le bassin. 12 reps par jambe."
        },
        {
          "id": "cfg-lower-m-5",
          "exerciseId": "ex-bodyweight-calf-raises",
          "exerciseName": "Élévation mollets",
          "sets": 5,
          "reps": 25,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            25,
            25,
            25,
            25,
            25
          ],
          "durationPlan": [
            0,
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 20,
          "notes": "Monte sur la pointe des pieds le plus haut possible, redescends lentement (2 s)."
        },
        {
          "id": "cfg-lower-m-6",
          "exerciseId": "ex-wall-sit",
          "exerciseName": "La chaise",
          "sets": 4,
          "reps": "45 sec",
          "mode": "timer",
          "durationSec": 45,
          "repsPlan": [
            "45 sec",
            "45 sec",
            "45 sec",
            "45 sec"
          ],
          "durationPlan": [
            45,
            45,
            45,
            45
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Dos plat contre un mur, cuisses parallèles au sol."
        },
        {
          "id": "cfg-lower-m-7",
          "exerciseId": "ex-glute-ham-raise-floor-assisted",
          "exerciseName": "Glute Ham Raise - Reverse Lying",
          "sets": 4,
          "reps": 15,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            15,
            15,
            15,
            15
          ],
          "durationPlan": [
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Allongé sur le dos, jambes tendues, chevilles calées fermement sous un meuble stable. Bras croisés sur la poitrine (aucun appui sur les mains). Contracte ischios et fessiers pour tirer les talons vers toi, ce qui fait glisser le bassin vers l’avant. Reviens en contrôlant très lentement le retour (phase la plus importante)."
        }
      ]
    },
    {
      "id": "day-core-mercredi",
      "name": "Mercredi — Core complet",
      "dayOfWeek": "Mercredi",
      "scheduledTime": "18:00",
      "muscleGroups": [
        "Abdos"
      ],
      "exerciseIds": [
        "ex-high-knees",
        "ex-pelvic-lift",
        "ex-leg-flutters",
        "ex-scissors",
        "ex-starfish-crunch",
        "ex-russian-twist",
        "ex-plank-bodyweight"
      ],
      "stretches": [
        {
          "id": "stretch-cobra",
          "name": "Étirement cobra (abdos)",
          "targetArea": "Abdos",
          "durationSec": 30,
          "hasSides": false,
          "instruction": "Allongé sur le ventre, pousse sur les bras pour lever le buste, bassin au sol, sans forcer."
        },
        {
          "id": "stretch-lying-twist",
          "name": "Torsion couchée (obliques)",
          "targetArea": "Obliques",
          "durationSec": 30,
          "hasSides": true,
          "sideType": "side",
          "instruction": "Allongé sur le dos, genoux pliés vers un côté, épaules au sol, tête tournée à l'opposé."
        },
        {
          "id": "stretch-child-pose",
          "name": "Étirement enfant (dos/abdos)",
          "targetArea": "Dos & Abdos",
          "durationSec": 30,
          "hasSides": false,
          "instruction": "Assis sur les talons, buste penché en avant, bras tendus devant."
        }
      ],
      "exercises": [
        {
          "id": "cfg-core-w-1",
          "exerciseId": "ex-high-knees",
          "exerciseName": "Montées de genoux sur place",
          "sets": 1,
          "reps": "30 sec",
          "mode": "timer",
          "durationSec": 30,
          "repsPlan": [
            "30 sec"
          ],
          "durationPlan": [
            30
          ],
          "targetWeightKg": 0,
          "restSec": 15,
          "notes": "Échauffement : cours sur place, genoux à hauteur de hanche, bras pliés qui ne montent pas au-dessus des épaules.",
          "transitionRestSec": 15
        },
        {
          "id": "cfg-core-w-2",
          "exerciseId": "ex-pelvic-lift",
          "exerciseName": "Relevé de bassin",
          "sets": 4,
          "reps": 15,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            15,
            15,
            15,
            15
          ],
          "durationPlan": [
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Jambes tendues vers le plafond, décolle le bassin sans élan.",
          "transitionRestSec": 30
        },
        {
          "id": "cfg-core-w-3",
          "exerciseId": "ex-leg-flutters",
          "exerciseName": "Battements de jambes",
          "sets": 4,
          "reps": "50 sec",
          "mode": "timer",
          "durationSec": 50,
          "repsPlan": [
            "50 sec",
            "50 sec",
            "50 sec",
            "50 sec"
          ],
          "durationPlan": [
            50,
            50,
            50,
            50
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Bas du dos plaqué au sol en permanence.",
          "transitionRestSec": 30
        },
        {
          "id": "cfg-core-w-4",
          "exerciseId": "ex-scissors",
          "exerciseName": "Ciseaux",
          "sets": 4,
          "reps": "50 sec",
          "mode": "timer",
          "durationSec": 50,
          "repsPlan": [
            "50 sec",
            "50 sec",
            "50 sec",
            "50 sec"
          ],
          "durationPlan": [
            50,
            50,
            50,
            50
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Amplitude contrôlée, pas de rebond.",
          "transitionRestSec": 30
        },
        {
          "id": "cfg-core-w-5",
          "exerciseId": "ex-starfish-crunch",
          "exerciseName": "Étoile de mer (crunch latéral)",
          "sets": 4,
          "reps": 15,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            15,
            15,
            15,
            15
          ],
          "durationPlan": [
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Allongé sur le dos, bras et jambes en croix. Ramène le genou et le coude du même côté l’un vers l’autre en contractant l’oblique, redescends, change de côté. 15 reps par côté. Aucun appui sur les bras.",
          "transitionRestSec": 20
        },
        {
          "id": "cfg-core-w-6",
          "exerciseId": "ex-russian-twist",
          "exerciseName": "Russian twist sans poids",
          "sets": 4,
          "reps": 20,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            20,
            20,
            20,
            20
          ],
          "durationPlan": [
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Assis, buste incliné à 45° (dos droit), pieds légèrement décollés, touche le sol de chaque côté avec les mains jointes. 20 reps, soit 10 par côté. La rotation vient du buste, pas des bras.",
          "transitionRestSec": 30
        },
        {
          "id": "cfg-core-w-7",
          "exerciseId": "ex-plank-bodyweight",
          "exerciseName": "Planche",
          "sets": 4,
          "reps": "45 sec",
          "mode": "timer",
          "durationSec": 45,
          "repsPlan": [
            "45 sec",
            "45 sec",
            "45 sec",
            "45 sec"
          ],
          "durationPlan": [
            45,
            45,
            45,
            45
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Appui sur avant-bras, dos plat, ne pas cambrer ni casser le dos.",
          "transitionRestSec": 0
        }
      ]
    },
    {
      "id": "day-lower-jeudi",
      "name": "Jeudi — Bas du corps complet",
      "dayOfWeek": "Jeudi",
      "scheduledTime": "18:00",
      "muscleGroups": [
        "Jambes"
      ],
      "exerciseIds": [
        "ex-high-knees",
        "ex-bodyweight-squat",
        "ex-reverse-lunges",
        "ex-single-leg-glute-bridge",
        "ex-bodyweight-calf-raises",
        "ex-wall-sit",
        "ex-glute-ham-raise-floor-assisted"
      ],
      "stretches": [
        {
          "id": "stretch-quads-standing",
          "name": "Étirement quadriceps debout",
          "targetArea": "Quadriceps",
          "durationSec": 30,
          "hasSides": true,
          "sideType": "leg",
          "instruction": "Debout, attrape la cheville derrière toi, genoux collés, tire doucement le talon vers la fesse."
        },
        {
          "id": "stretch-hamstrings",
          "name": "Étirement ischio-jambiers",
          "targetArea": "Ischio-jambiers",
          "durationSec": 30,
          "hasSides": true,
          "sideType": "leg",
          "instruction": "Assis ou debout, jambe tendue, penche le buste vers l'avant sans arrondir excessivement le dos."
        },
        {
          "id": "stretch-calves-wall",
          "name": "Étirement mollets contre un mur",
          "targetArea": "Mollets",
          "durationSec": 30,
          "hasSides": true,
          "sideType": "leg",
          "instruction": "Une jambe en arrière tendue, talon au sol, penche-toi doucement vers le mur."
        },
        {
          "id": "stretch-glutes-figure4",
          "name": "Étirement fessiers figure 4",
          "targetArea": "Fessiers",
          "durationSec": 30,
          "hasSides": true,
          "sideType": "side",
          "instruction": "Allongé sur le dos, croise une cheville sur le genou opposé et tire la jambe vers la poitrine."
        }
      ],
      "exercises": [
        {
          "id": "cfg-lower-th-1",
          "exerciseId": "ex-high-knees",
          "exerciseName": "Montées de genoux sur place",
          "sets": 1,
          "reps": "30 sec",
          "mode": "timer",
          "durationSec": 30,
          "repsPlan": [
            "30 sec"
          ],
          "durationPlan": [
            30
          ],
          "targetWeightKg": 0,
          "restSec": 15,
          "notes": "Échauffement : même que le Core."
        },
        {
          "id": "cfg-lower-th-2",
          "exerciseId": "ex-bodyweight-squat",
          "exerciseName": "Squats",
          "sets": 5,
          "reps": 20,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            20,
            20,
            20,
            20,
            20
          ],
          "durationPlan": [
            0,
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Genoux dans l’axe des pieds, descends jusqu’à cuisses parallèles au sol."
        },
        {
          "id": "cfg-lower-th-3",
          "exerciseId": "ex-reverse-lunges",
          "exerciseName": "Fentes arrière",
          "sets": 4,
          "reps": 20,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            20,
            20,
            20,
            20
          ],
          "durationPlan": [
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Genou avant à 90°, genou arrière frôle le sol. 20 reps, soit 10 par jambe."
        },
        {
          "id": "cfg-lower-th-4",
          "exerciseId": "ex-single-leg-glute-bridge",
          "exerciseName": "Pont fessier unilatéral",
          "sets": 4,
          "reps": 12,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            12,
            12,
            12,
            12
          ],
          "durationPlan": [
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Une jambe tendue en l’air, pousse sur le talon de l’autre pour lever le bassin. 12 reps par jambe."
        },
        {
          "id": "cfg-lower-th-5",
          "exerciseId": "ex-bodyweight-calf-raises",
          "exerciseName": "Élévation mollets",
          "sets": 5,
          "reps": 25,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            25,
            25,
            25,
            25,
            25
          ],
          "durationPlan": [
            0,
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 20,
          "notes": "Monte sur la pointe des pieds le plus haut possible, redescends lentement (2 s)."
        },
        {
          "id": "cfg-lower-th-6",
          "exerciseId": "ex-wall-sit",
          "exerciseName": "La chaise",
          "sets": 4,
          "reps": "45 sec",
          "mode": "timer",
          "durationSec": 45,
          "repsPlan": [
            "45 sec",
            "45 sec",
            "45 sec",
            "45 sec"
          ],
          "durationPlan": [
            45,
            45,
            45,
            45
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Dos plat contre un mur, cuisses parallèles au sol."
        },
        {
          "id": "cfg-lower-th-7",
          "exerciseId": "ex-glute-ham-raise-floor-assisted",
          "exerciseName": "Glute Ham Raise - Reverse Lying",
          "sets": 4,
          "reps": 15,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            15,
            15,
            15,
            15
          ],
          "durationPlan": [
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Allongé sur le dos, jambes tendues, chevilles calées fermement sous un meuble stable. Bras croisés sur la poitrine (aucun appui sur les mains). Contracte ischios et fessiers pour tirer les talons vers toi, ce qui fait glisser le bassin vers l’avant. Reviens en contrôlant très lentement le retour (phase la plus importante)."
        }
      ]
    },
    {
      "id": "day-core-vendredi",
      "name": "Vendredi — Core complet",
      "dayOfWeek": "Vendredi",
      "scheduledTime": "18:00",
      "muscleGroups": [
        "Abdos"
      ],
      "exerciseIds": [
        "ex-high-knees",
        "ex-pelvic-lift",
        "ex-leg-flutters",
        "ex-scissors",
        "ex-starfish-crunch",
        "ex-russian-twist",
        "ex-plank-bodyweight"
      ],
      "stretches": [
        {
          "id": "stretch-cobra",
          "name": "Étirement cobra (abdos)",
          "targetArea": "Abdos",
          "durationSec": 30,
          "hasSides": false,
          "instruction": "Allongé sur le ventre, pousse sur les bras pour lever le buste, bassin au sol, sans forcer."
        },
        {
          "id": "stretch-lying-twist",
          "name": "Torsion couchée (obliques)",
          "targetArea": "Obliques",
          "durationSec": 30,
          "hasSides": true,
          "sideType": "side",
          "instruction": "Allongé sur le dos, genoux pliés vers un côté, épaules au sol, tête tournée à l'opposé."
        },
        {
          "id": "stretch-child-pose",
          "name": "Étirement enfant (dos/abdos)",
          "targetArea": "Dos & Abdos",
          "durationSec": 30,
          "hasSides": false,
          "instruction": "Assis sur les talons, buste penché en avant, bras tendus devant."
        }
      ],
      "exercises": [
        {
          "id": "cfg-core-f-1",
          "exerciseId": "ex-high-knees",
          "exerciseName": "Montées de genoux sur place",
          "sets": 1,
          "reps": "30 sec",
          "mode": "timer",
          "durationSec": 30,
          "repsPlan": [
            "30 sec"
          ],
          "durationPlan": [
            30
          ],
          "targetWeightKg": 0,
          "restSec": 15,
          "notes": "Échauffement : cours sur place, genoux à hauteur de hanche, bras pliés qui ne montent pas au-dessus des épaules.",
          "transitionRestSec": 15
        },
        {
          "id": "cfg-core-f-2",
          "exerciseId": "ex-pelvic-lift",
          "exerciseName": "Relevé de bassin",
          "sets": 4,
          "reps": 15,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            15,
            15,
            15,
            15
          ],
          "durationPlan": [
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Jambes tendues vers le plafond, décolle le bassin sans élan.",
          "transitionRestSec": 30
        },
        {
          "id": "cfg-core-f-3",
          "exerciseId": "ex-leg-flutters",
          "exerciseName": "Battements de jambes",
          "sets": 4,
          "reps": "50 sec",
          "mode": "timer",
          "durationSec": 50,
          "repsPlan": [
            "50 sec",
            "50 sec",
            "50 sec",
            "50 sec"
          ],
          "durationPlan": [
            50,
            50,
            50,
            50
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Bas du dos plaqué au sol en permanence.",
          "transitionRestSec": 30
        },
        {
          "id": "cfg-core-f-4",
          "exerciseId": "ex-scissors",
          "exerciseName": "Ciseaux",
          "sets": 4,
          "reps": "50 sec",
          "mode": "timer",
          "durationSec": 50,
          "repsPlan": [
            "50 sec",
            "50 sec",
            "50 sec",
            "50 sec"
          ],
          "durationPlan": [
            50,
            50,
            50,
            50
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Amplitude contrôlée, pas de rebond.",
          "transitionRestSec": 30
        },
        {
          "id": "cfg-core-f-5",
          "exerciseId": "ex-starfish-crunch",
          "exerciseName": "Étoile de mer (crunch latéral)",
          "sets": 4,
          "reps": 15,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            15,
            15,
            15,
            15
          ],
          "durationPlan": [
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Allongé sur le dos, bras et jambes en croix. Ramène le genou et le coude du même côté l’un vers l’autre en contractant l’oblique, redescends, change de côté. 15 reps par côté. Aucun appui sur les bras.",
          "transitionRestSec": 20
        },
        {
          "id": "cfg-core-f-6",
          "exerciseId": "ex-russian-twist",
          "exerciseName": "Russian twist sans poids",
          "sets": 4,
          "reps": 20,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            20,
            20,
            20,
            20
          ],
          "durationPlan": [
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Assis, buste incliné à 45° (dos droit), pieds légèrement décollés, touche le sol de chaque côté avec les mains jointes. 20 reps, soit 10 par côté. La rotation vient du buste, pas des bras.",
          "transitionRestSec": 30
        },
        {
          "id": "cfg-core-f-7",
          "exerciseId": "ex-plank-bodyweight",
          "exerciseName": "Planche",
          "sets": 4,
          "reps": "45 sec",
          "mode": "timer",
          "durationSec": 45,
          "repsPlan": [
            "45 sec",
            "45 sec",
            "45 sec",
            "45 sec"
          ],
          "durationPlan": [
            45,
            45,
            45,
            45
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Appui sur avant-bras, dos plat, ne pas cambrer ni casser le dos.",
          "transitionRestSec": 0
        }
      ]
    },
    {
      "id": "day-lower-samedi",
      "name": "Samedi — Bas du corps complet",
      "dayOfWeek": "Samedi",
      "scheduledTime": "18:00",
      "muscleGroups": [
        "Jambes"
      ],
      "exerciseIds": [
        "ex-high-knees",
        "ex-bodyweight-squat",
        "ex-reverse-lunges",
        "ex-single-leg-glute-bridge",
        "ex-bodyweight-calf-raises",
        "ex-wall-sit",
        "ex-glute-ham-raise-floor-assisted"
      ],
      "stretches": [
        {
          "id": "stretch-quads-standing",
          "name": "Étirement quadriceps debout",
          "targetArea": "Quadriceps",
          "durationSec": 30,
          "hasSides": true,
          "sideType": "leg",
          "instruction": "Debout, attrape la cheville derrière toi, genoux collés, tire doucement le talon vers la fesse."
        },
        {
          "id": "stretch-hamstrings",
          "name": "Étirement ischio-jambiers",
          "targetArea": "Ischio-jambiers",
          "durationSec": 30,
          "hasSides": true,
          "sideType": "leg",
          "instruction": "Assis ou debout, jambe tendue, penche le buste vers l'avant sans arrondir excessivement le dos."
        },
        {
          "id": "stretch-calves-wall",
          "name": "Étirement mollets contre un mur",
          "targetArea": "Mollets",
          "durationSec": 30,
          "hasSides": true,
          "sideType": "leg",
          "instruction": "Une jambe en arrière tendue, talon au sol, penche-toi doucement vers le mur."
        },
        {
          "id": "stretch-glutes-figure4",
          "name": "Étirement fessiers figure 4",
          "targetArea": "Fessiers",
          "durationSec": 30,
          "hasSides": true,
          "sideType": "side",
          "instruction": "Allongé sur le dos, croise une cheville sur le genou opposé et tire la jambe vers la poitrine."
        }
      ],
      "exercises": [
        {
          "id": "cfg-lower-sa-1",
          "exerciseId": "ex-high-knees",
          "exerciseName": "Montées de genoux sur place",
          "sets": 1,
          "reps": "30 sec",
          "mode": "timer",
          "durationSec": 30,
          "repsPlan": [
            "30 sec"
          ],
          "durationPlan": [
            30
          ],
          "targetWeightKg": 0,
          "restSec": 15,
          "notes": "Échauffement : même que le Core."
        },
        {
          "id": "cfg-lower-sa-2",
          "exerciseId": "ex-bodyweight-squat",
          "exerciseName": "Squats",
          "sets": 5,
          "reps": 20,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            20,
            20,
            20,
            20,
            20
          ],
          "durationPlan": [
            0,
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Genoux dans l’axe des pieds, descends jusqu’à cuisses parallèles au sol."
        },
        {
          "id": "cfg-lower-sa-3",
          "exerciseId": "ex-reverse-lunges",
          "exerciseName": "Fentes arrière",
          "sets": 4,
          "reps": 20,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            20,
            20,
            20,
            20
          ],
          "durationPlan": [
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Genou avant à 90°, genou arrière frôle le sol. 20 reps, soit 10 par jambe."
        },
        {
          "id": "cfg-lower-sa-4",
          "exerciseId": "ex-single-leg-glute-bridge",
          "exerciseName": "Pont fessier unilatéral",
          "sets": 4,
          "reps": 12,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            12,
            12,
            12,
            12
          ],
          "durationPlan": [
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Une jambe tendue en l’air, pousse sur le talon de l’autre pour lever le bassin. 12 reps par jambe."
        },
        {
          "id": "cfg-lower-sa-5",
          "exerciseId": "ex-bodyweight-calf-raises",
          "exerciseName": "Élévation mollets",
          "sets": 5,
          "reps": 25,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            25,
            25,
            25,
            25,
            25
          ],
          "durationPlan": [
            0,
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 20,
          "notes": "Monte sur la pointe des pieds le plus haut possible, redescends lentement (2 s)."
        },
        {
          "id": "cfg-lower-sa-6",
          "exerciseId": "ex-wall-sit",
          "exerciseName": "La chaise",
          "sets": 4,
          "reps": "45 sec",
          "mode": "timer",
          "durationSec": 45,
          "repsPlan": [
            "45 sec",
            "45 sec",
            "45 sec",
            "45 sec"
          ],
          "durationPlan": [
            45,
            45,
            45,
            45
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Dos plat contre un mur, cuisses parallèles au sol."
        },
        {
          "id": "cfg-lower-sa-7",
          "exerciseId": "ex-glute-ham-raise-floor-assisted",
          "exerciseName": "Glute Ham Raise - Reverse Lying",
          "sets": 4,
          "reps": 15,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            15,
            15,
            15,
            15
          ],
          "durationPlan": [
            0,
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Allongé sur le dos, jambes tendues, chevilles calées fermement sous un meuble stable. Bras croisés sur la poitrine (aucun appui sur les mains). Contracte ischios et fessiers pour tirer les talons vers toi, ce qui fait glisser le bassin vers l’avant. Reviens en contrôlant très lentement le retour (phase la plus importante)."
        }
      ]
    },
    {
      "id": "day-mobility-dimanche",
      "name": "Dimanche — Mobilité & articulations",
      "dayOfWeek": "Dimanche",
      "scheduledTime": "10:30",
      "muscleGroups": [
        "Full Body"
      ],
      "exerciseIds": [
        "ex-wall-isometric-press",
        "ex-scapular-squeeze",
        "ex-90-90-hip-mobility",
        "ex-single-leg-glute-bridge",
        "ex-jefferson-curl",
        "ex-step-down",
        "ex-knee-isometric-extension",
        "ex-sumo-squat-pause",
        "ex-finger-pushups",
        "ex-reverse-prayer",
        "ex-pronation-supination",
        "ex-foot-alphabet",
        "ex-heel-toe-walk",
        "ex-single-leg-balance"
      ],
      "stretches": [],
      "notes": "Mobilité & articulations : épaules, bas du dos/pelvis, genoux, poignets/coudes et chevilles.",
      "exercises": [
        {
          "id": "cfg-mob-1",
          "exerciseId": "ex-wall-isometric-press",
          "exerciseName": "Pression isométrique contre le mur (coude collé au corps)",
          "sets": 3,
          "reps": 8,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            8,
            8,
            8
          ],
          "durationPlan": [
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 20,
          "notes": "Coude collé au corps (pas écarté à 90°), avant-bras contre le mur, pousse doucement sans forcer. Maintien 5 s par répétition."
        },
        {
          "id": "cfg-mob-2",
          "exerciseId": "ex-scapular-squeeze",
          "exerciseName": "Serré d’omoplates",
          "sets": 3,
          "reps": 12,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            12,
            12,
            12
          ],
          "durationPlan": [
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 15,
          "notes": "Bras le long du corps, serre les omoplates l’une vers l’autre 2 s puis relâche."
        },
        {
          "id": "cfg-mob-3",
          "exerciseId": "ex-90-90-hip-mobility",
          "exerciseName": "90-90 / Gobelet de hanche",
          "sets": 2,
          "reps": 8,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            8,
            8
          ],
          "durationPlan": [
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 20,
          "notes": "8 reps par côté. Assis, une jambe pliée à 90° devant, l’autre à 90° sur le côté, buste droit."
        },
        {
          "id": "cfg-mob-4",
          "exerciseId": "ex-single-leg-glute-bridge",
          "exerciseName": "Pont fessier une jambe",
          "sets": 3,
          "reps": 12,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            12,
            12,
            12
          ],
          "durationPlan": [
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 20,
          "notes": "12 reps par jambe. Une jambe tendue, pousse sur le talon de l’autre pour lever le bassin, contrôle la descente."
        },
        {
          "id": "cfg-mob-5",
          "exerciseId": "ex-jefferson-curl",
          "exerciseName": "Jefferson Curl à vide",
          "sets": 3,
          "reps": 8,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            8,
            8,
            8
          ],
          "durationPlan": [
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 20,
          "notes": "Enroule la colonne vertèbre par vertèbre vers le bas très lentement, puis déroule dans l’autre sens."
        },
        {
          "id": "cfg-mob-6",
          "exerciseId": "ex-step-down",
          "exerciseName": "Step-down contrôlé",
          "sets": 3,
          "reps": 10,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            10,
            10,
            10
          ],
          "durationPlan": [
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 20,
          "notes": "10 reps par jambe. Descends d’une marche vers le sol très lentement en contrôlant, remonte."
        },
        {
          "id": "cfg-mob-7",
          "exerciseId": "ex-knee-isometric-extension",
          "exerciseName": "Extension isométrique",
          "sets": 3,
          "reps": "10 sec",
          "mode": "timer",
          "durationSec": 10,
          "repsPlan": [
            "10 sec",
            "10 sec",
            "10 sec"
          ],
          "durationPlan": [
            10,
            10,
            10
          ],
          "targetWeightKg": 0,
          "restSec": 15,
          "notes": "10 s par jambe. Assis, jambe tendue à l’horizontale, contracte le quadriceps et maintiens."
        },
        {
          "id": "cfg-mob-8",
          "exerciseId": "ex-sumo-squat-pause",
          "exerciseName": "Squat sumo avec pause",
          "sets": 3,
          "reps": 10,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            10,
            10,
            10
          ],
          "durationPlan": [
            0,
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 30,
          "notes": "Pieds larges, pointes vers l’extérieur, arrêt de 3 s en bas avant de remonter."
        },
        {
          "id": "cfg-mob-9",
          "exerciseId": "ex-finger-pushups",
          "exerciseName": "Pompage sur les doigts",
          "sets": 2,
          "reps": 8,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            8,
            8
          ],
          "durationPlan": [
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 20,
          "notes": "Position pompe mais appui sur la pulpe des doigts, genoux au sol si besoin."
        },
        {
          "id": "cfg-mob-10",
          "exerciseId": "ex-reverse-prayer",
          "exerciseName": "Prière inversée",
          "sets": 3,
          "reps": "20 sec",
          "mode": "timer",
          "durationSec": 20,
          "repsPlan": [
            "20 sec",
            "20 sec",
            "20 sec"
          ],
          "durationPlan": [
            20,
            20,
            20
          ],
          "targetWeightKg": 0,
          "restSec": 15,
          "notes": "Dos des mains jointes devant la poitrine, monte doucement pour étirer les poignets."
        },
        {
          "id": "cfg-mob-11",
          "exerciseId": "ex-pronation-supination",
          "exerciseName": "Pronation / supination",
          "sets": 2,
          "reps": 12,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            12,
            12
          ],
          "durationPlan": [
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 15,
          "notes": "12 reps par bras. Coude plié à 90° collé au corps, tourne l’avant-bras paume vers le haut puis vers le bas."
        },
        {
          "id": "cfg-mob-12",
          "exerciseId": "ex-foot-alphabet",
          "exerciseName": "Alphabet avec le pied",
          "sets": 1,
          "reps": 26,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            26
          ],
          "durationPlan": [
            0
          ],
          "targetWeightKg": 0,
          "restSec": 15,
          "notes": "1 série par pied — alphabet complet dessiné avec la pointe du pied."
        },
        {
          "id": "cfg-mob-13",
          "exerciseId": "ex-heel-toe-walk",
          "exerciseName": "Marche talons / pointes",
          "sets": 2,
          "reps": 20,
          "mode": "reps",
          "durationSec": 0,
          "repsPlan": [
            20,
            20
          ],
          "durationPlan": [
            0,
            0
          ],
          "targetWeightKg": 0,
          "restSec": 20,
          "notes": "20 m : 10 m sur les talons puis 10 m sur les pointes, garde l’équilibre."
        },
        {
          "id": "cfg-mob-14",
          "exerciseId": "ex-single-leg-balance",
          "exerciseName": "Équilibre sur une jambe",
          "sets": 3,
          "reps": "20 sec",
          "mode": "timer",
          "durationSec": 20,
          "repsPlan": [
            "20 sec",
            "20 sec",
            "20 sec"
          ],
          "durationPlan": [
            20,
            20,
            20
          ],
          "targetWeightKg": 0,
          "restSec": 15,
          "notes": "20 s par jambe. Yeux ouverts puis fermés si tu progresses, garde le buste stable."
        }
      ]
    }
  ]
};
