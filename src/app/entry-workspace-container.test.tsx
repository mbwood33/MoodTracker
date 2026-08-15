import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getLocalDatabase } from '@/data/local';

import { EntryWorkspaceContainer } from './entry-workspace-container';

const userId = '00000000-0000-4000-8000-000000000099';

describe('EntryWorkspaceContainer', () => {
  beforeEach(async () => {
    const database = getLocalDatabase();
    await database.open();
    await Promise.all([
      database.moodEntries.clear(),
      database.entryMutations.clear(),
      database.syncMetadata.clear(),
    ]);
  });

  afterEach(async () => {
    cleanup();
    await Promise.resolve();
    const database = getLocalDatabase();
    await Promise.all([
      database.moodEntries.clear(),
      database.entryMutations.clear(),
      database.syncMetadata.clear(),
    ]);
  });

  it('commits an entry locally and loads it after the workspace remounts', async () => {
    const user = userEvent.setup();
    const firstRender = render(<EntryWorkspaceContainer userId={userId} />);

    await user.click(screen.getByText('Good', { selector: 'span' }));
    await user.click(screen.getByRole('button', { name: 'Save entry' }));
    await expect(
      screen.findByText('saved locally'),
    ).resolves.toBeInTheDocument();

    firstRender.unmount();
    render(<EntryWorkspaceContainer userId={userId} />);

    expect(await screen.findByText('Good')).toBeInTheDocument();
    expect(await screen.findByText('saved locally')).toBeInTheDocument();
  });

  it('keeps a pending entry safe when a manual synchronization retry is requested', async () => {
    const user = userEvent.setup();
    render(<EntryWorkspaceContainer userId={userId} />);

    await user.click(screen.getByText('Good', { selector: 'span' }));
    await user.click(screen.getByRole('button', { name: 'Save entry' }));

    const retry = await screen.findByRole('button', {
      name: 'Retry synchronization',
    });
    await user.click(retry);

    expect(await screen.findByText('Saved locally')).toBeInTheDocument();
    expect(await screen.findByText('saved locally')).toBeInTheDocument();
  });

  it('restores a soft-deleted entry through the local persistence adapter', async () => {
    const user = userEvent.setup();
    const firstRender = render(<EntryWorkspaceContainer userId={userId} />);

    await user.click(screen.getByText('Good', { selector: 'span' }));
    await user.click(screen.getByRole('button', { name: 'Save entry' }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(
      await screen.findByRole('button', { name: 'Restore entry' }),
    );

    firstRender.unmount();
    render(<EntryWorkspaceContainer userId={userId} />);

    expect(
      await screen.findByRole('button', { name: 'Delete' }),
    ).toBeInTheDocument();
  });
});
