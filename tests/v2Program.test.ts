// Programme par défaut v2 — intégration du « programme_musculation_v2.md ».
//
// Vérifie :
//   1. planification 7 jours exacte (Lundi..Dimanche) ;
//   2. contenu Core (Lun/Mer/Ven), Bas du corps (Mar/Jeu/Sam), Mobilité (Dim) :
//      exercices, séries, reps/durées, repositories et modes reps/timer conformes au doc ;
//   3. repos de transition = repos du document, 0 après le dernier exercice ;
//   4. étirements attachés (Core 3, Bas du corps 4, Dimanche 0) ;
//   5. chaque exerciseId existe dans la bibliothèque ; ex-oblique-crunch ajouté,
//      ex-starfish-crunch conservé dans la bibliothèque ;
//   6. pas de Y-T-W-L ni de séance Haut du corps (version épaules en récupération) ;
//   7. logique d'upgrade sans migration : le défaut officiel stocké n'est remplacé
//      QUE s'il est identique au snapshot DEFAULT_PROGRAM_V1 (user intouché) :
//      style programme modifié jamais réécrit, upgrade idempotent ensuite ;
//   8. câblage réel dans indexedDb.ts (get-puis-put conditionnel).
//
// Exécutable via :  tsx tests/v2Program.test.ts

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shouldSeedDefaultProgram, shouldUpgradeStoredDefaultProgram } from '../src/db/indexedDb';
import { MY_PROGRAM } from '../src/data/myProgram';
import { DEFAULT_PROGRAM_V1 } from '../src/data/defaultProgramV1';
import { initialExercises, initialPrograms } from '../src/data/initialData';
import { CORE_STRETCHES, LOWER_BODY_STRETCHES } from '../src/data/stretchesData';
import { WorkoutProgram } from '../src/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

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

const day = (name: string): WorkoutProgram['days'][number] =>
  MY_PROGRAM.days.find((d) => d.dayOfWeek === name)!;
const libIds = new Set(initialExercises.map((e) => e.id));
const CFG = (d: WorkoutProgram['days'][number]) => (d.exercises || []);

// 1. Planification 7 jours
ok('v2 7 jours dans l’ordre Lundi→Dimanche', () => {
  assert.equal(MY_PROGRAM.daysPerWeek, 7);
  assert.equal(MY_PROGRAM.days.length, 7);
  assert.deepEqual(MY_PROGRAM.days.map((d) => d.dayOfWeek), [
    'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche',
  ]);
});
ok('v2 un seul programme par défaut, id officiel conservé', () => {
  assert.equal(initialPrograms.length, 1);
  assert.equal(MY_PROGRAM.id, 'prog-my-personal-bodyweight');
});

// 2. Contenu Core (Lundi)
ok('v2 Lundi — Core complet (7 exercices, modes, séries, repos)', () => {
  const cfg = CFG(day('Lundi'));
  assert.equal(cfg.length, 7);
  assert.equal(cfg[0].exerciseName, 'Montées de genoux sur place');
  assert.equal(cfg[0].mode, 'timer');
  assert.equal(cfg[0].sets, 1);
  assert.equal(cfg[0].durationSec, 30);
  assert.equal(cfg[0].restSec, 15);
  assert.equal(cfg[1].exerciseName, 'Relevé de bassin');
  assert.equal(cfg[1].mode, 'reps');
  assert.equal(cfg[1].sets, 4);
  assert.equal(cfg[1].reps, 15);
  assert.equal(cfg[1].restSec, 30);
  assert.equal(cfg[2].exerciseName, 'Battements de jambes');
  assert.equal(cfg[2].mode, 'timer');
  assert.equal(cfg[2].sets, 4);
  assert.equal(cfg[2].durationSec, 50);
  assert.equal(cfg[2].restSec, 30);
  assert.equal(cfg[3].exerciseName, 'Ciseaux');
  assert.equal(cfg[3].mode, 'timer');
  assert.equal(cfg[3].sets, 4);
  assert.equal(cfg[3].durationSec, 50);
  assert.equal(cfg[3].restSec, 30);
  assert.equal(cfg[4].exerciseName, 'Crunch oblique');
  assert.equal(cfg[4].exerciseId, 'ex-oblique-crunch');
  assert.equal(cfg[4].mode, 'reps');
  assert.equal(cfg[4].sets, 4);
  assert.equal(cfg[4].reps, 15);
  assert.equal(cfg[4].restSec, 30);
  assert.equal(cfg[5].exerciseName, 'Russian twist sans poids');
  assert.equal(cfg[5].mode, 'reps');
  assert.equal(cfg[5].sets, 4);
  assert.equal(cfg[5].reps, 20);
  assert.equal(cfg[5].restSec, 30);
  assert.equal(cfg[6].exerciseName, 'Planche');
  assert.equal(cfg[6].mode, 'timer');
  assert.equal(cfg[6].sets, 4);
  assert.equal(cfg[6].durationSec, 45);
  assert.equal(cfg[6].restSec, 30);
});
ok('v2 Lundi — repos de transition = repose du doc [15,30,30,30,30,30,0]', () => {
  assert.deepEqual(CFG(day('Lundi')).map((c) => c.transitionRestSec ?? 0), [15, 30, 30, 30, 30, 30, 0]);
});
ok('v2 Lundi — étirements Core (3)', () => {
  assert.deepEqual(day('Lundi').stretches!.map((s) => s.id), CORE_STRETCHES.map((s) => s.id));
});

// 3. Contenu Bas du corps (Mardi)
ok('v2 Mardi — Bas du corps complet (7 exercices)', () => {
  const cfg = CFG(day('Mardi'));
  assert.deepEqual(cfg.map((c) => c.exerciseName), [
    'Montées de genoux sur place', 'Squats', 'Fentes arrière', 'Pont fessier unilatéral',
    'Élévation mollets', 'La chaise', 'Glute Ham Raise - Reverse Lying',
  ]);
  const squats = cfg[1];
  assert.equal(squats.mode, 'reps');
  assert.equal(squats.sets, 5);
  assert.equal(squats.reps, 20);
  assert.equal(squats.restSec, 30);
  const fentes = cfg[2];
  assert.equal(fentes.mode, 'reps');
  assert.equal(fentes.sets, 4);
  assert.equal(fentes.reps, 20);
  const mollets = cfg[4];
  assert.equal(mollets.mode, 'reps');
  assert.equal(mollets.sets, 5);
  assert.equal(mollets.reps, 25);
  assert.equal(mollets.restSec, 20);
  const chaise = cfg[5];
  assert.equal(chaise.mode, 'timer');
  assert.equal(chaise.durationSec, 45);
  const ghr = cfg[6];
  assert.equal(ghr.mode, 'reps');
  assert.equal(ghr.sets, 4);
  assert.equal(ghr.reps, 15);
  assert.equal(ghr.restSec, 30);
});
ok('v2 Mardi — repos de transition = repose du doc [15,30,30,30,20,30,0]', () => {
  assert.deepEqual(CFG(day('Mardi')).map((c) => c.transitionRestSec ?? 0), [15, 30, 30, 30, 20, 30, 0]);
});
ok('v2 Mardi — étirements Bas du corps (4)', () => {
  assert.deepEqual(day('Mardi').stretches!.map((s) => s.id), LOWER_BODY_STRETCHES.map((s) => s.id));
});

// 4. Contenu Mobilité (Dimanche)
ok('v2 Dimanche — Mobilité & articulations (14 exercices, 0 étirement)', () => {
  const cfg = CFG(day('Dimanche'));
  assert.equal(cfg.length, 14);
  assert.deepEqual(cfg.map((c) => c.exerciseName), [
    'Pression isométrique contre le mur (coude collé au corps)', 'Serré d’omoplates',
    'Gobelet de hanche / 90-90', 'Pont fessier une jambe', 'Jefferson Curl à vide',
    'Step-down contrôlé', 'Extension isométrique', 'Squat sumo avec pause',
    'Pompage sur les doigts', 'Prière inversée', 'Pronation / supination',
    'Alphabet avec le pied', 'Marche talons / pointes', 'Équilibre sur une jambe',
  ]);
  assert.equal((day('Dimanche').stretches || []).length, 0);
});
ok('v2 Dimanche — repos de transition = repose du doc MOBILITY_REST', () => {
  assert.deepEqual(CFG(day('Dimanche')).map((c) => c.transitionRestSec ?? 0), [
    20, 15, 20, 20, 20, 20, 15, 30, 20, 15, 15, 15, 20, 0,
  ]);
});
ok('v2 Dimanche — pas de Y-T-W-L ni de séance Haut du corps', () => {
  const names = CFG(day('Dimanche')).map((c) => c.exerciseName.toLowerCase());
  assert.ok(!names.some((n) => n.includes('y-t-w') || n.includes('ytw')));
  const allNames = MY_PROGRAM.days.flatMap((d) => CFG(d).map((c) => c.exerciseName.toLowerCase()));
  assert.ok(!allNames.includes('pompes classiques (push-ups)'));
});

// 5. Copie fonctionnelle des jours
ok('v2 Mercredi/Vendredi = copies exactes de Lundi', () => {
  for (const d0 of ['Mercredi', 'Vendredi']) {
    const a = CFG(day(d0)).map((c) => JSON.stringify([
      c.exerciseId, c.sets, c.mode, c.reps, c.durationSec, c.restSec, c.transitionRestSec,
      c.repsPlan, c.durationPlan, c.notes,
    ]));
    const b = CFG(day('Lundi')).map((c) => JSON.stringify([
      c.exerciseId, c.sets, c.mode, c.reps, c.durationSec, c.restSec, c.transitionRestSec,
      c.repsPlan, c.durationPlan, c.notes,
    ]));
    assert.deepEqual(a, b);
    assert.deepEqual(day(d0).stretches!.map((s) => s.id), CORE_STRETCHES.map((s) => s.id));
  }
});
ok('v2 Jeudi/Samedi = copies exactes de Mardi', () => {
  for (const d0 of ['Jeudi', 'Samedi']) {
    const a = CFG(day(d0)).map((c) => JSON.stringify([
      c.exerciseId, c.sets, c.mode, c.reps, c.durationSec, c.restSec, c.transitionRestSec,
      c.repsPlan, c.durationPlan, c.notes,
    ]));
    const b = CFG(day('Mardi')).map((c) => JSON.stringify([
      c.exerciseId, c.sets, c.mode, c.reps, c.durationSec, c.restSec, c.transitionRestSec,
      c.repsPlan, c.durationPlan, c.notes,
    ]));
    assert.deepEqual(a, b);
    assert.deepEqual(day(d0).stretches!.map((s) => s.id), LOWER_BODY_STRETCHES.map((s) => s.id));
  }
});

// 6. Intégrité de la bibliothèque
ok('v2 tous les exerciseIds référencés existent dans la bibliothèque', () => {
  for (const d of MY_PROGRAM.days) {
    for (const c of CFG(d)) assert.ok(libIds.has(c.exerciseId), c.exerciseId);
  }
});
ok('v2 ex-oblique-crunch ajouté une seule fois ; starfish conservé en bibliothèque', () => {
  assert.equal(initialExercises.filter((e) => e.id === 'ex-oblique-crunch').length, 1);
  assert.ok(initialExercises.some((e) => e.id === 'ex-starfish-crunch'));
  assert.ok(!MY_PROGRAM.days.some((d) => CFG(d).some((c) => c.exerciseId === 'ex-starfish-crunch')));
});

// 7. Upgrades de seeds sans migration
ok('v2 snapshot V1 présent (ancien défaut avant intégration)', () => {
  assert.equal(DEFAULT_PROGRAM_V1.id, MY_PROGRAM.id);
  assert.equal(DEFAULT_PROGRAM_V1.daysPerWeek, 6);
  assert.ok(DEFAULT_PROGRAM_V1.days.some((d) => CFG(d).some((c) => c.exerciseId === 'ex-starfish-crunch')));
});
ok('v2 défaut officiel intouché (== V1) → upgrade possible', () => {
  assert.equal(shouldUpgradeStoredDefaultProgram(DEFAULT_PROGRAM_V1), true);
  const storedAsInDb = JSON.parse(JSON.stringify(DEFAULT_PROGRAM_V1)) as WorkoutProgram;
  assert.equal(shouldUpgradeStoredDefaultProgram(storedAsInDb), true);
});
ok('v2 programme par défaut (déjà upgradé) → NON réécrit (idempotent)', () => {
  assert.equal(shouldUpgradeStoredDefaultProgram(MY_PROGRAM), false);
});
ok('v2 défaut modifié (titre) → jamais réécrit', () => {
  const edited = { ...DEFAULT_PROGRAM_V1, title: 'Mon programme perso' };
  assert.equal(shouldUpgradeStoredDefaultProgram(edited), false);
});
ok('v2 défaut modifié (un jour en moins) → jamais réécrit', () => {
  const edited = { ...DEFAULT_PROGRAM_V1, days: DEFAULT_PROGRAM_V1.days.slice(0, 3) };
  assert.equal(shouldUpgradeStoredDefaultProgram(edited), false);
});
ok('v2 défaut modifié (repos/séries) → jamais réécrit', () => {
  const edited = {
    ...DEFAULT_PROGRAM_V1,
    days: DEFAULT_PROGRAM_V1.days.map((d, i) => (i === 0
      ? { ...d, exercises: d.exercises!.map((c, j) => (j === 0 ? { ...c, restSec: 60 } : c)) }
      : d)),
  } as WorkoutProgram;
  assert.equal(shouldUpgradeStoredDefaultProgram(edited), false);
});
ok('v2 null / autre id / programme étranger → aucun upgrade', () => {
  assert.equal(shouldUpgradeStoredDefaultProgram(null), false);
  assert.equal(shouldUpgradeStoredDefaultProgram(undefined), false);
  assert.equal(shouldUpgradeStoredDefaultProgram({ id: 'prog-other', title: 'X' } as any), false);
});
ok('v2 seeding initial toujours valide (fonctionne comme avant l’intégration)', () => {
  assert.equal(shouldSeedDefaultProgram([]), true);
  assert.equal(shouldSeedDefaultProgram([MY_PROGRAM]), false);
  assert.equal(shouldSeedDefaultProgram([DEFAULT_PROGRAM_V1]), false);
});

// 8. Câblage réel dans indexedDb.ts
{
  const indexedRaw = fs.readFileSync(path.join(ROOT, 'src', 'db', 'indexedDb.ts'), 'utf8');
  ok('v2 branche upgrade branchée dans seedOrSyncInitial après le seed', () => {
    assert.ok(indexedRaw.includes('shouldUpgradeStoredDefaultProgram(storedDefault)'));
    const seedIdx = indexedRaw.indexOf('shouldSeedDefaultProgram(existingProgs)');
    const upIdx = indexedRaw.indexOf('shouldUpgradeStoredDefaultProgram(storedDefault)');
    assert.ok(seedIdx !== -1 && upIdx !== -1 && upIdx > seedIdx);
  });
  ok('v2 le put d’upgrade est conditionnel (branché sur la décision)', () => {
    const upIdx = indexedRaw.indexOf('shouldUpgradeStoredDefaultProgram(storedDefault)');
    const putIdx = indexedRaw.slice(upIdx).indexOf('progStore.put(MY_PROGRAM)');
    assert.ok(putIdx !== -1);
  });
  ok('v2 le premier put reste gardé par shouldSeedDefaultProgram (fixF1 préservé)', () => {
    const putIdx = indexedRaw.indexOf('progStore.put(MY_PROGRAM)');
    assert.ok(/\bshouldSeedDefaultProgram\(/.test(indexedRaw.slice(0, putIdx)));
  });
}

console.log(`\n${passed} tests PASS, ${failed} FAIL`);
if (failed === 0) {
  console.log('ALL TESTS PASSED');
} else {
  console.log('SOME TESTS FAILED');
}