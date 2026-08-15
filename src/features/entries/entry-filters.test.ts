import { describe, expect, it } from 'vitest';

import { emptyEntryFilters, filterEntries } from './entry-filters';
import type { MoodEntry } from './types';

const entries: MoodEntry[] = [
  {
    id: 'one',
    moodRating: 4,
    note: 'A long walk felt great',
    noteJson: null,
    activityTags: ['Walk', 'Outside'],
    energyRating: 5,
    occurredAt: '2026-08-10T15:00:00.000Z',
    occurredTimeZone: 'America/Chicago',
    occurredLocalDate: '2026-08-10',
    createdAt: '2026-08-10T15:00:00.000Z',
    updatedAt: '2026-08-10T15:00:00.000Z',
    deletedAt: null,
    syncStatus: 'synchronized',
  },
  {
    id: 'two',
    moodRating: 2,
    note: '',
    noteJson: null,
    activityTags: ['Migraine'],
    energyRating: null,
    occurredAt: '2026-08-02T15:00:00.000Z',
    occurredTimeZone: 'America/Chicago',
    occurredLocalDate: '2026-08-02',
    createdAt: '2026-08-02T15:00:00.000Z',
    updatedAt: '2026-08-02T15:00:00.000Z',
    deletedAt: null,
    syncStatus: 'synchronized',
  },
  {
    id: 'deleted',
    moodRating: 5,
    note: 'Not active',
    noteJson: null,
    activityTags: [],
    energyRating: 4,
    occurredAt: '2026-08-11T15:00:00.000Z',
    occurredTimeZone: 'America/Chicago',
    occurredLocalDate: '2026-08-11',
    createdAt: '2026-08-11T15:00:00.000Z',
    updatedAt: '2026-08-11T15:00:00.000Z',
    deletedAt: '2026-08-12T15:00:00.000Z',
    syncStatus: 'synchronized',
  },
];

describe('filterEntries', () => {
  it('searches note text and tags without returning deleted entries', () => {
    expect(filterEntries(entries, { ...emptyEntryFilters, search: 'walk' })).toEqual([
      entries[0],
    ]);
    expect(
      filterEntries(entries, { ...emptyEntryFilters, search: 'MIGRAINE' }),
    ).toEqual([entries[1]]);
  });

  it('combines date, mood, tag, note, and energy filters', () => {
    expect(
      filterEntries(entries, {
        ...emptyEntryFilters,
        fromDate: '2026-08-09',
        toDate: '2026-08-10',
        moodRating: 4,
        activityTag: 'walk',
        hasNote: true,
        energyRating: 5,
      }),
    ).toEqual([entries[0]]);
    expect(
      filterEntries(entries, { ...emptyEntryFilters, energyRating: 'none' }),
    ).toEqual([entries[1]]);
  });
});
