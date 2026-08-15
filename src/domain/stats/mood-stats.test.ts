import { describe, expect, it } from 'vitest';

import { calculateMoodStatistics, type MoodEntry } from '@/domain';

const entry = (date: string, moodRating: number): MoodEntry => ({
  id: crypto.randomUUID(),
  userId: 'user',
  moodRating,
  energyRating: null,
  noteJson: null,
  notePlainText: '',
  occurredAtUtc: `${date}T12:00:00.000Z`,
  occurredTimeZone: 'America/Chicago',
  occurredLocalDate: date,
  createdAt: `${date}T12:00:00.000Z`,
  updatedAt: `${date}T12:00:00.000Z`,
  deletedAt: null,
  revision: 0,
  clientMutationId: crypto.randomUUID(),
});

describe('calculateMoodStatistics', () => {
  it('uses daily averages and stored local dates for summaries and chains', () => {
    const result = calculateMoodStatistics(
      [
        entry('2026-08-01', 2),
        entry('2026-08-01', 4),
        entry('2026-08-02', 5),
        entry('2026-08-04', 1),
      ],
      '2026-08-04',
    );

    expect(result.entries).toBe(4);
    expect(result.loggedDays).toBe(3);
    expect(result.averageDailyMood).toBeCloseTo(3);
    expect(result.currentChain).toBe(1);
    expect(result.longestChain).toBe(2);
    expect(result.distribution).toEqual([1, 1, 0, 1, 1]);
  });

  it('only reports a current chain that reaches today or yesterday', () => {
    const entries = [entry('2026-08-01', 3), entry('2026-08-02', 4)];

    expect(calculateMoodStatistics(entries, '2026-08-03').currentChain).toBe(2);
    expect(calculateMoodStatistics(entries, '2026-08-04').currentChain).toBe(0);
  });
});
