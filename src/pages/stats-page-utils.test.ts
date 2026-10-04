import { describe, expect, it } from 'vitest';

import type { DailyMood } from '@/domain';

import { buildChartDays, summarizeChartDays } from './stats-page-utils';

function day(
  date: string,
  average: number,
  distribution: readonly number[],
): DailyMood {
  return {
    date,
    average,
    entryCount: distribution.reduce((total, count) => total + count, 0),
    distribution,
  };
}

describe('stats date windows', () => {
  it.each([30, 60, 90] as const)('builds a complete %i-day view', (range) => {
    const days = buildChartDays(
      [day('2026-10-04', 4, [0, 0, 0, 1, 0])],
      0,
      range,
    );

    expect(days).toHaveLength(range);
    expect(days.at(-1)).toMatchObject({
      date: '2026-10-04',
      average: 4,
      entryCount: 1,
    });
    expect(days.filter((item) => item.average === null)).toHaveLength(
      range - 1,
    );
  });

  it('moves older by one complete selected window', () => {
    const days = buildChartDays([day('2026-10-04', 4, [0, 0, 0, 1, 0])], 1, 30);

    expect(days[0]?.date).toBe('2026-08-06');
    expect(days.at(-1)?.date).toBe('2026-09-04');
  });

  it('summarizes distribution only from displayed days', () => {
    const summary = summarizeChartDays([
      {
        date: '2026-10-03',
        average: 2,
        entryCount: 2,
        distribution: [1, 1, 0, 0, 0],
      },
      {
        date: '2026-10-04',
        average: 5,
        entryCount: 1,
        distribution: [0, 0, 0, 0, 1],
      },
    ]);

    expect(summary).toEqual({ distribution: [1, 1, 0, 0, 1], entries: 3 });
  });
});
