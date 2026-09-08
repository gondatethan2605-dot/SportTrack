import assert from 'node:assert/strict';
import { WorkoutSession, PersonalRecord, UserProfile, Goal, ExercisePerformance } from '../src/types';
import { xpToReachLevel } from '../src/utilsLevels';
import { weekStartIso } from '../src/utilsChallenges';
import type { StorageLike } from '../src/utilsChallenges';
import {
  buildSocialProfile,
  serializeSocialProfile,
  parseSocialProfile,
  SocialError,
  loadSocialFriends,
  saveSocialFriends,
  buildFriendEntry,
  upsertFriend,
  removeFriend,
  rankSocialProfiles,
  compareSocialProfiles,
  computeSocialChallengeProgress,
  buildSocialShareText,
  buildSocialChallengeText,
  SOCIAL_CHALLENGES,
  SOCIAL_FRIENDS_KEY,
  MAX_FRIENDS,
  type SocialProfileFile,
  type SocialFriendEntry,
  type SocialRankRow,
} from '../src/utilsSocial';

// ---------------------------------------------------------------- helpers -----
function session(
  id: string,
  date: string,
  exercises: { exerciseId: string; exerciseName: string; sets: { setNumber: number; weightKg: number; reps: number; mode?: 'reps' | 'timer'; durationSec?: number; completed: boolean }[] }[],
  opts?: { stretchesCount?: number; durationMinutes?: number; totalVolumeKg?: number; completed?: boolean }
): WorkoutSession {
  return {
    id,
    title: `Séance ${id}`,
    date,
    startTime: '18:00',
    durationMinutes: opts?.durationMinutes ?? 30,
    completed: opts?.completed ?? true,
    totalVolumeKg: opts?.totalVolumeKg ?? 0,
    exercises: (exercises || []).map((e) => ({
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      muscleGroup: 'Pectoraux',
      sets: (e.sets || []).map((s) => ({
        setNumber: s.setNumber,
        weightKg: s.weightKg,
        reps: s.reps,
        mode: s.mode || 'reps',
        durationSec: s.durationSec ?? 0,
        completed: s.completed,
      })),
    })),
    stretchesCount: opts?.stretchesCount ?? 0,
  };
}

function record(id: string, date: string): PersonalRecord {
  return { id, exerciseId: 'e1', exerciseName: 'Développé', weightKg: 100, reps: 5, date };
}

function profileFixture(overrides?: Partial<UserProfile>): UserProfile {
  return {
    name: 'Moi',
    level: 3,
    currentXp: 120,
    nextLevelXp: 400,
    streakDays: 4,
    bestStreak: 9,
    weeklyTargetSessions: 3,
    weeklyCompletedSessions: 2,
    totalWorkouts: 12,
    totalVolumeKg: 1000,
    joinedDate: '2024-01-10',
    ...overrides,
  };
}

const validOneRepSet = { setNumber: 1, weightKg: 100, reps: 5, completed: true };
const validOneTimerSet = { setNumber: 1, weightKg: 0, reps: 0, mode: 'timer' as const, durationSec: 60, completed: true };

class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

function assertSocialErrorCode(fn: () => unknown, code: string): void {
  let threw = false;
  try {
    fn();
  } catch (e) {
    threw = true;
    assert.ok(e instanceof SocialError, 'expected a SocialError');
    assert.equal((e as SocialError).code, code);
  }
  assert.ok(threw, `expected SocialError ${code} to be thrown`);
}

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

// ---------------------------------------------------------- buildSocialProfile --
ok('buildSocialProfile: counts only completed sessions with a valid completed set', () => {
  const sessions = [
    session('a', '2026-01-05', [{ exerciseId: 'e1', exerciseName: 'X', sets: [validOneRepSet] }], { totalVolumeKg: 100, durationMinutes: 30 }),
    session('b', '2026-01-06', [{ exerciseId: 'e1', exerciseName: 'X', sets: [validOneRepSet] }], { totalVolumeKg: 50, durationMinutes: 40, completed: false }),
    session('c', '2026-01-07', [{ exerciseId: 'e1', exerciseName: 'X', sets: [{ setNumber: 1, weightKg: 0, reps: 0, completed: true }] }], { totalVolumeKg: 999 }),
  ];
  const file = buildSocialProfile({ profile: profileFixture(), sessions, records: [], goals: [] });
  assert.equal(file.profile.sessions, 1);
  assert.equal(file.profile.volumeKg, 100);
  assert.equal(file.profile.durationMinutes, 30);
});

ok('buildSocialProfile: xp is the cumulative total XP of the profile', () => {
  const p = profileFixture({ level: 5, currentXp: 200 });
  const file = buildSocialProfile({ profile: p, sessions: [], records: [], goals: [] });
  assert.equal(file.profile.xp, xpToReachLevel(5) + 200);
  assert.equal(file.profile.level, 5);
  assert.equal(file.profile.streakDays, 4);
});

ok('buildSocialProfile: records, badges, challenges and weekly sessions are counts', () => {
  const today = new Date();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const sessions = [
    session('a', iso(today), [
      { exerciseId: 'e1', exerciseName: 'X', sets: [validOneRepSet, validOneRepSet, validOneRepSet] },
      { exerciseId: 'e2', exerciseName: 'Y', sets: [validOneTimerSet] },
    ]),
    session('b', weekStartIso(), [{ exerciseId: 'e1', exerciseName: 'X', sets: [validOneRepSet] }]),
  ];
  const records = [record('r1', iso(today))];
  const goals: Goal[] = [];
  const file = buildSocialProfile({ profile: profileFixture(), sessions, records, goals });
  assert.equal(file.profile.records, 1);
  assert.equal(file.profile.sessions, 2);
  assert.ok(Number.isInteger(file.profile.badges) && file.profile.badges >= 0);
  assert.ok(Number.isInteger(file.profile.challengesCompleted) && file.profile.challengesCompleted >= 0);
  assert.equal(file.profile.weeklySessions, 2);
});

ok('buildSocialProfile: header identity and serializability', () => {
  const file = buildSocialProfile({ profile: profileFixture(), sessions: [], records: [], goals: [] });
  assert.equal(file.formatVersion, 1);
  assert.equal(file.app, 'SportTrack');
  assert.equal(file.type, 'social-profile');
  assert.ok(typeof file.exportedAt === 'string' && file.exportedAt.length > 0);
  const roundTrip = parseSocialProfile(serializeSocialProfile(file));
  assert.deepEqual(roundTrip.profile, file.profile);
});

// ---------------------------------------------------------- parseSocialProfile --
ok('parseSocialProfile: empty text -> EMPTY', () => {
  assertSocialErrorCode(() => parseSocialProfile('   '), 'EMPTY');
});

ok('parseSocialProfile: invalid JSON -> INVALID_JSON', () => {
  assertSocialErrorCode(() => parseSocialProfile('{not json'), 'INVALID_JSON');
});

ok('parseSocialProfile: over size limit -> TOO_LARGE', () => {
  const file = buildSocialProfile({ profile: profileFixture(), sessions: [], records: [], goals: [] });
  const text = serializeSocialProfile(file);
  assertSocialErrorCode(() => parseSocialProfile(text, 10), 'TOO_LARGE');
});

ok('parseSocialProfile: non-object / array / null -> NOT_OBJECT', () => {
  assertSocialErrorCode(() => parseSocialProfile('42'), 'NOT_OBJECT');
  assertSocialErrorCode(() => parseSocialProfile('[]'), 'NOT_OBJECT');
});

ok('parseSocialProfile: unknown version -> UNKNOWN_VERSION', () => {
  const file = buildSocialProfile({ profile: profileFixture(), sessions: [], records: [], goals: [] });
  const raw = JSON.parse(serializeSocialProfile(file));
  raw.formatVersion = 2;
  assertSocialErrorCode(() => parseSocialProfile(JSON.stringify(raw)), 'UNKNOWN_VERSION');
});

ok('parseSocialProfile: wrong type -> WRONG_TYPE', () => {
  const file = buildSocialProfile({ profile: profileFixture(), sessions: [], records: [], goals: [] });
  const raw = JSON.parse(serializeSocialProfile(file));
  raw.type = 'full-backup';
  assertSocialErrorCode(() => parseSocialProfile(JSON.stringify(raw)), 'WRONG_TYPE');
});

ok('parseSocialProfile: wrong app -> WRONG_APP', () => {
  const file = buildSocialProfile({ profile: profileFixture(), sessions: [], records: [], goals: [] });
  const raw = JSON.parse(serializeSocialProfile(file));
  raw.app = 'Elsewhere';
  assertSocialErrorCode(() => parseSocialProfile(JSON.stringify(raw)), 'WRONG_APP');
});

ok('parseSocialProfile: missing profile -> BAD_PROFILE', () => {
  const file = buildSocialProfile({ profile: profileFixture(), sessions: [], records: [], goals: [] });
  const raw = JSON.parse(serializeSocialProfile(file));
  delete raw.profile;
  assertSocialErrorCode(() => parseSocialProfile(JSON.stringify(raw)), 'BAD_PROFILE');
});

ok('parseSocialProfile: non-finite number (1e999) -> NON_FINITE', () => {
  // Raw text keeps the literal 1e999: JSON.parse turns it into Infinity
  // (JSON.stringify would have collapsed it to null and masked the case).
  const text =
    '{"formatVersion":1,"app":"SportTrack","type":"social-profile","exportedAt":"","profile":{' +
    '"level":1,"xp":1e999,"sessions":0,"records":0,"badges":0,"volumeKg":0,"durationMinutes":0,"streakDays":0,"challengesCompleted":0,"weeklySessions":0}}';
  assertSocialErrorCode(() => parseSocialProfile(text), 'NON_FINITE');
});

ok('parseSocialProfile: negative or non-number known fields -> BAD_PROFILE', () => {
  const file = buildSocialProfile({ profile: profileFixture(), sessions: [], records: [], goals: [] });
  const raw = JSON.parse(serializeSocialProfile(file));
  raw.profile.level = -1;
  assertSocialErrorCode(() => parseSocialProfile(JSON.stringify(raw)), 'BAD_PROFILE');
  raw.profile.level = '3';
  assertSocialErrorCode(() => parseSocialProfile(JSON.stringify(raw)), 'BAD_PROFILE');
});

ok('parseSocialProfile: unknown fields are dropped, known fields kept', () => {
  const file = buildSocialProfile({ profile: profileFixture(), sessions: [], records: [], goals: [] });
  const raw = JSON.parse(serializeSocialProfile(file));
  raw.profile.evil = '<script>malware()</script>';
  raw.profile.extra = { nested: true };
  const parsed = parseSocialProfile(JSON.stringify(raw));
  const parsedProfile = parsed.profile as unknown as Record<string, unknown>;
  assert.equal(parsedProfile.evil, undefined);
  assert.equal(parsedProfile.extra, undefined);
  assert.equal(Object.keys(parsed.profile).length, 10);
  assert.deepEqual(parsed.profile, file.profile);
});

// ----------------------------------------------------------- friend list (localStorage) --
ok('loadSocialFriends: empty / missing storage key -> []', () => {
  const storage = new MemoryStorage();
  assert.deepEqual(loadSocialFriends(storage), []);
  assert.deepEqual(loadSocialFriends(null), []);
});

ok('loadSocialFriends: malformed stored JSON -> []', () => {
  const storage = new MemoryStorage();
  storage.setItem(SOCIAL_FRIENDS_KEY, 'not json{');
  assert.deepEqual(loadSocialFriends(storage), []);
});

ok('loadSocialFriends: non-array -> []', () => {
  const storage = new MemoryStorage();
  storage.setItem(SOCIAL_FRIENDS_KEY, '{"a":1}');
  assert.deepEqual(loadSocialFriends(storage), []);
});

ok('loadSocialFriends: invalid entries dropped, valid kept', () => {
  const storage = new MemoryStorage();
  const file = buildSocialProfile({ profile: profileFixture(), sessions: [], records: [], goals: [] });
  const valid = buildFriendEntry('Nadia', file);
  storage.setItem(
    SOCIAL_FRIENDS_KEY,
    JSON.stringify([
      valid,
      { id: 'x', alias: '', profile: file.profile }, // empty alias -> dropped
      { id: 'y', alias: 'Evil', profile: { ...file.profile, level: -5 } }, // negative -> dropped
    ])
  );
  const friends = loadSocialFriends(storage);
  assert.equal(friends.length, 1);
  assert.equal(friends[0].alias, 'Nadia');
  assert.deepEqual(friends[0].profile, file.profile);
});

ok('saveSocialFriends + upsertFriend: dedupe by alias and cap at MAX_FRIENDS', () => {
  const storage = new MemoryStorage();
  const file = buildSocialProfile({ profile: profileFixture(), sessions: [], records: [], goals: [] });

  // alias collision on a small list -> replaced, not duplicated, newest kept
  const a = buildFriendEntry('Nadia', file);
  const b = buildFriendEntry('Nadia', file);
  const deduped = upsertFriend(upsertFriend([], a), b);
  const nadia = deduped.filter((f) => f.alias === 'Nadia');
  assert.equal(nadia.length, 1);
  assert.equal(nadia[0].importedAt, b.importedAt);

  // cap: adding more than MAX_FRIENDS distinct keeps only the first 50
  const many = upsertFriend([], buildFriendEntry('Nadia', file));
  for (let i = 1; i < MAX_FRIENDS + 5; i++) {
    many.push(buildFriendEntry(`Alias ${i}`, file));
  }
  const capped = many.slice(0, MAX_FRIENDS + 5).length > MAX_FRIENDS
    ? upsertFriend(many, buildFriendEntry('Nadia', file))
    : many;
  assert.equal(capped.length, MAX_FRIENDS);
  assert.equal(saveSocialFriends(capped, storage), true);
  assert.equal(loadSocialFriends(storage).length, MAX_FRIENDS);
});

ok('removeFriend: by id and by alias are both supported', () => {
  const file = buildSocialProfile({ profile: profileFixture(), sessions: [], records: [], goals: [] });
  const a = buildFriendEntry('Ada', file);
  const b = buildFriendEntry('Bob', file);
  const list = upsertFriend(upsertFriend([], a), b);
  assert.equal(list.length, 2);
  const byId = removeFriend(list, a.id);
  assert.equal(byId.length, 1);
  assert.equal(byId[0].alias, 'Bob');
  const byAlias = removeFriend(list, 'Ada');
  assert.equal(byAlias.length, 1);
  assert.equal(byAlias[0].alias, 'Bob');
  assert.equal(removeFriend(list, '').length, 2);
});

// --------------------------------------------------------------- leaderboard --
ok('rankSocialProfiles: sorts descending, ties broken by alias (fr)', () => {
  const mk = (alias: string, level: number): SocialRankRow => ({
    id: alias,
    alias,
    stats: {
      level, xp: 100, sessions: 5, records: 1, badges: 0, volumeKg: 0, durationMinutes: 0, streakDays: 0, challengesCompleted: 0, weeklySessions: 0,
    },
  });
  const rows = [mk('Zoe', 2), mk('Alice', 3), mk('Bob', 3)];
  const ranked = rankSocialProfiles(rows, 'level');
  assert.deepEqual(ranked.map((r) => r.alias), ['Alice', 'Bob', 'Zoe']);
});

ok('rankSocialProfiles: empty input and missing stats stay safe', () => {
  assert.deepEqual(rankSocialProfiles([], 'level'), []);
  const rows: SocialRankRow[] = [{ id: 'x', alias: 'X', stats: undefined as unknown as SocialRankRow['stats'] }];
  const ranked = rankSocialProfiles(rows, 'xp');
  assert.equal(ranked.length, 1);
  assert.equal((ranked[0].stats?.xp || 0), 0);
});

// ---------------------------------------------------------------- comparison --
ok('compareSocialProfiles: friend zero -> delta finite, percent null', () => {
  const mine = buildSocialProfile({ profile: profileFixture({ level: 2 }), sessions: [], records: [], goals: [] }).profile;
  const zero = {
    level: 0, xp: 0, sessions: 0, records: 0, badges: 0, volumeKg: 0, durationMinutes: 0, streakDays: 0, challengesCompleted: 0, weeklySessions: 0,
  };
  const rows = compareSocialProfiles(mine, zero);
  assert.ok(rows.length >= 10);
  const levelRow = rows.find((r) => r.key === 'level');
  assert.ok(levelRow);
  assert.equal(levelRow.mine, 2);
  assert.equal(levelRow.friend, 0);
  assert.equal(levelRow.delta, 2);
  assert.equal(levelRow.percent, null);
});

ok('compareSocialProfiles: equal non-zero values -> delta 0, percent 0', () => {
  const stats = buildSocialProfile({ profile: profileFixture({ level: 2 }), sessions: [], records: [], goals: [] }).profile;
  const rows = compareSocialProfiles(stats, { ...stats });
  const xpRow = rows.find((r) => r.key === 'xp');
  assert.ok(xpRow);
  assert.equal(xpRow.delta, 0);
  assert.equal(xpRow.percent, 0); // previous is non-zero, so an exact 0% change
});

ok('compareSocialProfiles: friend value 0 -> percent null (no division by zero)', () => {
  const stats = buildSocialProfile({ profile: profileFixture({ level: 2, currentXp: 0 }), sessions: [], records: [], goals: [] }).profile;
  const zero = {
    level: 0, xp: 0, sessions: 0, records: 0, badges: 0, volumeKg: 0, durationMinutes: 0, streakDays: 0, challengesCompleted: 0, weeklySessions: 0,
  };
  const rows = compareSocialProfiles(stats, zero);
  const sessionsRow = rows.find((r) => r.key === 'sessions');
  assert.ok(sessionsRow);
  assert.equal(sessionsRow.mine, 0);
  assert.equal(sessionsRow.percent, null);
});

// ----------------------------------------------------------------- challenges --
ok('computeSocialChallengeProgress: counts only this week, valid sets, no XP field', () => {
  const today = new Date();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const sessions = [
    session('a', iso(today), [
      { exerciseId: 'e1', exerciseName: 'X', sets: [validOneRepSet, validOneRepSet] },
      { exerciseId: 'e2', exerciseName: 'Y', sets: [validOneTimerSet] },
    ]),
    session('b', weekStartIso(), [{ exerciseId: 'e1', exerciseName: 'X', sets: [validOneRepSet] }]),
    session('c', '2020-01-03', [{ exerciseId: 'e1', exerciseName: 'X', sets: [validOneRepSet] }]), // old week, must not count
    session('d', iso(today), [{ exerciseId: 'e1', exerciseName: 'X', sets: [{ setNumber: 1, weightKg: 0, reps: 0, completed: true }] }]), // invalid set
  ];
  const records = [record('r1', iso(today)), record('r2', '2020-01-02')];
  const progress = computeSocialChallengeProgress(sessions, records, today);

  const sessionsCh = progress.find((p) => p.definition.id === 'soc-3-sessions');
  const setsCh = progress.find((p) => p.definition.id === 'soc-30-sets');
  const recordsCh = progress.find((p) => p.definition.id === 'soc-1-record');

  assert.ok(sessionsCh);
  assert.ok(setsCh);
  assert.ok(recordsCh);
  assert.equal(sessionsCh.current, 2); // a + b
  assert.equal(setsCh.current, 4); // 2 reps sets + 1 timer set + 1 reps set
  assert.equal(recordsCh.current, 1); // r1 only (this week)
  assert.equal(recordsCh.completed, true);
  assert.equal(('rewardXp' in sessionsCh.definition), false);
  assert.equal(('xp' in sessionsCh), false);
});

ok('computeSocialChallengeProgress: target reached -> completed, percent capped at 100', () => {
  const today = new Date();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const many = Array.from({ length: 5 }, (_, i) =>
    session(`s${i}`, iso(today), [{ exerciseId: 'e1', exerciseName: 'X', sets: [validOneRepSet] }])
  );
  const progress = computeSocialChallengeProgress(many, [], today);
  const sessionsCh = progress.find((p) => p.definition.id === 'soc-3-sessions');
  assert.ok(sessionsCh);
  assert.equal(sessionsCh.current, 5);
  assert.equal(sessionsCh.completed, true);
  assert.equal(sessionsCh.percent, 100);
});

ok('computeSocialChallengeProgress: zero sessions stays safe and incomplete', () => {
  const progress = computeSocialChallengeProgress([], [], new Date('2026-01-01T12:00:00'));
  assert.equal(progress.length, SOCIAL_CHALLENGES.length);
  for (const p of progress) {
    assert.equal(p.current, 0);
    assert.equal(p.completed, false);
    assert.equal(p.percent, 0);
  }
});

ok('computeSocialChallengeProgress: empty kind default never throws', () => {
  const today = new Date();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const progress = computeSocialChallengeProgress(
    [session('a', iso(today), [{ exerciseId: 'e1', exerciseName: 'X', sets: [validOneTimerSet] }])],
    [],
    today
  );
  assert.equal(progress.length, 3);
});

// ------------------------------------------------------------------- sharing --
ok('buildSocialShareText: plain text lines, no names, no internal ids', () => {
  const stats = buildSocialProfile({ profile: profileFixture(), sessions: [], records: [], goals: [] }).profile;
  const text = buildSocialShareText(stats);
  assert.ok(text.includes('SportTrack'));
  assert.ok(!text.includes('Moi'));
  assert.ok(!text.includes('joinedDate'));
  assert.ok(!text.includes('currentXp'));
});

ok('buildSocialChallengeText: references definition values', () => {
  const today = new Date();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const progress = computeSocialChallengeProgress(
    [session('a', iso(today), [{ exerciseId: 'e1', exerciseName: 'X', sets: [validOneRepSet, validOneRepSet] }])],
    [],
    today
  );
  const text = buildSocialChallengeText(progress[1]);
  assert.ok(text.includes('30 séries validées'));
  assert.ok(text.includes('Objectif : 30'));
  assert.ok(text.includes('Ma progression : 2/30'));
});

// ---------------------------------------------------------------- report -----
console.log(`\n${passed} tests PASS, ${failed} FAIL`);
if (failed === 0) {
  console.log('ALL TESTS PASSED');
} else {
  console.log('SOME TESTS FAILED');
}