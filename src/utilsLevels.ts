import { UserProfile } from './types';

// LOT 4 — Item 11 (Niveaux).
//
// Single, deterministic source of truth for levels. The exact same growth
// curve used by App.tsx's existing syncProfileWithSessions / handleFinishSession
// (next level = 500 XP at level 1, then Math.round(previous * 1.35)) is exposed
// here as a pure helper so every screen computes the exact same level from the
// same total XP. XP itself is never modified by this module — it only derives a
// level, never a stored value.

export const LEVEL_BASE_XP = 500;
export const LEVEL_GROWTH = 1.35;

export interface LevelProgress {
  level: number;
  currentXp: number; // XP accumulated inside the current level (towards next)
  nextLevelXp: number; // XP threshold required to reach the next level
  percent: number; // 0..100 progression inside the current level
  remainingXp: number; // XP still needed for the next level
}

// Non-finite / negative input is sanitised to 0 so the helper can never emit
// NaN / Infinity levels or thresholds.
export function computeLevelFromXp(totalXp: number): LevelProgress {
  const safe = Number.isFinite(totalXp) && totalXp > 0 ? totalXp : 0;
  let level = 1;
  let currentXp = safe;
  let nextLevelXp = LEVEL_BASE_XP;
  while (currentXp >= nextLevelXp) {
    level += 1;
    currentXp -= nextLevelXp;
    nextLevelXp = Math.round(nextLevelXp * LEVEL_GROWTH);
  }
  const percent = nextLevelXp > 0 ? Math.min(100, Math.round((currentXp / nextLevelXp) * 100)) : 0;
  return { level, currentXp, nextLevelXp, percent, remainingXp: Math.max(0, nextLevelXp - currentXp) };
}

// Cumulative XP required to REACH `level` starting from level 1 (0 for level 1).
// Mirrors the same threshold curve; used to convert the profile's stored
// "residual XP inside the level" back to a grand total before applying bonuses.
export function xpToReachLevel(level: number): number {
  let total = 0;
  let threshold = LEVEL_BASE_XP;
  const target = Math.max(1, Math.floor(level));
  for (let l = 1; l < target; l++) {
    total += threshold;
    threshold = Math.round(threshold * LEVEL_GROWTH);
  }
  return total;
}

// Total XP represented by a profile: cumulative XP up to its level, plus the
// XP accumulated inside the current level.
export function totalXpFromProfile(profile: UserProfile): number {
  return Math.max(0, xpToReachLevel(profile.level || 1) + (profile.currentXp || 0));
}

// Add a bonus XP amount to a profile's current state and recompute the level
// with the same growth curve. Bonus XP is clamped to 0+ (challenge rewards are
// never allowed to reduce a profile). Returns a NEW profile object.
export function applyXpToProfile(profile: UserProfile, bonusXp: number): UserProfile {
  const total = totalXpFromProfile(profile) + Math.max(0, Number.isFinite(bonusXp) ? bonusXp : 0);
  const next = computeLevelFromXp(total);
  return { ...profile, level: next.level, currentXp: next.currentXp, nextLevelXp: next.nextLevelXp };
}