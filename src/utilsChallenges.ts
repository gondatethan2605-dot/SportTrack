import { WorkoutSession, PersonalRecord } from './types';
import { hasValidCompletedSet } from './utilsSession';

// LOT 4 — Item 12 (Défis hebdomadaires).
//
// The week is deterministic and always Monday→Sunday (matching the app's own
// civil week used by the dashboard/streak), independent of the time of day or
// of the device's locale. The XP reward of a completed challenge is granted
// exactly once, by a persisted ledger in localStorage (no IndexedDB change):
// page reloads re-open the ledger, find the weekly claims already recorded and
// never hand out the same XP twice. A brand-new week resets only the claims of
// the week (total XP earned across all time is preserved).

export type ChallengeKind = 'sessions' | 'reps' | 'duration' | 'records' | 'uniqueDays';

export interface ChallengeDefinition {
  id: string;
  name: string;
  description: string;
  kind: ChallengeKind;
  target: number;
  rewardXp: number;
}

export interface ChallengeProgress {
  definition: ChallengeDefinition;
  current: number; // real progress (0 when no history)
  percent: number; // 0..100 clamped
  completed: boolean;
}

export interface ChallengeLedger {
  totalChallengeXpEarned: number; // all-time, preserved forever
  weekKey: string; // week the claims below belong to ('' before any claim)
  weekClaims: Record<string, boolean>; // challengeId -> claimed in `weekKey`
  updatedAt: string; // ISO timestamp of last write
}

export const CHALLENGE_LEDGER_KEY = 'sporttrack-weekly-challenges';

// The 8 deterministic weekly challenges (progressive: 4 base + 4 harder ones).
export const WEEKLY_CHALLENGES: ChallengeDefinition[] = [
  { id: 'wch-sessions-3', name: 'Trois séances', description: 'Réaliser 3 séances validées cette semaine', kind: 'sessions', target: 3, rewardXp: 150 },
  { id: 'wch-sessions-5', name: 'Cinq séances', description: 'Réaliser 5 séances validées cette semaine', kind: 'sessions', target: 5, rewardXp: 250 },
  { id: 'wch-reps-500', name: '500 répétitions', description: 'Accumuler 500 répétitions validées cette semaine', kind: 'reps', target: 500, rewardXp: 150 },
  { id: 'wch-reps-1000', name: '1000 répétitions', description: 'Accumuler 1 000 répétitions validées cette semaine', kind: 'reps', target: 1000, rewardXp: 250 },
  { id: 'wch-duration-120', name: '120 minutes', description: 'Cumuler 120 minutes d’effort cette semaine', kind: 'duration', target: 120, rewardXp: 200 },
  { id: 'wch-records-1', name: 'Nouveau record', description: 'Établir au moins 1 record cette semaine', kind: 'records', target: 1, rewardXp: 200 },
  { id: 'wch-records-2', name: 'Deux records', description: 'Établir 2 records cette semaine', kind: 'records', target: 2, rewardXp: 400 },
  { id: 'wch-days-3', name: '3 jours actifs', description: 'S’entraîner 3 jours différents cette semaine', kind: 'uniqueDays', target: 3, rewardXp: 200 },
];

// ---- Deterministic Monday-based week --------------------------------------

// Monday 00:00 of the week containing `date`, as a Date (local time zeroed).
export function weekStart(date?: Date): Date {
  const d = new Date(date && Number.isFinite(date.getTime()) ? date : new Date());
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Local calendar date (YYYY-MM-DD). Date-only values are compared against the
// sessions' date-only strings, so local formatting is used — never toISOString
// (which shifts the day on timezones ahead of UTC).
function toLocalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function weekStartIso(date?: Date): string {
  return toLocalIso(weekStart(date));
}

export function weekEndIso(date?: Date): string {
  const monday = weekStart(date);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return toLocalIso(sunday);
}

// Stable, orderable week key (ISO-like, Monday-based): `YYYY-Www`. Two dates
// inside the same Monday→Sunday week ALWAYS produce the same key.
export function computeWeekKey(date?: Date): string {
  const monday = weekStart(date);
  const base = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()));
  const dayNum = base.getUTCDay() || 7;
  base.setUTCDate(base.getUTCDate() + 4 - dayNum); // Thursday of the same week
  const yearStart = new Date(Date.UTC(base.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((base.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const isoYear = base.getUTCFullYear();
  return `${isoYear}-W${String(weekNo).padStart(2, '0')}`;
}

// ---- Progress (pure, deterministic from real data) --------------------------

export interface WeeklyChallengeContext {
  sessions: WorkoutSession[];
  records: PersonalRecord[];
  today?: Date;
}

export function computeChallengeProgress(ctx: WeeklyChallengeContext): ChallengeProgress[] {
  const sessions = (ctx.sessions || []).filter((s) => s && s.completed === true && hasValidCompletedSet(s.exercises || []));
  const records = ctx.records || [];
  const start = weekStartIso(ctx.today);
  const end = weekEndIso(ctx.today);

  const weekSessions = sessions.filter((s) => s.date >= start && s.date <= end);
  const sessionCount = weekSessions.length;
  const uniqueDays = new Set(weekSessions.map((s) => s.date)).size;

  let reps = 0;
  let minutes = 0;
  for (const s of weekSessions) {
    for (const ex of s.exercises || []) {
      for (const set of ex.sets || []) {
        if (set.completed !== true) continue;
        if (set.mode !== 'timer' && (set.reps || 0) > 0) {
          reps += set.reps || 0;
        }
      }
    }
    if (Number.isFinite(s.durationMinutes)) minutes += s.durationMinutes || 0;
  }
  minutes = Math.round(minutes);

  const weekRecords = records.filter((r) => r.date >= start && r.date <= end).length;

  const toProgress = (definition: ChallengeDefinition, current: number): ChallengeProgress => {
    const safe = Number.isFinite(current) && current > 0 ? Math.round(current) : 0;
    const percent = definition.target > 0 ? Math.min(100, Math.round((safe / definition.target) * 100)) : 0;
    return { definition, current: safe, percent, completed: safe >= definition.target };
  };

  return WEEKLY_CHALLENGES.map((c) => {
    switch (c.kind) {
      case 'sessions':
        return toProgress(c, sessionCount);
      case 'uniqueDays':
        return toProgress(c, uniqueDays);
      case 'reps':
        return toProgress(c, reps);
      case 'duration':
        return toProgress(c, minutes);
      case 'records':
        return toProgress(c, weekRecords);
      default:
        return toProgress(c, 0);
    }
  });
}

export function completedChallenges(progress: ChallengeProgress[]): ChallengeProgress[] {
  return (progress || []).filter((p) => p.completed);
}

export function claimedCreditForWeek(progress: ChallengeProgress[], weekKey: string): number {
  return (progress || [])
    .filter((p) => p.completed)
    .reduce((acc, p) => acc + p.definition.rewardXp, 0);
}

// ---- Claim ledger (localStorage, anti-double-award) -------------------------

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    const ls = (globalThis as unknown as { localStorage?: StorageLike }).localStorage;
    return ls || null;
  } catch {
    return null;
  }
}

export function emptyChallengeLedger(): ChallengeLedger {
  return { totalChallengeXpEarned: 0, weekKey: '', weekClaims: {}, updatedAt: new Date().toISOString() };
}

// Parse-safe loader: any malformed value falls back to a fresh empty ledger.
export function loadChallengeLedger(storage: StorageLike | null = defaultStorage()): ChallengeLedger {
  if (!storage) return emptyChallengeLedger();
  try {
    const raw = storage.getItem(CHALLENGE_LEDGER_KEY);
    if (!raw) return emptyChallengeLedger();
    const parsed = JSON.parse(raw) as Partial<ChallengeLedger>;
    return {
      totalChallengeXpEarned: Number.isFinite(parsed.totalChallengeXpEarned) && (parsed.totalChallengeXpEarned as number) > 0 ? (parsed.totalChallengeXpEarned as number) : 0,
      weekKey: typeof parsed.weekKey === 'string' ? parsed.weekKey : '',
      weekClaims:
        parsed.weekClaims && typeof parsed.weekClaims === 'object' && !Array.isArray(parsed.weekClaims)
          ? (parsed.weekClaims as Record<string, boolean>)
          : {},
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return emptyChallengeLedger();
  }
}

export function saveChallengeLedger(ledger: ChallengeLedger, storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(CHALLENGE_LEDGER_KEY, JSON.stringify({ ...ledger, updatedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

// Decide which completed challenges are NOT yet claimed for `weekKey`. Returns
// the updated ledger (week reset applied if needed) plus the pending one-time
// awards. Calling this repeatedly is idempotent: once a claim is recorded, the
// same challenge never appears in `pending` again.
export function settleWeeklyChallengeRewards(
  progress: ChallengeProgress[],
  ledger: ChallengeLedger,
  weekKey: string
): { ledger: ChallengeLedger; pending: { challengeId: string; xp: number }[] } {
  let next: ChallengeLedger = { ...ledger, weekClaims: { ...(ledger.weekClaims || {}) } };

  if (next.weekKey !== weekKey) {
    // A brand-new week: reset week claims but keep the all-time XP total.
    next.weekKey = weekKey;
    next.weekClaims = {};
  }

  const pending: { challengeId: string; xp: number }[] = [];
  for (const p of progress || []) {
    if (!p.completed) continue;
    if (next.weekClaims[p.definition.id] === true) continue;
    next.weekClaims[p.definition.id] = true;
    next.totalChallengeXpEarned = next.totalChallengeXpEarned + p.definition.rewardXp;
    pending.push({ challengeId: p.definition.id, xp: p.definition.rewardXp });
  }

  return { ledger: next, pending };
}