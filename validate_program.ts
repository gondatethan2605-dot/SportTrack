import { MY_PROGRAM } from './src/data/myProgram';
import { initialExercises } from './src/data/initialExercises';
import { initialPrograms } from './src/data/initialData';
import { CORE_STRETCHES, LOWER_BODY_STRETCHES } from './src/data/stretchesData';
import { ProgramExerciseConfig } from './src/types';

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean) => {
  if (cond) pass++;
  else fails.push(name);
};

const ids = new Set(initialExercises.map((e: { id: string }) => e.id));

// 1. Single default program, stable official id
ok('un seul programme par défaut', initialPrograms.length === 1);
ok('id officiel conservé', MY_PROGRAM.id === 'prog-my-personal-bodyweight');

// 2. Days present / absent
// 2. Days present
const dayNames = MY_PROGRAM.days.map((d) => d.dayOfWeek);
ok('Lundi présent', dayNames.includes('Lundi'));
ok('Mardi présent', dayNames.includes('Mardi'));
ok('Mercredi présent', dayNames.includes('Mercredi'));
ok('Jeudi présent', dayNames.includes('Jeudi'));
ok('Vendredi présent', dayNames.includes('Vendredi'));
ok('Samedi présent', dayNames.includes('Samedi'));
ok('Dimanche présent', dayNames.includes('Dimanche'));
ok('7 jours', MY_PROGRAM.days.length === 7);
ok('daysPerWeek=6', MY_PROGRAM.daysPerWeek === 6);

// day order
const order = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
ok('ordre des jours Lundi→Dimanche', JSON.stringify(dayNames) === JSON.stringify(order));

const day = (name: string) => MY_PROGRAM.days.find((d) => d.dayOfWeek === name)!;

// 3. Every config references an existing library exercise + correct mode/plans
function checkDay(name: string, expected: Array<[string, number, number, number, 'reps' | 'timer']>) {
  const d = day(name);
  ok(`${name}: nb exercices`, d.exercises!.length === expected.length);
  d.exercises!.forEach((c: ProgramExerciseConfig, i: number) => {
    const [exName, sets, repsOrDur, rest, mode] = expected[i];
    ok(`${name}[${i + 1}] ${exName}: id bibliothèque`, ids.has(c.exerciseId));
    ok(`${name}[${i + 1}] ${exName}: nom`, c.exerciseName === exName);
    ok(`${name}[${i + 1}] ${exName}: nb séries ${sets}`, c.sets === sets);
    ok(`${name}[${i + 1}] ${exName}: mode ${mode}`, c.mode === mode);
    ok(`${name}[${i + 1}] ${exName}: repos ${rest}`, c.restSec === rest);
    if (mode === 'reps') {
      ok(`${name}[${i + 1}] ${exName}: reps ${repsOrDur}`, c.reps === repsOrDur);
      ok(`${name}[${i + 1}] ${exName}: repsPlan`, Array.isArray(c.repsPlan) && c.repsPlan.length === sets && c.repsPlan.every((r: number | string) => Number(r) === repsOrDur));
    } else {
      ok(`${name}[${i + 1}] ${exName}: durée ${repsOrDur}`, c.durationSec === repsOrDur);
      ok(`${name}[${i + 1}] ${exName}: durationPlan`, Array.isArray(c.durationPlan) && c.durationPlan.length === sets && c.durationPlan.every((d0: number) => d0 === repsOrDur));
    }
  });
}

checkDay('Lundi', [
  ['Montées de genoux sur place', 1, 30, 15, 'timer'],
  ['Relevé de bassin', 4, 15, 30, 'reps'],
  ['Battements de jambes', 4, 50, 30, 'timer'],
  ['Ciseaux', 4, 50, 30, 'timer'],
  ['Étoile de mer (crunch latéral)', 4, 15, 30, 'reps'],
  ['Russian twist sans poids', 4, 20, 30, 'reps'],
  ['Planche', 4, 45, 30, 'timer'],
]);
checkDay('Mardi', [
  ['Montées de genoux sur place', 1, 30, 15, 'timer'],
  ['Squats', 5, 20, 30, 'reps'],
  ['Fentes arrière', 4, 20, 30, 'reps'],
  ['Pont fessier unilatéral', 4, 12, 30, 'reps'],
  ['Élévation mollets', 5, 25, 20, 'reps'],
  ['La chaise', 4, 45, 30, 'timer'],
  ['Glute Ham Raise - Reverse Lying', 4, 15, 30, 'reps'],
]);
// Mer/Fri = exact functional copy of Lundi (Core); Jeu/Sam = exact functional copy of Mardi (Lower)
const sig = (dname: string) =>
  JSON.stringify(day(dname).exercises!.map((c) => ([c.exerciseId, c.sets, c.mode, c.reps, c.durationSec, c.restSec, c.repsPlan, c.durationPlan, c.targetWeightKg, c.notes])));
['Mercredi', 'Vendredi'].forEach((d0) => {
  ok(`${d0} = Lundi (configs identiques)`, sig(d0) === sig('Lundi'));
  ok(`${d0} = Lundi (étirements)`, JSON.stringify(day(d0).stretches!.map((s) => s.id)) === JSON.stringify(day('Lundi').stretches!.map((s) => s.id)));
});
['Jeudi', 'Samedi'].forEach((d0) => {
  ok(`${d0} = Mardi (configs identiques)`, sig(d0) === sig('Mardi'));
  ok(`${d0} = Mardi (étirements)`, JSON.stringify(day(d0).stretches!.map((s) => s.id)) === JSON.stringify(day('Mardi').stretches!.map((s) => s.id)));
});
ok('Mercredi ≠ Mardi (pas Core sur Mardi)', sig('Mercredi') !== sig('Mardi'));
ok('jeudi ≠ Lundi (pas Bas du corps sur Lundi)', sig('Jeudi') !== sig('Lundi'));

// --- Remplacement ciblé du dernier exercice Lower Body ---
['Mardi', 'Jeudi', 'Samedi'].forEach((d0) => {
  const exs = day(d0).exercises!;
  ok(`${d0}: exactement 7 exercices`, exs.length === 7);
  const last = exs[6];
  ok(`${d0}: dernier exercice = Glute Ham Raise - Reverse Lying`, last.exerciseName === 'Glute Ham Raise - Reverse Lying');
  ok(`${d0}: dernier exerciseId = ex-glute-ham-raise-floor-assisted`, last.exerciseId === 'ex-glute-ham-raise-floor-assisted');
  ok(`${d0}: mode reps`, last.mode === 'reps');
  ok(`${d0}: reps = 15`, last.reps === 15);
  ok(`${d0}: repsPlan = [15,15,15,15]`, JSON.stringify(last.repsPlan) === JSON.stringify([15, 15, 15, 15]));
  ok(`${d0}: restSec = 30`, last.restSec === 30);
  ok(`${d0}: 4 séries`, last.sets === 4);
  ok(`${d0}: durationSec = 0 (aucune conversion reps↔durée)`, last.durationSec === 0);
  ok(`${d0}: Nordic curl négatif absent`, !exs.some((c) => c.exerciseName === 'Nordic curl négatif'));
});
ok('Nordic curl négatif toujours dans la bibliothèque', initialExercises.some((e) => e.id === 'ex-nordic-negative'));
ok('Glute-ham raise ajouté UNE seule fois dans la bibliothèque', initialExercises.filter((e) => e.id === 'ex-glute-ham-raise-floor-assisted').length === 1);

// 4. Dimanche mobility
checkDay('Dimanche', [
  ['Pression isométrique contre le mur (coude collé au corps)', 3, 8, 20, 'reps'],
  ['Serré d’omoplates', 3, 12, 15, 'reps'],
  ['90-90 / Gobelet de hanche', 2, 8, 20, 'reps'],
  ['Pont fessier une jambe', 3, 12, 20, 'reps'],
  ['Jefferson Curl à vide', 3, 8, 20, 'reps'],
  ['Step-down contrôlé', 3, 10, 20, 'reps'],
  ['Extension isométrique', 3, 10, 15, 'timer'],
  ['Squat sumo avec pause', 3, 10, 30, 'reps'],
  ['Pompage sur les doigts', 2, 8, 20, 'reps'],
  ['Prière inversée', 3, 20, 15, 'timer'],
  ['Pronation / supination', 2, 12, 15, 'reps'],
  ['Alphabet avec le pied', 1, 26, 15, 'reps'],
  ['Marche talons / pointes', 2, 20, 20, 'reps'],
  ['Équilibre sur une jambe', 3, 20, 15, 'timer'],
]);

// 5. NO Y-T-W-L in the program
const allNames = MY_PROGRAM.days.flatMap((d) => (d.exercises || []).map((c) => c.exerciseName.toLowerCase()));
ok('pas de Y-T-W-L', !allNames.some((n) => n.includes('y-t-w') || n.includes('ytw')));
ok('pas de séance Haut du corps (push/pompes classiques absents)', !allNames.some((n) => n === 'pompes classiques (push-ups)'));

// 6. Stretches per day
ok('Lundi étirements core (3)', day('Lundi').stretches!.length === CORE_STRETCHES.length && day('Lundi').stretches![0].id === 'stretch-cobra');
ok('Mercredi étirements core (3)', day('Mercredi').stretches!.length === CORE_STRETCHES.length);
ok('Vendredi étirements core (3)', day('Vendredi').stretches!.length === CORE_STRETCHES.length);
ok('Mardi étirements bas du corps (4)', day('Mardi').stretches!.length === LOWER_BODY_STRETCHES.length);
ok('Jeudi étirements bas du corps (4)', day('Jeudi').stretches!.length === LOWER_BODY_STRETCHES.length);
ok('Samedi étirements bas du corps (4)', day('Samedi').stretches!.length === LOWER_BODY_STRETCHES.length);
ok('Dimanche pas d’étirements', (day('Dimanche').stretches || []).length === 0);

// 7. No duplicate config ids within a day + unique exercises map
for (const d of MY_PROGRAM.days) {
  const cfgIds = (d.exercises || []).map((c) => c.id);
  ok(`${d.dayOfWeek}: cfg ids uniques`, new Set(cfgIds).size === cfgIds.length);
}

// 8. No duplicate exercise in library (new ones aren't already there)
const libNames = initialExercises.map((e: { name: string }) => e.name.toLowerCase());
ok('ex-high-knees ajouté une seule fois', initialExercises.filter((e: { id: string }) => e.id === 'ex-high-knees').length === 1);
ok('ex-starfish-crunch ajouté une seule fois', initialExercises.filter((e: { id: string }) => e.id === 'ex-starfish-crunch').length === 1);
ok('pas de nom en double étoile', libNames.filter((n: string) => n.includes('étoile de mer')).length === 1);
ok('pas de nom en double montées de genoux', libNames.filter((n: string) => n.includes('montées de genoux')).length === 1);

console.log(`Pass: ${pass}  Fail: ${fails.length}`);
if (fails.length) {
  console.log('ÉCHECS:');
  fails.forEach((f) => console.log(' - ' + f));
  process.exit(1);
}
console.log('Programme par défaut VALIDÉ.');
