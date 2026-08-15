import { describe, expect, it } from 'vitest';

import { buildCalendarDays, dailyAverages } from './calendar-utils';
import { createMoodEntry, type MoodEntry } from '@/domain';

function entry(localDate: string, moodRating: number): MoodEntry {
  return createMoodEntry(
    {
      userId: 'user',
      moodRating,
      occurredAtUtc: `${localDate}T12:00:00.000Z`,
      occurredTimeZone: 'America/Chicago',
      occurredLocalDate: localDate,
    },
    { identityFactory: { createId: () => crypto.randomUUID() } },
  );
}

describe('calendar helpers', () => {
  it('builds a complete Sunday-first month grid with adjacent no-data dates', () => {
    const days = buildCalendarDays(new Date('2026-08-01T00:00:00.000Z'));

    expect(days).toHaveLength(42);
    expect(days[0]).toMatchObject({ date: '2026-07-26', inMonth: false });
    expect(days[6]).toMatchObject({ date: '2026-08-01', inMonth: true });
  });

  it('averages multiple entries by their preserved local calendar date', () => {
    const averages = dailyAverages([
      entry('2026-08-02', 2),
      entry('2026-08-02', 5),
      entry('2026-08-03', 4),
    ]);

    expect(averages.get('2026-08-02')).toEqual({ average: 3.5, count: 2 });
    expect(averages.get('2026-08-03')).toEqual({ average: 4, count: 1 });
  });
});
