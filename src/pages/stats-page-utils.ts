import type { MoodStatistics } from '@/domain';

export type StatsRangeDays = 30 | 60 | 90;

export type ChartDay = {
  date: string;
  average: number | null;
  entryCount: number;
  distribution: readonly number[];
};

export function buildChartDays(
  dailyMoods: MoodStatistics['dailyMoods'],
  offset: number,
  rangeDays: StatsRangeDays,
): ChartDay[] {
  const last = dailyMoods.at(-1)?.date;
  if (!last) return [];
  const dayByDate = new Map(dailyMoods.map((day) => [day.date, day]));
  const end = addLocalDays(last, -offset * rangeDays);

  return Array.from({ length: rangeDays }, (_, index) => {
    const date = addLocalDays(end, index - (rangeDays - 1));
    const day = dayByDate.get(date);
    return {
      date,
      average: day?.average ?? null,
      entryCount: day?.entryCount ?? 0,
      distribution: day?.distribution ?? [0, 0, 0, 0, 0],
    };
  });
}

export function summarizeChartDays(days: readonly ChartDay[]) {
  const distribution = [0, 0, 0, 0, 0];
  let entries = 0;

  for (const day of days) {
    entries += day.entryCount;
    day.distribution.forEach((count, index) => {
      distribution[index] = (distribution[index] ?? 0) + count;
    });
  }

  return { distribution, entries };
}

function addLocalDays(date: string, amount: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}
