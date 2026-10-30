import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RemindersPage } from './reminders-page';

const { list, remove, save } = vi.hoisted(() => ({
  list: vi.fn(),
  remove: vi.fn(),
  save: vi.fn(),
}));

vi.mock('@/data/remote/reminder-repository', () => ({
  FirebaseReminderRepository: class {
    list() {
      return list();
    }
    save(reminder: unknown) {
      return save(reminder);
    }
    remove(id: string) {
      return remove(id);
    }
  },
}));

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ status: 'authenticated', user: { uid: 'reminder-user' } }),
}));

describe('RemindersPage', () => {
  beforeEach(() => {
    list.mockResolvedValue([]);
    save.mockResolvedValue(undefined);
    remove.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('creates a reminder with selected days and a notification setup slot', async () => {
    const user = userEvent.setup();
    render(<RemindersPage />);

    await screen.findByRole('heading', { name: 'No reminders yet' });
    expect(screen.getByLabelText('Notification setup')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Add your first reminder' }),
    );
    expect(screen.getByLabelText('Time')).toHaveValue('09:00');
    await user.click(screen.getByRole('checkbox', { name: 'Sun' }));
    expect(screen.getByRole('checkbox', { name: 'Sun' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Add reminder' })).toBeVisible();
  });
});
