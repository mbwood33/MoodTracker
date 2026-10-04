import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { emptyEntryFilters } from './entry-filters';
import { EntryFilterPanel } from './entry-filter-panel';

describe('EntryFilterPanel', () => {
  afterEach(cleanup);

  it('keeps the activity tag selector inside its grid column', () => {
    render(
      <EntryFilterPanel
        filters={emptyEntryFilters}
        tags={[
          'An intentionally very long activity tag that must not widen the filter panel',
        ]}
        resultCount={0}
        onChange={vi.fn()}
      />,
    );

    const selector = screen.getByRole('combobox', {
      name: 'Filter by activity or tag',
    });
    expect(selector).toHaveClass('w-full', 'min-w-0', 'max-w-full');
    expect(selector.closest('label')).toHaveClass('min-w-0');
  });
});
