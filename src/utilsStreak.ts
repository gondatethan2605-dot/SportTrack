// Pure streak computation shared by the realtime profile sync (reload) and the
// incremental finish-session path. A session counts for a day; consecutive
// calendar days (ending today or yesterday) form the current streak.
export function computeStreak(dates: (string | null | undefined)[], today = new Date()): number {
  const dateSet = new Set<string>();
  for (const d of dates) {
    if (d) dateSet.add(d);
  }
  const sortedDates = Array.from(dateSet).sort().reverse();

  if (sortedDates.length === 0) return 0;

  const todayMid = new Date(today);
  todayMid.setHours(0, 0, 0, 0);

  const yesterdayMid = new Date(todayMid);
  yesterdayMid.setDate(yesterdayMid.getDate() - 1);

  const mostRecent = new Date(sortedDates[0] + 'T00:00:00');
  mostRecent.setHours(0, 0, 0, 0);

  if (mostRecent.getTime() !== todayMid.getTime() && mostRecent.getTime() !== yesterdayMid.getTime()) {
    return 0;
  }

  let streak = 1;
  let checkDate = new Date(mostRecent);
  for (let i = 1; i < sortedDates.length; i++) {
    const prevExpected = new Date(checkDate);
    prevExpected.setDate(prevExpected.getDate() - 1);
    const actual = new Date(sortedDates[i] + 'T00:00:00');
    actual.setHours(0, 0, 0, 0);
    if (actual.getTime() === prevExpected.getTime()) {
      streak++;
      checkDate = prevExpected;
    } else {
      break;
    }
  }

  return streak;
}