// LOT 11 — Refonte UX/UI : invariants statiques et métier.
//
// Contrairement aux suites précédentes, ce fichier contrôle avant tout les
// choix UX introduits par le LOT 11 à partir des FICHIERS réels (aucun DOM) :
//   1. l'ordre par défaut du dashboard (sans écraser un ordre personnalisé) ;
//   2. l'élimination des conversions reps<->durée ("≈") dans la séance ;
//   3. les contrôles cartes mobiles de séries + repos ±15 s ;
//   4. les aria-labels sur les boutons icônes purs (Exercices / Étirements) ;
//   5. les filtres actifs supprimables un à un + compteur ;
//   6. la légende du calendrier (Aujourd'hui / jour sélectionné) ;
//   7. la navigation groupée (desktop) + bouton "Menu" (mobile → drawer) ;
//   8. le header (streak desktop-only, clic XP → progression, wording réseau) ;
//   9. l'accueil : hero "Action du jour" + bloc "Plan de la séance" dédoublonné.
//
// Exécutable via :  tsx tests/lot11.test.ts

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DASHBOARD_BLOCK_KEYS,
  DEFAULT_DASHBOARD_BLOCKS,
  DASHBOARD_BLOCK_LABELS,
  normaliseDashboardBlocks,
} from '../src/utilsSettings';

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

function listSrcFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
    }
  };
  walk(SRC);
  return out;
}

// ---- 1. Dashboard : ordre par défaut LOT 11 -----------------------------
ok('11.1 ordre par défaut du dashboard (9 blocs, ordre LOT 11)', () => {
  assert.deepEqual([...DASHBOARD_BLOCK_KEYS], [
    'next-session',
    'recommendation',
    'weekly',
    'stats',
    'streak',
    'level',
    'volume',
    'badges',
    'records',
  ]);
  assert.equal(DASHBOARD_BLOCK_KEYS.length, 9);
  assert.deepEqual([...DEFAULT_DASHBOARD_BLOCKS], [...DASHBOARD_BLOCK_KEYS]);
  for (const key of DASHBOARD_BLOCK_KEYS) {
    assert.ok(DASHBOARD_BLOCK_LABELS[key], `label présent pour ${key}`);
  }
});

ok('11.2 un ordre personnalisé stocké est préservé (jamais écrasé)', () => {
  const custom = ['records', 'streak', 'volume'];
  assert.deepEqual(normaliseDashboardBlocks(custom), custom);
  const customFull = ['records', 'badges', 'level', 'weekly', 'recommendation', 'next-session', 'stats', 'streak', 'volume'];
  assert.deepEqual(normaliseDashboardBlocks(customFull), customFull);
  // Une liste vide explicite reste vide (l'utilisateur a tout masqué).
  assert.deepEqual(normaliseDashboardBlocks([]), []);
});

// ---- 2. Séance : plus aucune conversion reps<->durée --------------------
ok('11.3 aucun caractère "≈" dans tout src/', () => {
  for (const file of listSrcFiles()) {
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('≈'),
      `${path.relative(ROOT, file)} contient un "≈" (conversion reps<->durée interdite)`
    );
  }
});

ok('11.4 WorkoutSessionPage : import utilsExerciseMode allégé', () => {
  const src = read('pages/WorkoutSessionPage.tsx');
  const importLine = src.split('\n').find((l) => l.includes("from '../utilsExerciseMode'"));
  assert.ok(importLine, "import utilsExerciseMode présent");
  assert.ok(!importLine!.includes('repsToDurationSec'), "repsToDurationSec encore importé");
  assert.ok(!importLine!.includes('durationToReps'), "durationToReps encore importé");
});

ok('11.5 WorkoutSessionPage : repos inter-séries en ±15 s (Jauge propre)', () => {
  const src = read('pages/WorkoutSessionPage.tsx');
  assert.ok(src.includes('aria-label="Retirer 15 secondes de repos"'));
  assert.ok(src.includes('aria-label="Ajouter 15 secondes de repos"'));
  assert.ok(src.includes('−15 s'));
  assert.ok(src.includes('+15 s'));
  assert.ok(src.includes('Passer'));
  assert.ok(!src.includes('+30s'), "le bouton +30s doit avoir disparu");
});

ok('11.6 WorkoutSessionPage : cartes séries mobile + aria-label valider', () => {
  const src = read('pages/WorkoutSessionPage.tsx');
  assert.ok(src.includes('flex flex-col gap-2.5 p-3 rounded-2xl'), 'carte mobile série');
  assert.ok(src.includes('sm:grid sm:grid-cols-12'), 'grille desktop conservée');
  assert.ok(src.includes('aria-label={set.completed ? \'Marquer la série comme incomplète\' : \'Valider la série\'}'));
  assert.ok(src.includes('aria-label={audioEnabled ? \'Désactiver le son\' : \'Activer le son\'}'));
});

// ---- 4-5. Bibliothèque d'exercices : aria-labels + filtres actifs -------
ok('11.7 Exercices : aria-labels sur les boutons icônes purs', () => {
  const src = read('pages/ExercisesPage.tsx');
  assert.ok(src.includes('aria-label="Effacer la recherche"'));
  assert.ok(src.includes('aria-label="Fermer le formulaire"'));
  assert.ok(src.includes('aria-label="Fermer la fiche exercice"'));
  assert.ok(src.includes('Ajouter aux favoris'));
  assert.ok(src.includes('Retirer des favoris'));
  assert.ok(src.includes("aria-label={`Supprimer l'étape"));
  assert.ok(src.includes("aria-label={`Supprimer l'erreur"));
});

ok('11.8 Exercices : filtres actifs supprimables un à un + compteur', () => {
  const src = read('pages/ExercisesPage.tsx');
  assert.ok(src.includes('Retirer le filtre :'));
  assert.ok(src.includes('data-testid="exercise-count"'));
  assert.ok(src.includes('Filtrer par muscle / zone :'));
});

// ---- 4. Étirements ------------------------------------------------------
// La fiche étirement est partagée (StretchDetailModal) entre la page Étirements
// et la Bibliothèque UNIFIÉE d'exercices : l'invariant est vérifié sur le
// composant partagé (fermeture accessible + verbe "Commencer").
ok('11.9 Étirements : fermeture accessible + verbe "Commencer"', () => {
  const modal = read('components/StretchDetailModal.tsx');
  assert.ok(modal.includes('aria-label="Fermer la fiche étirement"'));
  assert.ok(!modal.includes('Démarrer'), "le verbe 'Démarrer' doit avoir disparu (vocabulaire uniforme)");
  assert.ok(modal.includes("'Commencer'"));
  const page = read('pages/StretchesPage.tsx');
  assert.ok(page.includes('<StretchDetailModal'), 'la page Étirements doit utiliser la fiche partagée');
  const ex = read('pages/ExercisesPage.tsx');
  assert.ok(ex.includes('<StretchDetailModal'), 'la bibliothèque unifiée doit aussi utiliser la fiche partagée');
});

// ---- 6. Calendrier : légende --------------------------------------------
ok(`11.10 Calendrier : légende complétée (Aujourd'hui + jour sélectionné)`, () => {
  const src = read('pages/CalendarPage.tsx');
  assert.ok(src.includes("Aujourd'hui"), "légende 'Aujourd'hui'");
  assert.ok(src.includes('Jour sélectionné'));
  assert.ok(src.includes('Séance programmée (planifiée)'));
});

// ---- 7. Navigation ------------------------------------------------------
ok('11.11 Navigation : groupes desktop + bouton "Menu" mobile (drawer)', () => {
  const src = read('components/Navigation.tsx');
  assert.ok(src.includes("label: 'Entraînement'"));
  assert.ok(src.includes("label: 'Suivi'"));
  assert.ok(src.includes("label: 'Profil'"));
  assert.ok(src.includes('onOpenMobileMenu?: () => void'), 'prop d\'ouverture drawer');
  assert.ok(src.includes('aria-label="Ouvrir le menu de navigation"'));
  assert.ok(src.includes('<Menu '));
});

// ---- 8. Header ----------------------------------------------------------
ok('11.12 Header : streak desktop-only, XP → progression, wording réseau', () => {
  const src = read('components/Header.tsx');
  assert.ok(src.includes('hidden md:flex'), 'streak/XP cachés sur mobile');
  assert.ok(src.includes("onNavigate('progression')"), 'clic XP → progression');
  assert.ok(src.includes('Données locales'), "libellé en ligne");
  assert.ok(src.includes('Mode hors ligne'), "libellé hors ligne");
});

// ---- 9. Accueil ---------------------------------------------------------
ok('11.13 Accueil : hero "Action du jour" + bloc "Plan de la séance" sans doublon', () => {
  const src = read('pages/HomePage.tsx');
  assert.ok(src.includes('Action du jour'));
  assert.ok(src.includes("AUJOURD'HUI"));
  assert.ok(src.includes('PROCHAINE SÉANCE'));
  assert.ok(src.includes('Plan de la séance'), "bloc dédoublonné présent");
  assert.ok(!src.includes('home-start-session-day'), "bouton 'Commencer' dupliqué supprimé");
  assert.ok(!src.includes('Layers'), "import Layers retiré");
  assert.ok(src.includes('data-testid="home-next-session"'));
});

// ---- Résumé -------------------------------------------------------------
console.log(`\nLOT 11 — ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);