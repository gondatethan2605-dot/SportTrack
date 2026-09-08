import assert from 'node:assert/strict';
import { GOAL_METRICS } from '../src/utilsGoals';
import {
  buildOnboardingSteps,
  isOnboardingDone,
  markOnboardingDone,
  skipOnboarding,
  getOnboardingPreferences,
  isOnboardingGoalValue,
  isOnboardingModeValue,
  ONBOARDING_STORAGE_KEY,
  ONBOARDING_GOAL_KEY,
  ONBOARDING_MODE_KEY,
} from '../src/utilsOnboarding';

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

// No window.localStorage exists in node: every helper must be safe and return
// defaults without throwing.

ok('steps: two steps (goal then mode), each with 4 choices', () => {
  const steps = buildOnboardingSteps();
  assert.equal(steps.length, 2);
  assert.equal(steps[0].id, 'goal');
  assert.equal(steps[1].id, 'mode');
  assert.equal(steps[0].choices.length, 4);
  assert.equal(steps[1].choices.length, 4);
});

ok('goal step reuses GOAL_METRICS labels', () => {
  const steps = buildOnboardingSteps();
  const metrics = GOAL_METRICS.map((m) => m.label);
  for (const c of steps[0].choices) {
    assert.equal(metrics.includes(c.label), true, `label ${c.label} must come from GOAL_METRICS`);
  }
});

ok('not done by default (no storage)', () => {
  assert.equal(isOnboardingDone(), false);
});

ok('storage helpers are safe without window.localStorage', () => {
  const g = getOnboardingPreferences();
  assert.equal(g.goal, null);
  assert.equal(g.mode, null);
  assert.equal(ONBOARDING_STORAGE_KEY, 'sporttrack:onboardingDone');
  assert.equal(ONBOARDING_GOAL_KEY, 'sporttrack:onboardingGoal');
  assert.equal(ONBOARDING_MODE_KEY, 'sporttrack:onboardingMode');
  markOnboardingDone('reps', 'Musculation');
  skipOnboarding();
  assert.equal(isOnboardingDone(), false);
});

ok('validation guards', () => {
  assert.equal(isOnboardingGoalValue('reps'), true);
  assert.equal(isOnboardingGoalValue('bad-goal'), false);
  assert.equal(isOnboardingGoalValue(null), false);
  assert.equal(isOnboardingModeValue('Cardio'), true);
  assert.equal(isOnboardingModeValue('Mobilité & Étirements'), true);
  assert.equal(isOnboardingModeValue('bad-mode'), false);
});

console.log(`\n${passed} tests PASS, ${failed} FAIL`);
if (failed > 0) process.exitCode = 1;