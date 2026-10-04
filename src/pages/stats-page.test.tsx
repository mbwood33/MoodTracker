import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createMoodEntry } from '@/domain';

import { StatsPage } from './stats-page';

const { listForUser } = vi.hoisted(() => ({ listForUser: vi.fn() }));

vi.mock('@/data/local', () => ({
  DexieLocalEntryRepository: class {
    listForUser(userId: string) {
      return listForUser(userId);
    }
  },
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ status: 'authenticated', user: { uid: 'stats-user' } }),
}));

function entry(localDate: string, moodRating: 1 | 2 | 3 | 4 | 5) {
  return createMoodEntry({
    userId: 'stats-user',
    moodRating,
    occurredAtUtc: `${localDate}T12:00:00.000Z`,
    occurredTimeZone: 'America/Chicago',
    occurredLocalDate: localDate,
  });
}

describe('StatsPage ranges', () => {
  beforeEach(() => {
    listForUser.mockResolvedValue([
      entry('2026-08-20', 1),
      entry('2026-09-10', 4),
      entry('2026-10-04', 5),
    ]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('offers 30, 60, and 90 days and applies the range to distribution', async () => {
    const user = userEvent.setup();
    render(<StatsPage />);

    const range = await screen.findByRole<HTMLSelectElement>('combobox', {
      name: 'Daily mood range',
    });
    expect(Array.from(range.options, (option) => option.textContent)).toEqual([
      '30 days',
      '60 days',
      '90 days',
    ]);
    expect(range).toHaveValue('30');

    const awfulRow = screen.getByText('Awful').parentElement!;
    expect(within(awfulRow).getByText(/0 · 0%/)).toBeInTheDocument();

    await user.selectOptions(range, '60');

    expect(within(awfulRow).getByText(/1 · 33%/)).toBeInTheDocument();
  });

  it('keeps the daily mood graph contained while longer ranges compress', async () => {
    const user = userEvent.setup();
    render(<StatsPage />);

    const range = await screen.findByRole<HTMLSelectElement>('combobox', {
      name: 'Daily mood range',
    });
    const panel = screen
      .getByRole('heading', { name: 'Daily mood' })
      .closest('article');
    const chart = screen.getByLabelText('Daily mood bar chart');

    expect(panel).toHaveClass('min-w-0', 'overflow-hidden');
    expect(chart).toHaveClass('w-full', 'min-w-0', 'overflow-hidden');

    await user.selectOptions(range, '90');

    expect(screen.getByLabelText('Daily mood bar chart')).toHaveClass(
      'w-full',
      'min-w-0',
      'overflow-hidden',
    );
  });

  it('renders the smooth view as a line without point markers', async () => {
    const user = userEvent.setup();
    const { container } = render(<StatsPage />);

    await screen.findByRole('combobox', { name: 'Daily mood range' });
    await user.click(screen.getByRole('button', { name: 'Smooth line' }));

    expect(screen.getByLabelText('Daily mood smooth line chart')).toBeVisible();
    expect(container.querySelectorAll('circle')).toHaveLength(0);
  });
});
