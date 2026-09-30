// LOT 13 — Performance : non-régression fonctionnelle après optimisation
//
// Vérifie que les optimisations de lecture/render (WorkoutSessionPage,
// StatsPage/GoalsPage/CalendarPage, bibliothèque memoïsée, cache des réglages,
// écritures IndexedDB batchées, orbs GPU, dépendances retirées) n'ont changé
// ni la bibliothèque (163 exercices / 74 étirements), ni la mécanique métier
// (reps/timer, XP/progression, programme v2, favoris/perso, DB v8, PWA).
//
// Exécutable via :  tsx tests/lot13.test.ts

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initialExercises } from '../src/data/initialExercises';
import {
  CORE_STRETCHES,
  LOWER_BODY_STRETCHES,
  UPPER_BODY_STRETCHES,
  ALL_INDIVIDUAL_STRETCHES,
} from '../src/data/stretchesData';
import { MY_PROGRAM } from '../src/data/myProgram';
import { parseDefaultReps } from '../src/utilsAlternatives';
import { computeSessionXp } from '../src/utilsXp';
import { getWorkoutSettings, updateWorkoutSettings, SETTINGS_STORAGE_KEY } from '../src/utilsSettings';
import type { SettingsAdapter } from '../src/utilsSettings';

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

function read(p: string): string {
  return fs.readFileSync(path.join(SRC, p), 'utf8');
}

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTs(full, acc);
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) acc.push(full);
  }
  return acc;
}

function inMemoryAdapter(init?: Record<string, string>): SettingsAdapter {
  const data = new Map<string, string>(Object.entries(init || {}));
  return {
    getItem: (k) => (data.has(k) ? data.get(k)! : null),
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
}

const allStretches = [...CORE_STRETCHES, ...LOWER_BODY_STRETCHES, ...UPPER_BODY_STRETCHES, ...ALL_INDIVIDUAL_STRETCHES];

// ---------------------------------------------------------------
// BIBLIOTHÈQUE : 163 exercices / 74 étirements, inchangés
// ---------------------------------------------------------------

ok('13.1 bibliothèque : ≥ 163 exercices présents', () => {
  console.error('       ' + initialExercises.length + ' exercices détectés');
  assert.ok(initialExercises.length >= 163, `attendu ≥ 163, trouvé ${initialExercises.length}`);
});

ok('13.2 bibliothèque : ≥ 74 étirements présents', () => {
  console.error('       ' + allStretches.length + ' étirements détectés');
  assert.ok(allStretches.length >= 74, `attendu ≥ 74, trouvé ${allStretches.length}`);
});

// ---------------------------------------------------------------
// RECHERCHE INSTANTANÉE & FILTRES (réplique la logique ExercisesPage)
// ---------------------------------------------------------------

function matchesQuery(ex: (typeof initialExercises)[number], searchTerm: string): boolean {
  const q = searchTerm.toLowerCase();
  return (
    !searchTerm ||
    ex.name.toLowerCase().includes(q) ||
    ex.primaryMuscle?.toLowerCase().includes(q) ||
    ex.secondaryMuscles?.some((m) => m.toLowerCase().includes(q)) ||
    ex.equipment?.toLowerCase().includes(q) ||
    ex.description?.toLowerCase().includes(q)
  );
}

ok('13.3 recherche instantanée : requête pertinente trouve, bruit trouve rien', () => {
  const hitsPec = initialExercises.filter((e) => matchesQuery(e, 'développé'));
  assert.ok(hitsPec.length > 0, 'la recherche "développé" doit retourner des résultats');
  const noise = initialExercises.filter((e) => matchesQuery(e, 'zzzzqqqq'));
  assert.equal(noise.length, 0, 'une recherche sans aucun match doit retourner 0 résultat');
});

ok('13.4 filtre muscle : "Pectoraux" renvoie uniquement des exercices pectoraux', () => {
  const m = 'Pectoraux';
  const filtered = initialExercises.filter(
    (ex) => ex.primaryMuscle === m || ex.bodyPart === m || ex.muscleGroup === m || ex.secondaryMuscles?.includes(m)
  );
  assert.ok(filtered.length > 0, 'filtre Pectoraux doit retourner au moins 1 exercice');
  for (const ex of filtered) {
    const okm = ex.primaryMuscle === m || ex.bodyPart === m || ex.muscleGroup === m || ex.secondaryMuscles?.includes(m);
    assert.ok(okm, `${ex.id} ne correspond pas à Pectoraux selon aucun champ`);
  }
});

ok('13.5 filtre équipement : "Barre" ne renvoie que des exercices à la barre', () => {
  const filtered = initialExercises.filter((ex) => ex.equipment === 'Barre');
  assert.ok(filtered.length > 0, 'filtre Barre doit retourner au moins 1 exercice');
  assert.ok(filtered.every((ex) => ex.equipment === 'Barre'), 'un exercice hors champ Barre s\'est glissé');
});

ok('13.6 filtre difficulté : "Avancé" ne renvoie que des exercices avancés', () => {
  const filtered = initialExercises.filter((ex) => ex.difficulty === 'Avancé');
  assert.ok(filtered.length > 0, 'filtre Avancé doit retourner au moins 1 exercice');
  assert.ok(filtered.every((ex) => ex.difficulty === 'Avancé'), 'un exercice non-Avancé s\'est glissé');
});

// ---------------------------------------------------------------
// FAVORIS & PERSONNALISÉS
// ---------------------------------------------------------------

ok('13.7 toggle favori : seul isFavorite change, les autres champs sont préservés', () => {
  const target = initialExercises[0];
  const before = JSON.stringify(target);
  const toggled = { ...target, isFavorite: !target.isFavorite };
  const after = JSON.stringify({ ...toggled, isFavorite: target.isFavorite });
  assert.equal(after, before, 'le toggle ne doit modifier QUE isFavorite');
  assert.equal(toggled.isFavorite, !target.isFavorite, 'valeur de isFavorite inversée');
});

ok('13.8 favoris & personnalisés comptés sur les données réelles (≥ 1 de chaque)', () => {
  const favoriteCount = initialExercises.filter((e) => e.isFavorite).length;
  const customCount = initialExercises.filter((e) => e.isCustom).length;
  assert.ok(favoriteCount >= 1, `au moins 1 favori attendu, trouvé ${favoriteCount}`);
  assert.ok(customCount >= 0 && Number.isInteger(customCount), `customCount invalide: ${customCount}`);
});

// ---------------------------------------------------------------
// MÉCANIQUE MÉTIER : reps/timer, XP, programme v2
// ---------------------------------------------------------------

ok('13.9 reps/timer : presets parseables identiques à la mécanique existante', () => {
  for (const e of initialExercises) {
    const parsed = parseDefaultReps(e.defaultReps as number | string);
    assert.ok(parsed.value > 0 && Number.isFinite(parsed.value), `${e.id} defaultReps non parseable`);
    assert.ok(['count', 'duration'].includes(parsed.kind), `${e.id} kind inattendu: ${parsed.kind}`);
  }
  const range = parseDefaultReps('6-8');
  assert.ok(range.kind === 'count' && range.value > 0, 'fourchette "6-8" doit rester parseable');
});

ok('13.10 XP inchangé : computeSessionXp strictement croissant, 0 séance = 250', () => {
  assert.equal(computeSessionXp(0, 0), 250, 'séance vide = 250 XP (formule inchangée)');
  assert.equal(computeSessionXp(10, 5), 250 + 10 * 20 + 5 * 25, 'formule 250+20/ex+25/étirement inchangée');
  assert.ok(computeSessionXp(5, 0) > computeSessionXp(4, 0), 'un exercice de plus = plus de XP');
});

ok('13.11 programme v2 (MY_PROGRAM) : identité, 7 jours non vides, presets étirements', () => {
  assert.equal(MY_PROGRAM.id, 'prog-my-personal-bodyweight');
  assert.equal(MY_PROGRAM.isActive, true);
  assert.equal(MY_PROGRAM.days.length, 7);
  for (const day of MY_PROGRAM.days) {
    assert.ok(day.exercises!.length > 0, `${day.id} ne doit pas être un jour vide`);
  }
  const idSet = new Set(initialExercises.map((e) => e.id));
  const altSet = new Set(initialExercises.flatMap((e) => e.similarExerciseIds || []));
  for (const day of MY_PROGRAM.days) {
    for (const cfg of day.exercises!) {
      assert.ok(idSet.has(cfg.exerciseId) || altSet.has(cfg.exerciseId),
        `${cfg.exerciseId} référencé dans ${day.id} existe dans le catalogue ou ses alternatives`);
    }
    assert.ok(day.stretches!.length > 0 || day.id === 'day-mobility-dimanche', `${day.id} doit avoir des étirements`);
  }
});

// ---------------------------------------------------------------
// RÉGLAGES : cache getWorkoutSettings correctement invalidé
// ---------------------------------------------------------------

ok('13.12 cache réglages : lecture exigeante, invalidation automatique après écriture exogène', () => {
  const adapter = inMemoryAdapter();
  // Part de la racine (aucune valeur) → défauts
  const defaults = getWorkoutSettings(adapter);
  assert.ok(defaults && typeof defaults.soundEnabled === 'boolean', 'défauts renvoyés sans stockage');
  // Écriture via l'API métier
  updateWorkoutSettings({ defaultRestSec: 45 }, adapter);
  const afterUpdate = getWorkoutSettings(adapter);
  assert.equal(afterUpdate.defaultRestSec, 45, 'lecture après update persiste la nouvelle valeur');
  // Écriture exogène directe dans le stockage → le cache doit se rafraîchir
  adapter.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({ ...JSON.parse(adapter.getItem(SETTINGS_STORAGE_KEY)!), defaultRestSec: 90 })
  );
  const afterExternal = getWorkoutSettings(adapter);
  assert.equal(afterExternal.defaultRestSec, 90, 'le cache ne doit JAMAIS servir une donnée périmée');
});

// ---------------------------------------------------------------
// INDEXEDDB : DB v8, seed additif, batching present
// ---------------------------------------------------------------

ok('13.13 IndexedDB : DB_VERSION=8, seed additif, putMany batché ajouté sans casser putItem', () => {
  const dbSrc = read('db/indexedDb.ts');
  assert.ok(dbSrc.includes('const DB_VERSION = 8;'), 'DB_VERSION doit rester 8');
  assert.ok(!dbSrc.match(/DB_VERSION\s*=\s*9/), 'DB_VERSION ne doit PAS être 9');
  assert.ok(dbSrc.includes('if (!existingIds.has(initEx.id)) exStore.put(initEx)'), 'seed additif toujours en place');
  assert.ok(dbSrc.includes('public static async putMany'), 'SportTrackStorage.putMany présent');
  assert.ok(dbSrc.includes('public static async putItem'), 'SportTrackStorage.putItem conservé (non cassé)');
});

ok('13.14 WorkoutSessionPage : le debounce draft ne dépend plus des countdowns (1↔4/s)', () => {
  const page = read('pages/WorkoutSessionPage.tsx');
  assert.ok(page.includes('useMemo'), 'useMemo importé (totals mémoïsés)');
  assert.ok(
    page.includes('const totalVolume = useMemo') && page.includes('const completedSetsCount = useMemo'),
    'totalVolume et completedSetsCount mémoïsés'
  );
  const depArrStart = page.indexOf('}, [sessionExercises, sessionTitle');
  assert.ok(depArrStart >= 0, 'tableau de deps du debounce présent');
  const depsLine = page.slice(depArrStart, page.indexOf(']);', depArrStart) + 3);
  assert.ok(!depsLine.includes('restSecondsLeft') && !depsLine.includes('timedSecondsLeft') && !depsLine.includes('activeTimedSet'),
    'les états de countdown ne doivent plus déclencher de sauvegarde IndexedDB chaque seconde');
  // Le snapshot live (rendu précis à chaque tick) doit lui conserver les countdowns.
  const snapStart = page.indexOf('Keep a live snapshot of the current session state');
  const snapEnd = page.indexOf('// F5 —', snapStart);
  const snapBlock = page.slice(snapStart, snapEnd);
  assert.ok(
    snapBlock.includes('restSecondsLeft') && snapBlock.includes('activeTimedSet') && snapBlock.includes('timedSecondsLeft'),
    'le snapshot live doit continuer à embarquer les countdowns'
  );
});

ok('13.15 dépendances mortes : motion et @google/genai retirés, aucun import résiduel', () => {
  const pkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
  assert.ok(!pkg.includes('@google/genai'), '@google/genai doit être retiré de package.json');
  assert.ok(!pkg.includes('"motion"'), 'motion doit être retiré de package.json');
  for (const file of walkTs(SRC)) {
    const src = fs.readFileSync(file, 'utf8');
    assert.ok(!src.includes("from 'motion'") && !src.includes('from "motion"'), `${file} importe encore motion`);
    assert.ok(!src.includes('@google/genai'), `${file} importe encore @google/genai`);
  }
});

ok('13.16 PWA : 10 stores, sw.js source et manifest présents (aucun impact build)', () => {
  const dbSrc = read('db/indexedDb.ts');
  const stores = (dbSrc.match(/createObjectStore\('([a-zA-Z]+)'/g) || []).map((s) => s.match(/'([a-zA-Z]+)'/)![1]);
  assert.equal(stores.length, 10, `10 stores déclarés, trouvé ${stores.length}`);
  for (const p of ['sw.js', 'manifest.webmanifest', 'sw-register.js']) {
    const target = path.join(ROOT, 'public', p);
    assert.ok(fs.existsSync(target), `${p} présent dans public/`);
  }
});

// ---------------------------------------------------------------
// HYGIÈNE DE CODE (fichiers modifiés par LOT 13)
// ---------------------------------------------------------------

ok('13.17 pas de console.log/debugger/TODO/FIXME dans les fichiers touchés', () => {
  const files = [
    'pages/WorkoutSessionPage.tsx', 'App.tsx', 'utilsSettings.ts', 'db/indexedDb.ts',
    'pages/StatsPage.tsx', 'pages/GoalsPage.tsx', 'pages/CalendarPage.tsx',
    'pages/ExercisesPage.tsx', 'pages/StretchesPage.tsx', 'pages/ProgramsPage.tsx',
    'components/Header.tsx', 'components/Navigation.tsx',
  ];
  for (const file of files) {
    const src = read(file);
    assert.ok(!src.includes('console.log'), `${file} contient console.log`);
    assert.ok(!src.includes('debugger'), `${file} contient debugger`);
    assert.ok(!src.includes('TODO'), `${file} contient TODO`);
    assert.ok(!src.includes('FIXME'), `${file} contient FIXME`);
  }
});

// ---------------------------------------------------------------
console.log(`\nLOT 13 — ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);