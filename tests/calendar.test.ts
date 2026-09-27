import assert from 'node:assert/strict';
import { WorkoutProgram, WorkoutSession } from '../src/types';
import {
  dayOfWeekName,
  programPlansDay,
  isRestDay,
  computeMonthSummary,
  emptyMonthSummary,
} from '../src/utilsCalendar';

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

// ---------------------------------------------------------------- fixtures -----

function program(days: string[]): WorkoutProgram {
  return {
    id: 'p1',
    title: 'Programme Test',
    description: '',
    daysPerWeek: days.length,
    level: 'Intermédiaire',
    isActive: true,
    color: '#7c3aed',
    days: days.map((d, i) => ({
      id: `d${i}`,
      name: `Jour ${d}`,
      dayOfWeek: d,
      muscleGroups: [],
      exerciseIds: [],
    })),
  } as WorkoutProgram;
}

const MON_WED_FRI = program(['Lundi', 'Mercredi', 'Vendredi']);

function session(id: string, date: string, opts?: { volume?: number; minutes?: number }): WorkoutSession {
  return {
    id,
    title: `Séance ${id}`,
    date,
    startTime: '18:00',
    durationMinutes: opts?.minutes ?? 30,
    completed: true,
    totalVolumeKg: opts?.volume ?? 0,
    exercises: [],
  };
}

// ---------------------------------------------------------------- TESTS -----

// --- dayOfWeekName ---
ok('dayOfWeekName: 2026-09-07 -> Lundi', () => {
  assert.equal(dayOfWeekName('2026-09-07'), 'Lundi');
});

ok('dayOfWeekName: 2026-09-06 -> Dimanche', () => {
  assert.equal(dayOfWeekName('2026-09-06'), 'Dimanche');
});

ok('dayOfWeekName: 2026-09-01 -> Mardi', () => {
  assert.equal(dayOfWeekName('2026-09-01'), 'Mardi');
});

ok('dayOfWeekName: invalid key does not crash', () => {
  assert.ok(typeof dayOfWeekName('not-a-date') === 'string');
});

// --- programPlansDay ---
ok('programPlansDay: planned weekday -> true', () => {
  assert.equal(programPlansDay(MON_WED_FRI, 'Lundi'), true);
});

ok('programPlansDay: unplanned weekday -> false', () => {
  assert.equal(programPlansDay(MON_WED_FRI, 'Mardi'), false);
});

ok('programPlansDay: no program -> false', () => {
  assert.equal(programPlansDay(undefined, 'Lundi'), false);
});

ok('programPlansDay: program without days -> false', () => {
  assert.equal(programPlansDay(program([]), 'Lundi'), false);
});

// --- isRestDay ---
ok('isRestDay: unplanned weekday without session -> true', () => {
  assert.equal(isRestDay('2026-09-08', MON_WED_FRI, []), true); // Tuesday
});

ok('isRestDay: planned weekday -> false', () => {
  assert.equal(isRestDay('2026-09-07', MON_WED_FRI, []), false); // Monday
});

ok('isRestDay: completed day is NEVER a rest day (even unplanned)', () => {
  assert.equal(isRestDay('2026-09-08', MON_WED_FRI, ['2026-09-08']), false);
});

ok('isRestDay: no program -> false', () => {
  assert.equal(isRestDay('2026-09-08', undefined, []), false);
});

ok('isRestDay: program without days -> false', () => {
  assert.equal(isRestDay('2026-09-08', program([]), []), false);
});

// --- computeMonthSummary (September 2026: Mon 7/14/21/28, Wed 2/9/16/23/30, Fri 4/11/18/25) ---
ok('computeMonthSummary: planned = 13 (Lun+Mer+Ven)', () => {
  const summary = computeMonthSummary(2026, 8, [], MON_WED_FRI);
  assert.equal(summary.planned, 13);
});

ok('computeMonthSummary: rest days + completed interplay', () => {
  const sessions = [
    session('s1', '2026-09-07', { volume: 1000, minutes: 30 }), // Monday (planned)
    session('s2', '2026-09-08', { volume: 2000, minutes: 45 }), // Tuesday (unplanned)
    session('s3', '2026-09-08', { volume: 500, minutes: 15 }), // same day again
  ];
  const summary = computeMonthSummary(2026, 8, sessions, MON_WED_FRI);
  assert.equal(summary.completed, 2); // distinct days only
  assert.equal(summary.planned, 13);
  // 30 days - 13 planned - 1 completed unplanned Tuesday = 16 rest days
  assert.equal(summary.restDays, 16);
  assert.equal(summary.volumeKg, 3500);
  assert.equal(summary.durationMinutes, 90);
});

ok('computeMonthSummary: sessions of other months excluded', () => {
  const sessions = [
    session('s1', '2026-09-10', { volume: 1000, minutes: 30 }),
    session('s2', '2026-08-31', { volume: 999, minutes: 9 }),
    session('s3', '2026-10-01', { volume: 888, minutes: 8 }),
  ];
  const summary = computeMonthSummary(2026, 8, sessions, MON_WED_FRI);
  assert.equal(summary.completed, 1);
  assert.equal(summary.volumeKg, 1000);
  assert.equal(summary.durationMinutes, 30);
});

ok('computeMonthSummary: empty sessions -> zeros', () => {
  assert.deepEqual(computeMonthSummary(2026, 8, [], MON_WED_FRI), {
    completed: 0,
    planned: 13,
    restDays: 17,
    volumeKg: 0,
    durationMinutes: 0,
  });
});

ok('computeMonthSummary: without a program no rest/planned days', () => {
  const sessions = [session('s1', '2026-09-10', { volume: 1000, minutes: 30 })];
  const summary = computeMonthSummary(2026, 8, sessions, undefined);
  assert.equal(summary.completed, 1);
  assert.equal(summary.planned, 0);
  assert.equal(summary.restDays, 0);
  assert.equal(summary.volumeKg, 1000);
});

ok('computeMonthSummary: no NaN / Infinity', () => {
  const s = computeMonthSummary(2026, 8, [], MON_WED_FRI);
  for (const v of Object.values(s)) assert.ok(Number.isFinite(v), `expected finite, got ${v}`);
});

ok('emptyMonthSummary: all zeros', () => {
  assert.deepEqual(emptyMonthSummary(), { completed: 0, planned: 0, restDays: 0, volumeKg: 0, durationMinutes: 0 });
});

// ---------------------------------------------------------------- report -----
console.log(`\n${passed} tests PASS, ${failed} FAIL`);
if (failed === 0) {
  console.log('ALL TESTS PASSED');
} else {
  console.log('SOME TESTS FAILED');
}