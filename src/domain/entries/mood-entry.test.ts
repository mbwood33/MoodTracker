import { describe, expect, it } from 'vitest';

import {
  createMoodEntry,
  restoreMoodEntry,
  softDeleteMoodEntry,
  updateMoodEntry,
} from './mood-entry';

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
    expect(entry.noteJson).toBeNull();
    expect(entry.notePlainText).toBe('');
  });

  it('persists rich note JSON alongside its plain-text projection', () => {
    const noteJson = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Calm' }] },
      ],
    };
    const entry = createMoodEntry(
      {
        userId: '00000000-0000-4000-8000-000000000099',
        moodRating: 4,
        noteJson,
        notePlainText: 'Calm',
        occurredAtUtc: '2026-08-05T18:30:00.000Z',
        occurredTimeZone: 'America/Chicago',
        occurredLocalDate: '2026-08-05',
      },
      dependencies,
    );

    expect(entry.noteJson).toEqual(noteJson);
    expect(entry.notePlainText).toBe('Calm');
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

  it('restores a soft-deleted entry with a new revision and mutation identity', () => {
    const entry = createMoodEntry(
      {
        userId: '00000000-0000-4000-8000-000000000099',
        moodRating: 3,
        occurredAtUtc: '2026-08-05T18:30:00.000Z',
        occurredTimeZone: 'America/Chicago',
        occurredLocalDate: '2026-08-05',
      },
      dependencies,
    );
    const deleted = softDeleteMoodEntry(entry, dependencies);
    const restored = restoreMoodEntry(deleted, dependencies);

    expect(restored).toMatchObject({
      id: entry.id,
      deletedAt: null,
      revision: entry.revision + 2,
    });
    expect(restored.clientMutationId).not.toBe(deleted.clientMutationId);
  });
});
