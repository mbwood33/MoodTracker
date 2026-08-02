import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { useTheme } from '@/components/theme-context';
import { ThemeProvider } from '@/components/theme-provider';
import { resolveTheme } from '@/lib/theme';

describe('theme support', () => {
  it('resolves a system theme without changing explicit themes', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('stores an explicit theme selection', async () => {
    const user = userEvent.setup();
    window.localStorage.clear();

    function ThemeHarness() {
      const { theme, setTheme } = useTheme();
      return <button onClick={() => setTheme('dark')}>{theme}</button>;
    }

    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'system' }));
    expect(screen.getByRole('button', { name: 'dark' })).toBeInTheDocument();
    expect(window.localStorage.getItem('mood-tracker-theme')).toBe('dark');
    expect(document.documentElement).toHaveClass('dark');
  });
});
