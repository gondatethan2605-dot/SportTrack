import assert from 'node:assert/strict';
import {
  adjustRestSeconds,
  buildExerciseSteps,
  buildStretchSteps,
  DEFAULT_REST_SEC,
  DEFAULT_TRANSITION_REST_SEC,
  estimatedGuidedDurationSec,
  resolveGuidedRestSec,
  resolveRestSec,
  resolveStretchRestSec,
  resolveTransitionRestSec,
} from '../src/components/workout/workoutGuidedEngine';
import { SessionExerciseLog, StretchItem } from '../src/types';
import { CORE_STRETCHES, LOWER_BODY_STRETCHES } from '../src/data/stretchesData';

let passed = 0;
let failed = 0;
function ok(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL  ${name}`);
    console.error('      ', (e as Error).message);
    process.exitCode = 1;
  }
}

function makeEx(
  id: string,
  name: string,
  setCount: number,
  restSec?: number,
  transitionRestSec?: number
): SessionExerciseLog {
  return {
    exerciseId: id,
    exerciseName: name,
    muscleGroup: 'Full Body',
    restSec,
    transitionRestSec,
    sets: Array.from({ length: setCount }, (_, i) => ({
      setNumber: i + 1,
      weightKg: 0,
      reps: 10,
      mode: 'reps',
      durationSec: 0,
      completed: false,
    })),
  };
}

const exA = makeEx('ex-a', 'Exercice A', 2, 60);
const exB = makeEx('ex-b', 'Exercice B', 3, 15);
const exC = makeEx('ex-c', 'Exercice C', 1, 30);
const all = [exA, exB, exC];

ok('1. transition vers un NOUVEL exercice → transitionRestSec de l\'exercice terminé, sinon exerciseTransitionRestSec (et non le restSec de l\'exercice)', () => {
  // steps: A-0, A-1, B-0, B-1, B-2, C-0
  const steps = buildExerciseSteps(all);
  // La série B-0 est la première série d'un nouvel exercice => repos ENTRE exercices.
  const s = steps[2]; // { exerciseIndex: 1, setIndex: 0 }
  // A n'a pas de transitionRestSec => résolu par exerciseTransitionRestSec (fallback global).
  assert.equal(resolveGuidedRestSec({ upcomingStep: s, exercises: all, fallbackRestSec: 90, exerciseTransitionRestSec: 15 }), 15);
  assert.equal(resolveGuidedRestSec({ upcomingStep: s, exercises: all, fallbackRestSec: 90, exerciseTransitionRestSec: 120 }), 120);
});

ok('2. transition: indépendant du restSec de l\'exercice', () => {
  const steps = buildExerciseSteps(all);
  const s = steps[2]; // B-0, exercice B a un restSec de 15
  assert.equal(resolveGuidedRestSec({ upcomingStep: s, exercises: all, fallbackRestSec: 90, exerciseTransitionRestSec: 60 }), 60);
  assert.ok(resolveGuidedRestSec({ upcomingStep: s, exercises: all, fallbackRestSec: 90, exerciseTransitionRestSec: 60 }) !== 15);
});

ok('3. série suivante du MÊME exercice → restSec de l\'exercice', () => {
  const steps = buildExerciseSteps(all);
  const s = steps[3]; // B-1, même exercice que B-0
  assert.equal(resolveGuidedRestSec({ upcomingStep: s, exercises: all, fallbackRestSec: 90, exerciseTransitionRestSec: 60 }), 15);
});

ok('4. série suivante: indépendant de exerciseTransitionRestSec', () => {
  const steps = buildExerciseSteps(all);
  const s = steps[4]; // B-2
  assert.equal(resolveGuidedRestSec({ upcomingStep: s, exercises: all, fallbackRestSec: 90, exerciseTransitionRestSec: 120 }), 15);
});

ok('5. exercice sans restSec → fallback repos de la séance', () => {
  const noRest = makeEx('ex-x', 'Sans repos', 2);
  const steps = buildExerciseSteps([exA, noRest]);
  const s = steps[3]; // noRest-1 : même exercice, pas de restSec -> fallback
  assert.equal(resolveGuidedRestSec({ upcomingStep: s, exercises: [exA, noRest], fallbackRestSec: 45, exerciseTransitionRestSec: 60 }), 45);
});

ok('6. fallback: valeur par défaut par défaut (30)', () => {
  const noRest = makeEx('ex-y', 'Sans repos', 1);
  const steps = buildExerciseSteps([noRest]);
  const s = steps[0]; // noRest-0 : première série -> transition (fallback par défaut)
  assert.equal(resolveGuidedRestSec({ upcomingStep: s, exercises: [noRest], fallbackRestSec: DEFAULT_REST_SEC }), DEFAULT_TRANSITION_REST_SEC);
});

ok('7. aucune étape → fallback', () => {
  assert.equal(resolveGuidedRestSec({ upcomingStep: undefined, exercises: all, fallbackRestSec: 30 }), 30);
});

ok('8. transitionRest invalide → DEFAULT_TRANSITION_REST_SEC', () => {
  const steps = buildExerciseSteps(all);
  const s = steps[2]; // B-0
  assert.equal(resolveGuidedRestSec({ upcomingStep: s, exercises: all, fallbackRestSec: 90, exerciseTransitionRestSec: Number.NaN }), DEFAULT_TRANSITION_REST_SEC);
  assert.equal(resolveGuidedRestSec({ upcomingStep: s, exercises: all, fallbackRestSec: 90, exerciseTransitionRestSec: Number.POSITIVE_INFINITY }), DEFAULT_TRANSITION_REST_SEC);
  assert.equal(resolveGuidedRestSec({ upcomingStep: s, exercises: all, fallbackRestSec: 90, exerciseTransitionRestSec: -10 }), DEFAULT_TRANSITION_REST_SEC);
  assert.equal(resolveGuidedRestSec({ upcomingStep: s, exercises: all, fallbackRestSec: 90, exerciseTransitionRestSec: 0 }), DEFAULT_TRANSITION_REST_SEC);
});

ok('9. durée estimée: transition utilisée entre exercices, restSec par série', () => {
  // exA: 2 séries reps (45s chacune), exB: 1 série timer 10s, exC: 1 série timer 10s.
  // A-0 -> A-1 : restSec de A (per-exercise, 60)
  // A-1 -> B-0 : transition (exerciseTransitionRestSec = 75)
  // B-0 -> C-0 : transition (75)
  const timerEx = (id: string, name: string, restSec?: number): SessionExerciseLog => ({
    exerciseId: id,
    exerciseName: name,
    muscleGroup: 'Full Body',
    restSec,
    sets: [{ setNumber: 1, weightKg: 0, reps: 0, mode: 'timer', durationSec: 10, completed: false }],
  });
  const a = makeEx('ex-a', 'A', 2, 60);
  const b = timerEx('ex-b', 'B', 15);
  const c = timerEx('ex-c', 'C');
  const estimate = estimatedGuidedDurationSec([a, b, c], [], 30, 75);
  // execution: 45*2 (A) + 10 (B) + 10 (C) = 110 ; repos: 60 + 75 + 75 = 210 => 320
  assert.equal(estimate, 320);
});

ok('10. durée estimée: rétro-compatible sans exerciseTransitionRestSec (fallback restSec)', () => {
  const a = makeEx('ex-a', 'A', 1, 60);
  const b = makeEx('ex-b', 'B', 1, 60);
  // transition par défaut = fallback (restSec 30) => 45+45 execution + 30 rest = 120
  assert.equal(estimatedGuidedDurationSec([a, b], [], 30), 120);
});

// --- Per-exercise transitionRestSec (requirement 12) ---

ok('P1. transitionRestSec = 15 → repos entre exercices = 15', () => {
  const ex = makeEx('ex-a', 'A', 1, 30, 15);
  const next = makeEx('ex-b', 'B', 1, 30);
  const steps = buildExerciseSteps([ex, next]);
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[1], exercises: [ex, next], fallbackRestSec: 90, exerciseTransitionRestSec: 45 }), 15);
});

ok('P2. transitionRestSec = 60 → repos entre exercices = 60', () => {
  const ex = makeEx('ex-a', 'A', 1, 30, 60);
  const next = makeEx('ex-b', 'B', 1, 30);
  const steps = buildExerciseSteps([ex, next]);
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[1], exercises: [ex, next], fallbackRestSec: 90, exerciseTransitionRestSec: 45 }), 60);
});

ok('P3. transitionRestSec = 90 → repos entre exercices = 90', () => {
  const ex = makeEx('ex-a', 'A', 1, 30, 90);
  const next = makeEx('ex-b', 'B', 1, 30);
  const steps = buildExerciseSteps([ex, next]);
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[1], exercises: [ex, next], fallbackRestSec: 90, exerciseTransitionRestSec: 45 }), 90);
});

ok('P4. transitionRestSec = 120 → repos entre exercices = 120', () => {
  const ex = makeEx('ex-a', 'A', 1, 30, 120);
  const next = makeEx('ex-b', 'B', 1, 30);
  const steps = buildExerciseSteps([ex, next]);
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[1], exercises: [ex, next], fallbackRestSec: 90, exerciseTransitionRestSec: 45 }), 120);
});

ok('P5. transitionRestSec absent → fallback exerciseTransitionRestSec global', () => {
  const ex = makeEx('ex-a', 'A', 1, 30);
  const next = makeEx('ex-b', 'B', 1, 30);
  const steps = buildExerciseSteps([ex, next]);
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[1], exercises: [ex, next], fallbackRestSec: 90, exerciseTransitionRestSec: 75 }), 75);
});

ok('P6. transitionRestSec invalide (négatif, NaN, Infinity, string) → fallback global', () => {
  const invalidValues: any[] = [-5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, '60', null, undefined];
  invalidValues.forEach((v) => {
    const ex = makeEx('ex-a', 'A', 1, 30);
    (ex as any).transitionRestSec = v;
    const next = makeEx('ex-b', 'B', 1, 30);
    const steps = buildExerciseSteps([ex, next]);
    assert.equal(resolveGuidedRestSec({ upcomingStep: steps[1], exercises: [ex, next], fallbackRestSec: 90, exerciseTransitionRestSec: 75 }), 75, `valeur invalide: ${String(v)}`);
  });
});

ok('P15. transitionRestSec = 0 → AUCUN repos de transition (skip rest)', () => {
  const ex = makeEx('ex-a', 'A', 1, 30, 0);
  const next = makeEx('ex-b', 'B', 1, 30);
  const steps = buildExerciseSteps([ex, next]);
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[1], exercises: [ex, next], fallbackRestSec: 90, exerciseTransitionRestSec: 45 }), 0);
});

ok('P16. dernier exercice : pas de repos de transition ajouté dans la durée estimée', () => {
  // 2 exercices 1 série reps : 45+45=90 exécution ; 1 transition 60 (A->B) ; aucun après B.
  const a = makeEx('ex-a', 'A', 1, 30, 60);
  const b = makeEx('ex-b', 'B', 1, 30);
  assert.equal(estimatedGuidedDurationSec([a, b], [], 30, 30), 150);
});

ok('P7. transitionRestSec invalide ET global invalide → 30 s par défaut', () => {
  const ex = makeEx('ex-a', 'A', 1, 30);
  (ex as any).transitionRestSec = Number.NaN;
  const next = makeEx('ex-b', 'B', 1, 30);
  const steps = buildExerciseSteps([ex, next]);
  [Number.NaN, Number.POSITIVE_INFINITY, -20, 0].forEach((g) => {
    assert.equal(resolveGuidedRestSec({ upcomingStep: steps[1], exercises: [ex, next], fallbackRestSec: 90, exerciseTransitionRestSec: g }), DEFAULT_TRANSITION_REST_SEC, `global invalide: ${String(g)}`);
  });
});

ok('P8. restSec et transitionRestSec indépendants: repos entre séries = 30, repos entre exercices = 90', () => {
  const ex = makeEx('ex-a', 'A', 2, 30, 90);
  const next = makeEx('ex-b', 'B', 2, 30);
  const steps = buildExerciseSteps([ex, next]);
  // A-0 -> A-1 : même exercice => restSec de A
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[1], exercises: [ex, next], fallbackRestSec: 90, exerciseTransitionRestSec: 45 }), 30);
  // A-1 -> B-0 : transition => transitionRestSec de A
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[2], exercises: [ex, next], fallbackRestSec: 90, exerciseTransitionRestSec: 45 }), 90);
});

ok('P9. deux exercices avec transitions différentes: après A = 60, après B = 120', () => {
  const a = makeEx('ex-a', 'A', 1, 30, 60);
  const b = makeEx('ex-b', 'B', 1, 30, 120);
  const steps = buildExerciseSteps([a, b]);
  // B-0 : après A => 60
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[1], exercises: [a, b], fallbackRestSec: 90, exerciseTransitionRestSec: 30 }), 60);
  // C-0 (après B) => 120 ; il faut un 3e exercice après B
  const c = makeEx('ex-c', 'C', 1, 30);
  const steps3 = buildExerciseSteps([a, b, c]);
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps3[2], exercises: [a, b, c], fallbackRestSec: 90, exerciseTransitionRestSec: 30 }), 120);
});

ok('P10. modifier la transition de A ne modifie PAS celle de B', () => {
  const a = makeEx('ex-a', 'A', 1, 30, 60);
  const b = makeEx('ex-b', 'B', 1, 30, 120);
  const steps = buildExerciseSteps([a, b]);
  // après A (avant B) => 60
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[1], exercises: [a, b], fallbackRestSec: 90, exerciseTransitionRestSec: 30 }), 60);
  // A modifiée à 15 => la résolution utilise 15
  const a2 = { ...a, transitionRestSec: 15 };
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[1], exercises: [a2, b], fallbackRestSec: 90, exerciseTransitionRestSec: 30 }), 15);
  // après B (devant C) => 120, inchangée par la modification de A
  const c = makeEx('ex-c', 'C', 1, 30);
  const steps3 = buildExerciseSteps([a2, b, c]);
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps3[2], exercises: [a2, b, c], fallbackRestSec: 90, exerciseTransitionRestSec: 30 }), 120);
  // après C (sans transitionRestSec) => global 30
  const d = makeEx('ex-d', 'D', 1, 30);
  const steps4 = buildExerciseSteps([a2, b, c, d]);
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps4[3], exercises: [a2, b, c, d], fallbackRestSec: 90, exerciseTransitionRestSec: 30 }), 30);
});

ok('P11. durée estimée: transitionRestSec propres aux exercices (60 puis 90)', () => {
  const a = makeEx('ex-a', 'A', 1, 30, 60);
  const b = makeEx('ex-b', 'B', 1, 30, 90);
  const c = makeEx('ex-c', 'C', 1, 30);
  // 3 fois 45s d\'exécution = 135 ; après A = 60 ; après B = 90 ; (après C : dernier, pas de repos) => 285
  assert.equal(estimatedGuidedDurationSec([a, b, c], [], 30, 30), 285);
});

ok('P12. durée estimée: exercice sans transitionRestSec → global', () => {
  const a = makeEx('ex-a', 'A', 1, 30);
  const b = makeEx('ex-b', 'B', 1, 30);
  // 90 d\'exécution + 45 (global) = 135
  assert.equal(estimatedGuidedDurationSec([a, b], [], 30, 45), 135);
});

ok('P13. resolveTransitionRestSec: priorité exercice → global → 30 s ; 0 explicite = aucun repos', () => {
  const ex75 = makeEx('ex-x', 'X', 1, 30, 75);
  assert.equal(resolveTransitionRestSec(ex75, 30), 75);
  assert.equal(resolveTransitionRestSec(makeEx('ex-x', 'X', 1, 30), 30), 30);
  assert.equal(resolveTransitionRestSec(makeEx('ex-x', 'X', 1, 30, Number.NaN), 60), 60);
  // Un 0 explicitement configuré = AUCUN repos de transition (ex. dernier exercice).
  assert.equal(resolveTransitionRestSec(makeEx('ex-x', 'X', 1, 30, 0), 60), 0);
  assert.equal(resolveTransitionRestSec(makeEx('ex-x', 'X', 1, 30, -10), 60), 60);
  assert.equal(resolveTransitionRestSec(makeEx('ex-x', 'X', 1, 30, 0), 30), 0);
  assert.equal(resolveTransitionRestSec(undefined, 60), 60);
  assert.equal(resolveTransitionRestSec(undefined, undefined), DEFAULT_TRANSITION_REST_SEC);
  assert.equal(resolveTransitionRestSec(undefined, Number.POSITIVE_INFINITY), DEFAULT_TRANSITION_REST_SEC);
});

ok('P14. scénario de validation (exigence 18): global 30, A=60/B=90/C=45, repos entre séries=30', () => {
  // Squats (5 séries), Reverse lunges (4), Glute bridge (4) ; global = 30
  const a = makeEx('ex-a', 'Squats', 5, 30, 60);
  const b = makeEx('ex-b', 'Reverse lunges', 4, 30, 90);
  const c = makeEx('ex-c', 'Glute bridge', 4, 30, 45);
  const steps = buildExerciseSteps([a, b, c]);
  const global = 30;
  const rest = (i: number) =>
    resolveGuidedRestSec({ upcomingStep: steps[i], exercises: [a, b, c], fallbackRestSec: 90, exerciseTransitionRestSec: global });
  // Série 2 à 5 de Squats : repos ENTRE SÉRIES = 30 (restSec de l'exercice)
  assert.equal(rest(1), 30);
  assert.equal(rest(4), 30);
  // Squats (fini) → Reverse lunges : 60 (transitionRestSec de Squats)
  assert.equal(rest(5), 60);
  // Séries 2..4 de Reverse lunges : 30
  assert.equal(rest(6), 30);
  assert.equal(rest(8), 30);
  // Reverse lunges (fini) → Glute bridge : 90
  assert.equal(rest(9), 90);
  // Séries 2..4 de Glute bridge : 30
  assert.equal(rest(10), 30);
  assert.equal(rest(12), 30);
  // Dernier exercice : pas de repos après (fin de séance) — vérifié par la durée estimée.
  const estimate = estimatedGuidedDurationSec([a, b, c], [], 30, global);
  // exécution 5*45 + 4*45 + 4*45 = 585 ; repos : 60 + 90 (fin? C est dernier -> pas de repos après C)
  // + entre séries : Squats 4*30 + Reverse 3*30 + Glute 3*30 = 300 ; transitions 60+90 = 150 => total 1035
  assert.equal(estimate, 585 + 300 + 150);
});

ok('R1. resolveRestSec: restSec propre → celui-ci (jamais transitionRestSec)', () => {
  const ex = makeEx('ex-x', 'X', 1, 20, 60);
  assert.equal(resolveRestSec(ex, 90), 20);
  assert.ok(resolveRestSec(ex, 90) !== 60);
});

ok('R2. resolveRestSec: sans restSec → fallback (30 par défaut)', () => {
  assert.equal(resolveRestSec(makeEx('ex-x', 'X', 1), 90), 90);
  assert.equal(resolveRestSec(makeEx('ex-x', 'X', 1), undefined), DEFAULT_REST_SEC);
  assert.equal(resolveRestSec(undefined, undefined), DEFAULT_REST_SEC);
  assert.equal(resolveRestSec(undefined, 120), 120);
});

ok('R3. resolveRestSec: 0 explicite = AUCUN repos entre séries', () => {
  assert.equal(resolveRestSec(makeEx('ex-x', 'X', 1, 0), 90), 0);
});

ok('R4. resolveRestSec: valeurs invalides → fallback (jamais NaN/Infinity/négatif)', () => {
  const invalid: any[] = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -5, '60', null];
  invalid.forEach((v) => {
    const ex = makeEx('ex-x', 'X', 1);
    ex.restSec = v;
    assert.equal(resolveRestSec(ex, 90), 90, `restSec invalide: ${String(v)}`);
    assert.equal(resolveRestSec(ex, undefined), DEFAULT_REST_SEC, `restSec invalide (défaut): ${String(v)}`);
  });
});

ok('R5. entre séries: 0 = aucun repos (skip), transition suivante intacte', () => {
  // A a 2 séries restSec=0 : A-0 -> A-1 => 0 (aucun repos).
  // (exercice suivant) B-0 => transition de A (60).
  const a = makeEx('ex-a', 'A', 2, 0, 60);
  const b = makeEx('ex-b', 'B', 1, 30);
  const steps = buildExerciseSteps([a, b]);
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[1], exercises: [a, b], fallbackRestSec: 90, exerciseTransitionRestSec: 30 }), 0);
  assert.equal(resolveGuidedRestSec({ upcomingStep: steps[2], exercises: [a, b], fallbackRestSec: 90, exerciseTransitionRestSec: 30 }), 60);
});

ok('R6. durée estimée: restSec INDIVIDUEL à chaque exercice (20 puis 60)', () => {
  // A: 2 séries reps restSec=20 ; B: 2 séries reps restSec=60 ; transitions 1x30.
  // exécution 4*45 = 180 ; entre séries A = 20 ; entre séries B = 60 ; transition A->B = 30 => 290
  const a = makeEx('ex-a', 'A', 2, 20, 30);
  const b = makeEx('ex-b', 'B', 2, 60, 30);
  assert.equal(estimatedGuidedDurationSec([a, b], [], 30, 30), 180 + 20 + 60 + 30);
});

// --- Repos entre étirements (LOT 10.2) --------------------------------------

function mkStretch(id: string, durationSec: number, hasSides?: boolean): StretchItem {
  return { id, name: id, targetArea: 'Jambes', durationSec, hasSides, instruction: 'Tiens la position.' };
}

ok('S1. resolveStretchRestSec: paramètre global de transition respecté, 30 s par défaut', () => {
  assert.equal(resolveStretchRestSec(45), 45);
  assert.equal(resolveStretchRestSec(120), 120);
  assert.equal(resolveStretchRestSec(undefined), DEFAULT_TRANSITION_REST_SEC);
  assert.equal(resolveStretchRestSec(Number.NaN), DEFAULT_TRANSITION_REST_SEC);
  assert.equal(resolveStretchRestSec(Number.POSITIVE_INFINITY), DEFAULT_TRANSITION_REST_SEC);
  assert.equal(resolveStretchRestSec(-10), DEFAULT_TRANSITION_REST_SEC);
});

ok('S2. durée estimée: repos après CHAQUE étirement (côtés inclus) sauf le dernier', () => {
  // s1 (2 côtés 20s), s2 (10s), s3 (10s) ; étapes s1-1, s1-2, s2-1, s3-1.
  // Repos entre chaque paire d'étapes consécutives : 3 repos de 45 s (global).
  const s1 = mkStretch('s1', 20, true);
  const s2 = mkStretch('s2', 10, false);
  const s3 = mkStretch('s3', 10, false);
  assert.equal(estimatedGuidedDurationSec([], [s1, s2, s3], 30, 45), 20 + 20 + 10 + 10 + 45 * 3);
  // Un seul étirement à 2 côtés : repos entre le côté droit et le côté gauche.
  assert.equal(estimatedGuidedDurationSec([], [s1], 30, 45), 40 + 45);
  // Aucun étirement : estimé inchangé (0).
  assert.equal(estimatedGuidedDurationSec([], [], 30, 45), 0);
});

ok('S3. durée estimée: pas de repos entre le dernier exercice et le 1er étirement', () => {
  const a = makeEx('ex-a', 'A', 1, 30, 60);
  const s1 = mkStretch('s1', 10, false);
  // A : 45 s ; dernier exercice -> 1er étirement sans repos (comportement actuel) ; étirement 10 s => 55.
  assert.equal(estimatedGuidedDurationSec([a], [s1], 30, 45), 55);
});

ok('S4. durée estimée: dernier étirement → AUCUN repos inutile avant le résumé', () => {
  // s1 puis s2 : un seul repos entre les deux ; aucun repos après s2.
  const s1 = mkStretch('s1', 20, false);
  const s2 = mkStretch('s2', 10, false);
  assert.equal(estimatedGuidedDurationSec([], [s1, s2], 30, 45), 20 + 10 + 45);
});

ok('S5. durée estimée: deux occurrences consécutives du MÊME étirement → repos entre chacune', () => {
  // Occurrences identiques consécutives dans la séquence (1 côté chacune) :
  // le nom / exerciseId identique ne supprime PAS le repos.
  const a1 = mkStretch('st-quad', 20, false);
  const a2 = mkStretch('st-quad', 20, false);
  const b = mkStretch('st-ham', 10, false);
  // étapes : quad, quad, ham → repos entre quad1→quad2 ET quad2→ham ; rien après ham.
  assert.equal(estimatedGuidedDurationSec([], [a1, a2, b], 30, 45), 20 + 20 + 10 + 45 * 2);
});

ok('S6. durée estimée: A côté droit → A côté gauche → repos entre les côtés', () => {
  // Le changement de côté compte comme un nouvel étirement.
  const s1 = mkStretch('st-quad', 30, true);
  assert.equal(estimatedGuidedDurationSec([], [s1], 30, 30), 30 + 30 + 30);
});

ok('S7. programme réel Core : repos entre CHAQUE étirement (aucun après le dernier)', () => {
  const steps = buildStretchSteps(CORE_STRETCHES);
  const rests = steps.length - 1;
  const dur = CORE_STRETCHES.reduce((a, s) => a + s.durationSec * (s.hasSides ? 2 : 1), 0);
  assert.equal(estimatedGuidedDurationSec([], CORE_STRETCHES, 30, 45), dur + rests * 45);
});

ok('S8. programme réel Lower : repos entre CHAQUE étirement (aucun après le dernier)', () => {
  const steps = buildStretchSteps(LOWER_BODY_STRETCHES);
  const rests = steps.length - 1;
  const dur = LOWER_BODY_STRETCHES.reduce((a, s) => a + s.durationSec * (s.hasSides ? 2 : 1), 0);
  assert.equal(estimatedGuidedDurationSec([], LOWER_BODY_STRETCHES, 30, 45), dur + rests * 45);
});

ok('S9. programme Mobility (Dimanche) : sans étirements → estimation inchangée (0)', () => {
  assert.equal(estimatedGuidedDurationSec([], [], 30, 45), 0);
});

ok('B1. +15s ajoute EXACTEMENT 15s par clic (15→30→45→60→75, aucun double traitement)', () => {
  let v = 15;
  for (const expected of [30, 45, 60, 75]) {
    v = adjustRestSeconds(v, 15);
    assert.equal(v, expected);
  }
});

ok('B2. -15s retire EXACTEMENT 15s par clic (75→60→45→30→15)', () => {
  let v = 75;
  for (const expected of [60, 45, 30, 15]) {
    v = adjustRestSeconds(v, -15);
    assert.equal(v, expected);
  }
});

ok('B3. ajustement borné ≥ 0 (jamais négatif ; 0 = le repos se termine)', () => {
  assert.equal(adjustRestSeconds(15, -15), 0);
  assert.equal(adjustRestSeconds(5, -15), 0);
  assert.equal(adjustRestSeconds(0, -15), 0);
  assert.equal(adjustRestSeconds(30, 15), 45);
  assert.equal(adjustRestSeconds(Number.NaN, 15), 15);
  assert.equal(adjustRestSeconds(undefined as unknown as number, 15), 15);
});

console.log(`\n===== RÉSUMÉ =====`);
console.log(`${passed}/${passed + failed} PASS`);