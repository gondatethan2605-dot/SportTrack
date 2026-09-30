// LOT 11.1 — Nettoyage visuel des cartes de la bibliothèque d'exercices.
//
// Objectif : suppression UNIQUEMENT de l'affichage de la prescription en bas
// des cartes ("4 × 10", "4 × 50 sec", "75s", "fois par pied", ...).
// Les données defaultSets/defaultReps/defaultRestSec (+ plans de programme)
// doivent continuer d'exister et de fonctionner partout où elles sont utiles.
//
// Vérifié ici :
//   1. la carte n'affiche plus de prescription (scan statique du JSX) ;
//   2. les données de prescription existent toujours dans la bibliothèque ;
//   3. les configs du programme par défaut conservent séries/reps/durée/repos ;
//   4. le reps restent reps, le timer reste timer (aucune conversion) ;
//   5. IndexedDB inchangé, DB_VERSION = 8 (pas de V9) ;
//   6. formule XP inchangée ;
//   7. programme par défaut v2 inchangé (structure + configs préservées).
//
// Exécutable via :  tsx tests/lot111.test.ts

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initialExercises } from '../src/data/initialExercises';
import { MY_PROGRAM } from '../src/data/myProgram';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

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

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

// ---- 1. La carte ne montre plus de prescription --------------------------
ok('111.1 cartes : la prescription n\'est plus affichée', () => {
  const src = readSrc('pages/ExercisesPage.tsx');
  assert.ok(!src.includes('{ex.defaultSets}'), 'séries de la carte retirées');
  assert.ok(!src.includes('{ex.defaultReps}'), 'répétitions de la carte retirées');
  assert.ok(!src.includes('{ex.defaultRestSec}'), 'durée de repos de la carte retirée');
});

ok('111.2 cartes : les informations descriptives sont conservées', () => {
  const src = readSrc('pages/ExercisesPage.tsx');
  assert.ok(src.includes('{ex.name}'), 'nom conservé');
  assert.ok(src.includes('{ex.description}'), 'description conservée');
  assert.ok(src.includes('{ex.difficulty}'), 'difficulté conservée');
  assert.ok(src.includes('{ex.primaryMuscle}'), 'muscle/zone conservé');
  assert.ok(src.includes('{ex.equipment}'), 'équipement conservé');
  assert.ok(src.includes('exercise-card-favorite'), 'favori conservé');
});

// ---- 2. Les données restent dans les objets exercices --------------------
ok('111.3 bibliothèque : les données de prescription existent toujours', () => {
  assert.ok(initialExercises.length > 50, `bibliothèque peuplée (${initialExercises.length})`);
  for (const ex of initialExercises) {
    assert.ok(ex.name, `nom manquant: ${ex.id}`);
    assert.ok(ex.description, `description manquante: ${ex.id}`);
    assert.ok(ex.defaultSets && ex.defaultSets > 0, `defaultSets manquant: ${ex.id}`);
    assert.ok(ex.defaultReps !== undefined && ex.defaultReps !== '', `defaultReps manquant: ${ex.id}`);
    assert.ok(ex.defaultRestSec && ex.defaultRestSec > 0, `defaultRestSec manquant: ${ex.id}`);
  }
});

// ---- 3. Configs de programme : séries/reps/durée/repos préservés ---------
ok('111.4 programme par défaut : chaque config garde cible + repos', () => {
  const configs = MY_PROGRAM.days.flatMap((d) => d.exercises ?? []);
  assert.ok(configs.length > 0, 'programme avec configs riches');
  for (const cfg of configs) {
    assert.ok(cfg.sets && cfg.sets > 0, `sets: ${cfg.exerciseName}`);
    assert.ok(cfg.restSec > 0, `restSec: ${cfg.exerciseName}`);
    if (cfg.mode === 'timer') {
      assert.ok(cfg.durationSec && cfg.durationSec > 0, `durationSec timer: ${cfg.exerciseName}`);
    } else {
      assert.ok(
        cfg.reps !== undefined && cfg.reps !== '',
        `reps: ${cfg.exerciseName}`
      );
    }
  }
});

ok('111.5 programme par défaut : ids jours / configs cohérents', () => {
  for (const day of MY_PROGRAM.days) {
    assert.ok(day.exerciseIds.length > 0, `exerciseIds vides: ${day.id}`);
    assert.equal(day.exerciseIds.length, (day.exercises ?? []).length, `ids vs configs: ${day.id}`);
    for (const cfg of day.exercises ?? []) {
      assert.ok(day.exerciseIds.includes(cfg.exerciseId), `${cfg.exerciseId} absent des ids de ${day.id}`);
    }
  }
});

// ---- 4. Reps / timer préservés (aucune conversion, les deux modes existent) --
ok('111.6 bibliothèque : les prescriptions reps ET timer existent toujours', () => {
  const numeric = initialExercises.filter((e) => typeof e.defaultReps === 'number');
  const timed = initialExercises.filter((e) => typeof e.defaultReps === 'string');
  assert.ok(numeric.length > 0, 'des exercices reps (numériques) existent');
  assert.ok(timed.length > 0, 'des exercices timer (durée en texte) existent');
  // Identifiants stables pour prouver qu'aucun exercice n'a été supprimé.
  assert.ok(initialExercises.some((e) => e.id === 'ex-bench-press'), 'Développé Couché présent');
  assert.ok(initialExercises.some((e) => e.id === 'ex-leg-flutters'), 'Battements de jambes présent');
});

// ---- 5. IndexedDB inchangé, DB = V8 --------------------------------------
ok('111.7 IndexedDB : DB_VERSION reste 8 (pas de V9, pas de migration)', () => {
  const src = readSrc('db/indexedDb.ts');
  assert.ok(src.includes('DB_VERSION = 8'), "DB_VERSION = 8");
  assert.ok(!src.includes('DB_VERSION = 9'), "DB_VERSION = 9 interdit");
  assert.ok(!src.includes('= 9; //'), 'aucun commentaire de migration V9');
});

// ---- 6. XP inchangé ------------------------------------------------------
ok('111.8 XP : formule unique inchangée', () => {
  const src = readSrc('utilsXp.ts');
  assert.match(src, /250 \+ exerciseCount \* 20 \+ completedStretchesCount \* 25/);
});

// ---- 7. Programme par défaut v2 inchangé ---------------------------------
ok('111.9 programme par défaut v2 : identité et structure intactes', () => {
  assert.equal(MY_PROGRAM.id, 'prog-my-personal-bodyweight');
  assert.equal(MY_PROGRAM.daysPerWeek, 7);
  assert.equal(MY_PROGRAM.days.length, 7);
  assert.equal(MY_PROGRAM.isActive, true);
  assert.ok(MY_PROGRAM.title.includes('v2'), 'titre v2 conservé');
  for (const day of MY_PROGRAM.days) {
    // Chaque jour garde sa séance riche en configs (jamais vide).
    assert.ok((day.exercises ?? []).length > 0, `jour vide: ${day.id}`);
  }
});

console.log(`\nLOT 11.1 — ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);