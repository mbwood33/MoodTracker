import type { MoodEntry } from '@/domain/entries';

export type DailyMood = {
  date: string;
  average: number;
  entryCount: number;
};

export type MoodStatistics = {
  entries: number;
  loggedDays: number;
  averageDailyMood: number | null;
  currentChain: number;
  longestChain: number;
  distribution: readonly number[];
  dailyMoods: DailyMood[];
};

/** Statistics deliberately group by stored local dates, never UTC dates. */
export function calculateMoodStatistics(
  entries: readonly MoodEntry[],
  currentLocalDate = formatDate(new Date()),
): MoodStatistics {
  const active = entries.filter((entry) => entry.deletedAt === null);
  const byDate = new Map<string, { total: number; count: number }>();
  const distribution = [0, 0, 0, 0, 0];

  for (const entry of active) {
    const day = byDate.get(entry.occurredLocalDate) ?? { total: 0, count: 0 };
    day.total += entry.moodRating;
    day.count += 1;
    byDate.set(entry.occurredLocalDate, day);
    const index = entry.moodRating - 1;
    distribution[index] = (distribution[index] ?? 0) + 1;
  }

  const dailyMoods = [...byDate.entries()]
    .map(([date, value]) => ({
      date,
      average: value.total / value.count,
      entryCount: value.count,
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
  const averageDailyMood = dailyMoods.length
    ? dailyMoods.reduce((total, day) => total + day.average, 0) /
      dailyMoods.length
    : null;
  const chains = calculateChains(
    dailyMoods.map((day) => day.date),
    currentLocalDate,
  );

  return {
    entries: active.length,
    loggedDays: dailyMoods.length,
    averageDailyMood,
    currentChain: chains.current,
    longestChain: chains.longest,
    distribution,
    dailyMoods,
  };
}

function calculateChains(dates: readonly string[], currentLocalDate: string) {
  if (!dates.length) return { current: 0, longest: 0 };

  let running = 1;
  let longest = 1;
  for (let index = 1; index < dates.length; index += 1) {
    const previous = dates[index - 1];
    const current = dates[index];
    if (previous && current && daysBetween(previous, current) === 1) {
      running += 1;
    } else running = 1;
    longest = Math.max(longest, running);
  }

  const loggedDates = new Set(dates);
  let cursor = loggedDates.has(currentLocalDate)
    ? currentLocalDate
    : previousDate(currentLocalDate);
  if (!loggedDates.has(cursor)) return { current: 0, longest };

  let current = 0;
  while (loggedDates.has(cursor)) {
    current += 1;
    cursor = previousDate(cursor);
  }
  return { current, longest };
}

function daysBetween(start: string, end: string) {
  return Math.round(
    (Date.parse(`${end}T00:00:00.000Z`) -
      Date.parse(`${start}T00:00:00.000Z`)) /
      86_400_000,
  );
}

function previousDate(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return formatDate(value);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
