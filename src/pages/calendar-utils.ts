import type { MoodEntry } from '@/domain';

export type CalendarDay = { date: string; dayNumber: number; inMonth: boolean };

export function dailyAverages(entries: MoodEntry[]) {
  const values = new Map<string, { total: number; count: number }>();
  entries.forEach((entry) => {
    const current = values.get(entry.occurredLocalDate) ?? {
      total: 0,
      count: 0,
    };
    values.set(entry.occurredLocalDate, {
      total: current.total + entry.moodRating,
      count: current.count + 1,
    });
  });
  return new Map(
    [...values].map(([date, value]) => [
      date,
      { average: value.total / value.count, count: value.count },
    ]),
  );
}

export function buildCalendarDays(month: Date): CalendarDay[] {
  const first = startOfMonth(month);
  const start = addDays(first, -first.getUTCDay());
  return Array.from({ length: 42 }, (_, index) => {
    const value = addDays(start, index);
    return {
      date: isoDate(value),
      dayNumber: value.getUTCDate(),
      inMonth: value.getUTCMonth() === first.getUTCMonth(),
    };
  });
}

export function startOfMonth(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}
export function addMonths(value: Date, amount: number) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + amount, 1),
  );
}
function addDays(value: Date, amount: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}
function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}
