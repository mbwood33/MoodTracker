import { describe, expect, it } from 'vitest';

import { parseMoodCsv } from './csv-mood-import';

describe('parseMoodCsv', () => {
  it('parses valid rows and preserves deduplicated activity tags', () => {
    const result = parseMoodCsv(
      'full_date,time,mood,activites,note\n8/5/2026,14:30,4,"Walk | walk | Reading","A, calm afternoon"',
      'America/Chicago',
    );
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      moodRating: 4,
      occurredLocalDate: '2026-08-05',
      activityTags: ['Walk', 'Reading'],
      notePlainText: 'A, calm afternoon',
    });
  });

  it('reports invalid rows while retaining valid preview rows', () => {
    const result = parseMoodCsv(
      'full_date,time,mood,activites,note\n8/5/2026,14:30,5,,ok\n8/50/2026,25:00,8,,bad',
      'UTC',
    );
    expect(result.rows).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
  });
});
