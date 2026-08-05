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
});
