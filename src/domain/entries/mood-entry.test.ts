import { describe, expect, it } from 'vitest';

import { createMoodEntry, updateMoodEntry } from './mood-entry';

const ids = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
];

const dependencies = {
  clock: { now: () => new Date('2026-08-05T18:30:00.000Z') },
  identityFactory: { createId: () => ids.shift() ?? crypto.randomUUID() },
};

describe('mood entries', () => {
  it('persists the supplied original local date and time zone', () => {
    const entry = createMoodEntry(
      {
        userId: '00000000-0000-4000-8000-000000000099',
        moodRating: 4,
        occurredAtUtc: '2026-08-05T18:30:00.000Z',
        occurredTimeZone: 'America/Chicago',
        occurredLocalDate: '2026-08-05',
      },
      dependencies,
    );

    expect(entry.occurredLocalDate).toBe('2026-08-05');
    expect(entry.occurredTimeZone).toBe('America/Chicago');
    expect(entry.energyRating).toBeNull();
    expect(entry.notePlainText).toBe('');
  });

  it('allows an optional energy rating to be cleared', () => {
    const entry = createMoodEntry(
      {
        userId: '00000000-0000-4000-8000-000000000099',
        moodRating: 4,
        energyRating: 5,
        occurredAtUtc: '2026-08-05T18:30:00.000Z',
        occurredTimeZone: 'America/Chicago',
        occurredLocalDate: '2026-08-05',
      },
      dependencies,
    );

    expect(
      updateMoodEntry(entry, { energyRating: null }, dependencies).energyRating,
    ).toBeNull();
  });
});
