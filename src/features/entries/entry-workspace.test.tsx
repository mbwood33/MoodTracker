import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EntryWorkspace } from './entry-workspace';

describe('EntryWorkspace', () => {
  afterEach(cleanup);

  it('creates a local preview entry from the fast mood flow', async () => {
    const user = userEvent.setup();
    render(<EntryWorkspace />);

    await user.click(screen.getByText('Good', { selector: 'span' }));
    await user.click(screen.getByRole('button', { name: 'Save entry' }));

    expect((await screen.findAllByText('Good')).length).toBeGreaterThan(1);
    expect(screen.getByText('saved locally')).toBeInTheDocument();
  });

  it('delegates creation to a supplied persistence adapter', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<EntryWorkspace onCreate={onCreate} />);

    await user.click(screen.getByText('Rad', { selector: 'span' }));
    await user.click(screen.getByRole('button', { name: 'Save entry' }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ moodRating: 5 }),
    );
  });
});
