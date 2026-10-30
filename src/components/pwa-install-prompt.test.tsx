import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PwaInstallPrompt } from './pwa-install-prompt';

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe('PwaInstallPrompt', () => {
  it('uses the browser install prompt only after the user chooses Install app', async () => {
    const user = userEvent.setup();
    const prompt = vi.fn().mockResolvedValue(undefined);
    const installEvent = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(installEvent, {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });

    render(<PwaInstallPrompt />);
    window.dispatchEvent(installEvent);

    await user.click(
      await screen.findByRole('button', { name: 'Install app' }),
    );

    expect(prompt).toHaveBeenCalledOnce();
  });

  it('removes the prompt for this browser session when dismissed', async () => {
    const user = userEvent.setup();
    const installEvent = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(installEvent, {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    });

    render(<PwaInstallPrompt />);
    window.dispatchEvent(installEvent);

    await user.click(await screen.findByRole('button', { name: 'Not now' }));

    expect(
      screen.queryByRole('region', { name: 'Install Mood Tracker' }),
    ).not.toBeInTheDocument();
  });
});
