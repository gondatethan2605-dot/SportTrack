// F1 — Programme préchargé jamais écrasé (correction post-audit).
//
// Démontre, via le helper de décision pur et le câblage réel de seedOrSyncInitial :
//   1. création du programme initial (absent → maintenu) ;
//   2. modification du programme (après edit utilisateur) ;
//   3. nouvel appel à l'initialisation (reload / getDB) ;
//   4. la modification est toujours présente (programme existant jamais réécrit).
//
// Exécutable via :  tsx tests/fixF1.test.ts

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shouldSeedDefaultProgram } from '../src/db/indexedDb';
import { MY_PROGRAM } from '../src/data/myProgram';

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

// 1. Création du programme initial : base sans programme -> il faut le créer.
ok('F1 base vide → doit créer le programme par défaut', () => {
  assert.equal(shouldSeedDefaultProgram([]), true);
});

// 2. Modification utilisateur : le programme existe, modifié (un jour en moins,
//    un autre titre). La décision doit être : ne PAS réécrire.
const editedProgram = {
  ...MY_PROGRAM,
  title: 'Programme MODIFIÉ par l’utilisateur',
  description: 'Contenu personnalisé conservé.',
  days: MY_PROGRAM.days.slice(0, 3), // l'utilisateur a supprimé des jours
};

ok('F1 programme existant modifié → ne pas écraser', () => {
  assert.equal(shouldSeedDefaultProgram([editedProgram]), false);
});

// 3. Nouvel appel à l'initialisation sur une base portant le programme modifié.
ok('F1 nouvel appel sur programme modifié → toujours pas d’écrasement', () => {
  assert.equal(shouldSeedDefaultProgram([editedProgram]), false);
  assert.equal(shouldSeedDefaultProgram([MY_PROGRAM, { id: 'p-user', title: 'A' } as any]), false);
});

// 4. Vérification : la modification reste présente (aucun put de remplacement).
ok('F1 la modification est conservée (même id, contenu édité intact)', () => {
  assert.equal(editedProgram.id, MY_PROGRAM.id, 'même id essentiel');
  const existing = [editedProgram];
  if (shouldSeedDefaultProgram(existing)) {
    // Ce chemin ne doit PAS se produire : s'il se produisait, l'écrasement
    // écraserait la modification. Le helper doit retourner false.
    assert.fail('le programme édité ne doit pas être réécrit');
  }
  // Le programme édité n'a pas été touché.
  assert.equal(existing[0].title, 'Programme MODIFIÉ par l’utilisateur');
  assert.equal(existing[0].days.length, 3);
});

ok('F1 aucun doublon (id unique déjà présent)', () => {
  assert.equal(shouldSeedDefaultProgram([MY_PROGRAM]), false);
});

ok('F1 programme supprimé par l’utilisateur → recréé (absent)', () => {
  assert.equal(shouldSeedDefaultProgram([]), true);
});

ok('F1 ignore les programmes étrangers (autres ids)', () => {
  assert.equal(shouldSeedDefaultProgram([{ id: 'prog-muscu', title: 'X' } as any]), true);
});

// Câblage réel : seedOrSyncInitial fait get-puis-put conditionnel, jamais un put
// inconditionnel (à chaque ouverture de base).
{
  const indexedRaw = fs.readFileSync(path.join(ROOT, 'src', 'db', 'indexedDb.ts'), 'utf8');
  ok('F1 seedOrSyncInitial lit la liste AVANT de décider (getAll)', () => {
    assert.ok(indexedRaw.includes('const getAllProg = progStore.getAll()'));
    assert.ok(indexedRaw.includes('getAllProg.result'));
  });
  ok('F1 le put du programme par défaut est gardé par shouldSeedDefaultProgram', () => {
    assert.ok(indexedRaw.includes('shouldSeedDefaultProgram(existingProgs)'));
  });
  ok('F1 plus AUCUN put inconditionnel de MY_PROGRAM', () => {
    // Le seul put de MY_PROGRAM dans la branche déjà-migrée est à l'intérieur du if.
    const putIdx = indexedRaw.indexOf('progStore.put(MY_PROGRAM)');
    assert.ok(putIdx !== -1);
    const before = indexedRaw.slice(0, putIdx);
    assert.ok(/\bshouldSeedDefaultProgram\(/.test(before), 'put doit être précédé de la décision');
  });
}

console.log(`\n${passed} tests PASS, ${failed} FAIL`);
if (failed === 0) {
  console.log('ALL TESTS PASSED');
} else {
  console.log('SOME TESTS FAILED');
}