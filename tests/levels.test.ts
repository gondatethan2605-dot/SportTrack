import assert from 'node:assert/strict';
import { computeLevelFromXp, applyXpToProfile } from '../src/utilsLevels';
import { UserProfile } from '../src/types';

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

function profile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    name: 'Testeur',
    level: 1,
    currentXp: 0,
    nextLevelXp: 500,
    streakDays: 0,
    bestStreak: 0,
    weeklyTargetSessions: 7,
    weeklyCompletedSessions: 0,
    totalWorkouts: 0,
    totalVolumeKg: 0,
    joinedDate: '2026-09-06',
    ...overrides,
  };
}

// ---------------------------------------------------------------- LEVELS -----

ok('0 XP -> niveau 1, 0/500, 0%, 500 restants', () => {
  const r = computeLevelFromXp(0);
  assert.deepEqual(r, { level: 1, currentXp: 0, nextLevelXp: 500, percent: 0, remainingXp: 500 });
});

ok('499 XP -> niveau 1, frontière juste en-dessous', () => {
  const r = computeLevelFromXp(499);
  assert.equal(r.level, 1);
  assert.equal(r.currentXp, 499);
  assert.equal(r.remainingXp, 1);
  assert.ok(r.percent >= 0 && r.percent <= 100);
});

ok('500 XP -> niveau 2 exactement, prochain seuil 675', () => {
  const r = computeLevelFromXp(500);
  assert.equal(r.level, 2);
  assert.equal(r.currentXp, 0);
  assert.equal(r.nextLevelXp, Math.round(500 * 1.35));
  assert.equal(r.nextLevelXp, 675);
});

ok('1175 XP (=500+675) -> niveau 3, prochain seuil 911', () => {
  const r = computeLevelFromXp(1175);
  assert.equal(r.level, 3);
  assert.equal(r.currentXp, 0);
  assert.equal(r.nextLevelXp, Math.round(675 * 1.35));
  assert.equal(r.nextLevelXp, 911);
});

ok('hard inside a level: 5000 XP accumulés repasse par la même courbe', () => {
  const r1 = computeLevelFromXp(5000);
  let level = 1;
  let cur = 5000;
  let next = 500;
  while (cur >= next) {
    level += 1;
    cur -= next;
    next = Math.round(next * 1.35);
  }
  assert.equal(r1.level, level);
  assert.equal(r1.currentXp, cur);
  assert.equal(r1.nextLevelXp, next);
  assert.equal(r1.remainingXp, next - cur);
});

ok('percent clampé entre 0 et 100 pour de gros XP', () => {
  const r = computeLevelFromXp(123456);
  assert.ok(r.percent >= 0 && r.percent <= 100);
  assert.ok(r.remainingXp >= 0);
  assert.ok(r.nextLevelXp > 0);
});

ok('NaN / Infinity / négatif -> niveau 1 sanitisé', () => {
  for (const bad of [NaN, Infinity, -Infinity, -5]) {
    const r = computeLevelFromXp(bad as number);
    assert.equal(r.level, 1);
    assert.equal(r.currentXp, 0);
    assert.equal(r.nextLevelXp, 500);
    assert.ok(Number.isFinite(r.percent));
    assert.ok(Number.isFinite(r.remainingXp));
  }
});

ok('applyXpToProfile monte d’un niveau quand le seuil est atteint', () => {
  const p = profile({ level: 1, currentXp: 400, nextLevelXp: 500 });
  const up = applyXpToProfile(p, 100);
  assert.equal(up.level, 2);
  assert.equal(up.currentXp, 0);
  assert.equal(up.nextLevelXp, 675);
});

ok('applyXpToProfile ajoute à l’intérieur du niveau', () => {
  const p = profile({ level: 2, currentXp: 100, nextLevelXp: 675 });
  const up = applyXpToProfile(p, 250);
  assert.equal(up.level, 2);
  assert.equal(up.currentXp, 350);
  assert.equal(up.nextLevelXp, 675);
});

ok('applyXpToProfile ne fait jamais passer sous le niveau initial', () => {
  const p = profile({ level: 5, currentXp: 50, nextLevelXp: 911 });
  const up = applyXpToProfile(p, -9999);
  assert.equal(up.level, 5);
  assert.equal(up.currentXp, 50);
});

ok('applyXpToProfile renvoie un nouvel objet (données immuables)', () => {
  const p = profile({ level: 1, currentXp: 10, nextLevelXp: 500 });
  const up = applyXpToProfile(p, 5);
  assert.notEqual(up, p);
  assert.equal(p.currentXp, 10);
  assert.equal(up.currentXp, 15);
});

console.log(`\n${passed} passed, ${failed} failed`);