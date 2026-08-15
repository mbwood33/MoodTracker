import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EntryTimeline } from './entry-timeline';
import type { MoodEntry } from './types';

const baseEntry: Omit<MoodEntry, 'id' | 'occurredAt' | 'occurredLocalDate'> = {
  moodRating: 4,
  note: '',
  noteJson: null,
  activityTags: [],
  energyRating: null,
  occurredTimeZone: 'America/Chicago',
  createdAt: '2026-08-15T12:00:00.000Z',
  updatedAt: '2026-08-15T12:00:00.000Z',
  deletedAt: null,
  syncStatus: 'synchronized',
};

function entry(index: number): MoodEntry {
  const day = String(20 - index).padStart(2, '0');
  return {
    ...baseEntry,
    id: `entry-${index}`,
    note: `Entry ${index}`,
    occurredAt: `2026-08-${day}T18:00:00.000Z`,
    occurredLocalDate: `2026-08-${day}`,
  };
}

describe('EntryTimeline', () => {
  afterEach(cleanup);

  it('progressively reveals older entries without hiding entry actions', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const entries = Array.from({ length: 12 }, (_, index) => entry(index));

    render(
      <EntryTimeline
        entries={entries}
        onDelete={vi.fn()}
        onEdit={onEdit}
        onRestore={vi.fn()}
      />,
    );

    expect(screen.getByText('Entry 9')).toBeInTheDocument();
    expect(screen.queryByText('Entry 10')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /show 2 previous entries/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /show 2 previous entries/i }),
    );

    expect(screen.getByText('Entry 10')).toBeInTheDocument();
    expect(screen.getByText('Entry 11')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /show .*previous entries/i }),
    ).not.toBeInTheDocument();

    const olderEntryEditButton = screen
      .getAllByRole('button', { name: 'Edit' })
      .at(10);
    expect(olderEntryEditButton).toBeDefined();
    await user.click(olderEntryEditButton!);
    expect(onEdit).toHaveBeenCalledWith(entries[10]);
  });
});
