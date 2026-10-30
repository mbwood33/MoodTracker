import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PushNotificationControl } from './push-notification-control';

const push = vi.hoisted(() => ({
  capability: vi.fn(),
  disable: vi.fn(),
  enable: vi.fn(),
  enabled: vi.fn(),
  test: vi.fn(),
}));

vi.mock('@/data/remote/push-subscription-repository', () => ({
  disablePushNotifications: push.disable,
  enablePushNotifications: push.enable,
  getPushNotificationCapability: push.capability,
  isPushNotificationsEnabled: push.enabled,
  showPushNotificationTest: push.test,
}));

describe('PushNotificationControl', () => {
  beforeEach(() => {
    push.capability.mockResolvedValue({ available: true });
    push.enabled.mockResolvedValue(false);
    push.enable.mockResolvedValue(undefined);
    push.disable.mockResolvedValue(undefined);
    push.test.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('requests push setup only after the user explicitly enables it', async () => {
    const user = userEvent.setup();
    render(<PushNotificationControl userId="notification-user" />);

    const enable = await screen.findByRole('button', {
      name: 'Enable notifications',
    });
    expect(push.enable).not.toHaveBeenCalled();

    await user.click(enable);

    expect(push.enable).toHaveBeenCalledWith('notification-user');
    expect(
      screen.getByText('Notifications are enabled on this device.'),
    ).toBeVisible();
  });

  it('sends a test only to an already registered device', async () => {
    push.enabled.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<PushNotificationControl userId="notification-user" />);

    await user.click(
      await screen.findByRole('button', { name: 'Test notification' }),
    );

    expect(push.test).toHaveBeenCalledOnce();
    expect(screen.getByText('Test notification sent.')).toBeVisible();
  });
});
