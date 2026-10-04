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

  it('keeps the selected mood visibly highlighted', async () => {
    const user = userEvent.setup();
    render(<EntryWorkspace />);

    const rad = screen.getByRole<HTMLInputElement>('radio', { name: 'Rad' });
    await user.click(rad);

    expect(rad).toBeChecked();
    expect(rad.closest('label')).toHaveClass('bg-primary');
    expect(
      screen.getByRole<HTMLInputElement>('radio', { name: 'Meh' }),
    ).not.toBeChecked();
  });

  it('keeps regular text as the default and does not toggle bold from editor clicks', async () => {
    const user = userEvent.setup();
    render(<EntryWorkspace />);

    await user.click(screen.getByRole('button', { name: 'Add details' }));

    const editor = screen.getByRole('textbox', { name: 'Note' });
    const bold = screen.getByRole('button', { name: 'Bold' });
    expect(editor).toHaveClass('font-normal');
    expect(bold).toHaveAttribute('aria-pressed', 'false');

    await user.click(bold);
    expect(bold).toHaveAttribute('aria-pressed', 'true');
    await user.click(bold);
    expect(bold).toHaveAttribute('aria-pressed', 'false');
    await user.click(editor);

    expect(bold).toHaveAttribute('aria-pressed', 'false');
  });

  it('clears optional entry fields after a successful save', async () => {
    Object.defineProperties(URL, {
      createObjectURL: {
        configurable: true,
        value: vi.fn(() => 'blob:entry-photo'),
      },
      revokeObjectURL: { configurable: true, value: vi.fn() },
    });
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<EntryWorkspace onCreate={onCreate} />);

    await user.click(screen.getByRole('button', { name: 'Add details' }));
    await user.type(screen.getByRole('textbox', { name: 'Note' }), 'A note');
    expect(screen.getByRole('textbox', { name: 'Note' })).not.toHaveTextContent(
      /^$/,
    );
    await user.type(
      screen.getByPlaceholderText('Add an activity or tag'),
      'Walking',
    );
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Energy (optional)' }),
      '4',
    );
    const photoInput =
      container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(photoInput).not.toBeNull();
    await user.upload(
      photoInput!,
      new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }),
    );

    await user.click(screen.getByRole('button', { name: 'Save entry' }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        activityTags: ['Walking'],
        energyRating: 4,
        photoFile: expect.objectContaining({ name: 'photo.jpg' }),
      }),
    );
    expect(screen.getByRole('button', { name: 'Add details' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Add details' }));
    expect(screen.getByRole('textbox', { name: 'Note' })).toHaveTextContent('');
    expect(screen.queryByText('#Walking')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Add an activity or tag')).toHaveValue(
      '',
    );
    expect(
      screen.getByRole('combobox', { name: 'Energy (optional)' }),
    ).toHaveValue('');
    expect(screen.getByText('Choose photo')).toBeInTheDocument();
    expect(
      screen.queryByAltText('Selected attachment preview'),
    ).not.toBeInTheDocument();
  });

  it('offers the defined optional energy scale', async () => {
    const user = userEvent.setup();
    render(<EntryWorkspace />);

    await user.click(screen.getByRole('button', { name: 'Add details' }));

    const energySelect = screen.getByRole<HTMLSelectElement>('combobox', {
      name: 'Energy (optional)',
    });
    expect(energySelect).toHaveValue('');
    expect(
      Array.from(energySelect.options, (option) => option.textContent),
    ).toEqual([
      'Not recorded',
      '1 — Exhausted',
      '2 — Low',
      '3 — OK',
      '4 — High',
      '5 — Energized',
    ]);
  });

  it('restores a recently deleted preview entry', async () => {
    const user = userEvent.setup();
    render(<EntryWorkspace />);

    await user.click(screen.getByText('Good', { selector: 'span' }));
    await user.click(screen.getByRole('button', { name: 'Save entry' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(
      screen.getByRole('heading', {
        name: 'Recently deleted (last 30 days)',
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Restore entry' }));

    expect(
      screen.queryByRole('heading', {
        name: 'Recently deleted (last 30 days)',
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });
});
