import { WorkoutSession, PersonalRecord, ExercisePerformance, Goal, UserProfile } from './types';
import { hasValidCompletedSet } from './utilsSession';

// LOT 4 — Item 11 (Badges).
//
// Badges are a pure, deterministic function of the REAL stored data (validated
// completed sessions, records, streak, goals...). Nothing is persisted in
// IndexedDB and nothing is replayed: the exact same inputs always produce the
// exact same badges, so a badge is computed identically before and after an
// import / restore and can never be lost, duplicated or un-granted.
//
// unlockedAt is set ONLY when the precise unlocking moment is determinable from
// the data (e.g. the Nth session / the first record's date). Otherwise the
// badge is shown as "Débloqué" without a date rather than guessing.

export interface Badge {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string; // YYYY-MM-DD when determinable
  progress?: { current: number; target: number }; // only for locked badges
}

export interface BadgeContext {
  sessions: WorkoutSession[];
  records: PersonalRecord[];
  exercisePerformances: ExercisePerformance[];
  goals: Goal[];
  profile: Pick<UserProfile, 'streakDays' | 'bestStreak'>;
}

interface SessionTotals {
  count: number;
  sets: number;
  reps: number;
  volumeKg: number;
  guidedSessions: number;
  firstGuidedDate: string | null;
}

// Only counted what is REAL: completed sessions carrying at least one valid
// completed set (reps > 0 or timer duration > 0 — the same guard the rest of
// the app uses), sets/reps/volume from completed sets only, no conversions.
function computeSessionTotals(sessions: WorkoutSession[]): SessionTotals {
  let count = 0;
  let sets = 0;
  let reps = 0;
  let volumeKg = 0;
  let guidedSessions = 0;
  let firstGuidedDate: string | null = null;
  const valid: WorkoutSession[] = [];

  for (const s of sessions || []) {
    if (!s || s.completed !== true) continue;
    if (!hasValidCompletedSet(s.exercises || [])) continue;
    valid.push(s);
    for (const ex of s.exercises || []) {
      for (const set of ex.sets || []) {
        if (set.completed !== true) continue;
        if (set.mode === 'timer') {
          if ((set.durationSec || 0) > 0) sets += 1;
        } else if ((set.reps || 0) > 0) {
          sets += 1;
          reps += set.reps || 0;
        }
      }
    }
    if (Number.isFinite(s.totalVolumeKg)) volumeKg += s.totalVolumeKg || 0;
    if (s.guided === true) {
      guidedSessions += 1;
      if (firstGuidedDate === null || s.date < firstGuidedDate) firstGuidedDate = s.date;
    }
  }

  count = valid.length;
  return { count, sets, reps, volumeKg, guidedSessions, firstGuidedDate };
}

// Date of the Nth chronological session (sorted ascending by date), or null.
function nthSessionDate(sessions: WorkoutSession[], n: number): string | null {
  if (sessions.length < n) return null;
  const byDate = [...sessions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return byDate[n - 1].date;
}

function nthRecordDate(records: PersonalRecord[], n: number): string | null {
  if (records.length < n) return null;
  const byDate = [...records].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return byDate[n - 1].date;
}

function locked(id: string, name: string, description: string, current: number, target: number): Badge {
  return {
    id,
    name,
    description,
    unlocked: false,
    progress: { current: Math.min(current, target), target },
  };
}

function unlockedBadge(id: string, name: string, description: string, unlockedAt?: string): Badge {
  return { id, name, description, unlocked: true, unlockedAt };
}

// Deterministic badge catalogue. Inputs are the real stored data; output order
// is stable so the UI can render the same catalogue everywhere.
export function computeBadges(ctx: BadgeContext): Badge[] {
  const sessions = (ctx.sessions || []).filter((s) => s && s.completed === true && hasValidCompletedSet(s.exercises || []));
  const records = ctx.records || [];
  const goals = ctx.goals || [];
  const streak = Math.max(ctx.profile.streakDays || 0, ctx.profile.bestStreak || 0);

  const totals = computeSessionTotals(sessions);
  const badges: Badge[] = [];

  // Sessions (unlockedAt = Nth session date once reached).
  badges.push(
    totals.count >= 1
      ? unlockedBadge('first-session', 'Première séance', 'Terminer votre première séance', nthSessionDate(sessions, 1) || undefined)
      : locked('first-session', 'Première séance', 'Terminer votre première séance', totals.count, 1)
  );
  badges.push(
    totals.count >= 10
      ? unlockedBadge('sessions-10', 'Régularité', 'Terminer 10 séances', nthSessionDate(sessions, 10) || undefined)
      : locked('sessions-10', 'Régularité', 'Terminer 10 séances', totals.count, 10)
  );
  badges.push(
    totals.count >= 25
      ? unlockedBadge('sessions-25', 'Engagement', 'Terminer 25 séances', nthSessionDate(sessions, 25) || undefined)
      : locked('sessions-25', 'Engagement', 'Terminer 25 séances', totals.count, 25)
  );
  badges.push(
    totals.count >= 50
      ? unlockedBadge('sessions-50', 'Détermination', 'Terminer 50 séances', nthSessionDate(sessions, 50) || undefined)
      : locked('sessions-50', 'Détermination', 'Terminer 50 séances', totals.count, 50)
  );
  badges.push(
    totals.count >= 100
      ? unlockedBadge('sessions-100', 'Légende', 'Terminer 100 séances', nthSessionDate(sessions, 100) || undefined)
      : locked('sessions-100', 'Légende', 'Terminer 100 séances', totals.count, 100)
  );

  // Records (unlockedAt = Nth record date once reached).
  badges.push(
    records.length >= 1
      ? unlockedBadge('first-record', 'Record personnel', 'Établir votre premier record (PR)', nthRecordDate(records, 1) || undefined)
      : locked('first-record', 'Record personnel', 'Établir votre premier record (PR)', records.length, 1)
  );
  badges.push(
    records.length >= 10
      ? unlockedBadge('records-10', 'Collectionneur', 'Détenir 10 records', nthRecordDate(records, 10) || undefined)
      : locked('records-10', 'Collectionneur', 'Détenir 10 records', records.length, 10)
  );
  badges.push(
    records.length >= 25
      ? unlockedBadge('records-25', 'Armoire à trophées', 'Détenir 25 records', nthRecordDate(records, 25) || undefined)
      : locked('records-25', 'Armoire à trophées', 'Détenir 25 records', records.length, 25)
  );

  // Streak (from the profile's real streak, never recomputed from anything here).
  badges.push(
    streak >= 7
      ? unlockedBadge('streak-7', 'Semaine parfaite', 'Atteindre une série de 7 jours consécutifs')
      : locked('streak-7', 'Semaine parfaite', 'Atteindre une série de 7 jours consécutifs', streak, 7)
  );
  badges.push(
    streak >= 30
      ? unlockedBadge('streak-30', 'Mois de fer', 'Atteindre une série de 30 jours consécutifs')
      : locked('streak-30', 'Mois de fer', 'Atteindre une série de 30 jours consécutifs', streak, 30)
  );

  // Complete sets / reps / volume (no deterministic unlock date -> no unlockedAt).
  badges.push(
    totals.sets >= 100
      ? unlockedBadge('sets-100', 'Machine', 'Valider 100 séries complètes')
      : locked('sets-100', 'Machine', 'Valider 100 séries complètes', totals.sets, 100)
  );
  badges.push(
    totals.sets >= 500
      ? unlockedBadge('sets-500', 'Bâton de commandement', 'Valider 500 séries complètes')
      : locked('sets-500', 'Bâton de commandement', 'Valider 500 séries complètes', totals.sets, 500)
  );
  badges.push(
    totals.reps >= 1000
      ? unlockedBadge('reps-1000', 'Répétiteur', 'Accumuler 1 000 répétitions validées')
      : locked('reps-1000', 'Répétiteur', 'Accumuler 1 000 répétitions validées', totals.reps, 1000)
  );
  badges.push(
    totals.reps >= 5000
      ? unlockedBadge('reps-5000', 'Volonté de fer', 'Accumuler 5 000 répétitions validées')
      : locked('reps-5000', 'Volonté de fer', 'Accumuler 5 000 répétitions validées', totals.reps, 5000)
  );
  badges.push(
    totals.reps >= 10000
      ? unlockedBadge('reps-10000', 'Colosse', 'Accumuler 10 000 répétitions validées')
      : locked('reps-10000', 'Colosse', 'Accumuler 10 000 répétitions validées', totals.reps, 10000)
  );

  // Guided session (unlockedAt = first guided session date).
  badges.push(
    totals.guidedSessions >= 1
      ? unlockedBadge('first-guided', 'Séance guidée', 'Terminer une première séance guidée', totals.firstGuidedDate || undefined)
      : locked('first-guided', 'Séance guidée', 'Terminer une première séance guidée', totals.guidedSessions, 1)
  );

  // Goal (no completion date in the data -> no unlockedAt).
  const completedGoals = goals.filter((g) => g && g.completed === true).length;
  badges.push(
    completedGoals >= 1
      ? unlockedBadge('first-goal', 'Objectif atteint', 'Atteindre un objectif')
      : locked('first-goal', 'Objectif atteint', 'Atteindre un objectif', completedGoals, 1)
  );

  // Volume (kg across all valid sessions, no deterministic unlock date).
  const volume = Math.round(totals.volumeKg);
  badges.push(
    volume >= 10000
      ? unlockedBadge('volume-10000', '10 tonnes', 'Accumuler 10 000 kg de volume soulevé')
      : locked('volume-10000', '10 tonnes', 'Accumuler 10 000 kg de volume soulevé', volume, 10000)
  );

  return badges;
}

// The most recently unlocked badge (used for the home highlight). Falls back to
// the first unlocked badge; returns null when nothing has been unlocked yet.
export function mostRecentlyUnlockedBadge(badges: Badge[]): Badge | null {
  const unlocked = (badges || []).filter((b) => b.unlocked);
  if (unlocked.length === 0) return null;
  let newest = unlocked[0];
  for (const b of unlocked) {
    if (b.unlockedAt && (!newest.unlockedAt || b.unlockedAt > newest.unlockedAt)) newest = b;
  }
  return newest;
}

// The badge closest to being unlocked (highest current/target ratio), used to
// tell the athlete what to aim for next.
export function nextBadgeToUnlock(badges: Badge[]): Badge | null {
  const locked = (badges || []).filter((b) => !b.unlocked && b.progress);
  if (locked.length === 0) return null;
  let next = locked[0];
  for (const b of locked) {
    const p = b.progress as { current: number; target: number };
    const nP = next.progress as { current: number; target: number };
    const ratio = p.target > 0 ? p.current / p.target : 0;
    const nRatio = nP.target > 0 ? nP.current / nP.target : 0;
    if (p.target > 0 && ratio > nRatio) next = b;
    else if (p.target > 0 && ratio === nRatio && p.current > nP.current) next = b;
  }
  return next;
}