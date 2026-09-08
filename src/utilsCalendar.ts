import { WorkoutSession, WorkoutProgram } from './types';

// ----------------------------------------------------------------------------
// LOT III — Pure calendar helpers (page Calendrier).
// Read-only, deterministic. Rest days are PLAN-BASED: a day is a rest day only
// when the active program has a weekly schedule and no workout is planned that
// weekday AND no session was actually completed that day. A completed session
// always takes precedence (never invent a rest day over real training).
// ----------------------------------------------------------------------------

const WEEKDAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// F4 — local calendar-date key (YYYY-MM-DD) from a Date, WITHOUT UTC conversion.
// Session/measurement/record keys are calendar days in the USER's local timezone,
// so toISOString() (UTC) must never be used to build them: an event just after
// local midnight would be attributed to the previous day on UTC+x zones. Pure
// and deterministic (uses getFullYear/getMonth/getDate, all local getters).
export function toLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Local weekday name from a YYYY-MM-DD key (avoids the UTC parsing pitfall of
// the date-only constructor on machines with a negative UTC offset).
export function dayOfWeekName(dateKey: string): string {
  const parts = dateKey.split('-').map(Number);
  const y = Number.isFinite(parts[0]) ? parts[0] : 0;
  const m = Number.isFinite(parts[1]) ? parts[1] - 1 : 0;
  const d = Number.isFinite(parts[2]) ? parts[2] : 1;
  return WEEKDAY_NAMES[new Date(y, m, d).getDay()] || 'Dimanche';
}

// Whether the active program schedules a workout on that weekday. Without days
// (or without a program) nothing is planned and no day can be classified.
export function programPlansDay(program: WorkoutProgram | undefined, weekdayName: string): boolean {
  if (!program || !Array.isArray(program.days) || program.days.length === 0) return false;
  return program.days.some((d) => d.dayOfWeek === weekdayName);
}

export function isRestDay(
  dateKey: string,
  program: WorkoutProgram | undefined,
  completedDateKeys: string[]
): boolean {
  if (!program || !Array.isArray(program.days) || program.days.length === 0) return false;
  if (completedDateKeys.indexOf(dateKey) !== -1) return false;
  return !programPlansDay(program, dayOfWeekName(dateKey));
}

export interface MonthSummary {
  completed: number; // distinct days with a completed session
  planned: number; // days of the month where the program schedules a workout
  restDays: number; // plan-based rest days WITHOUT a completed session
  volumeKg: number;
  durationMinutes: number;
}

export function emptyMonthSummary(): MonthSummary {
  return { completed: 0, planned: 0, restDays: 0, volumeKg: 0, durationMinutes: 0 };
}

const keyOf = (y: number, month: number, day: number): string =>
  `${y}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

// Monthly aggregates for one displayed month (0-based month index). Sessions are
// matched on their real YYYY-MM-DD date. Guards: 0/empty handled, never NaN.
export function computeMonthSummary(
  year: number,
  month: number,
  sessions: WorkoutSession[],
  program: WorkoutProgram | undefined
): MonthSummary {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const summary = emptyMonthSummary();
  const completedKeys = new Set<string>();

  for (const s of sessions || []) {
    if (!s.date || !s.date.startsWith(monthPrefix)) continue;
    completedKeys.add(s.date);
    summary.volumeKg += s.totalVolumeKg || 0;
    summary.durationMinutes += s.durationMinutes || 0;
  }
  summary.completed = completedKeys.size;

  const completedArr = Array.from(completedKeys);
  for (let day = 1; day <= daysInMonth; day++) {
    const key = keyOf(year, month, day);
    if (programPlansDay(program, dayOfWeekName(key))) {
      summary.planned += 1;
    } else if (isRestDay(key, program, completedArr)) {
      summary.restDays += 1;
    }
  }
  return summary;
}