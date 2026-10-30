import { Bell, BellOff, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationCapability,
  isPushNotificationsEnabled,
  showPushNotificationTest,
  type PushNotificationCapability,
} from '@/data/remote/push-subscription-repository';

type PushNotificationControlProps = {
  userId: string;
  /** Lets the reminders feature use its authenticated server-side test send. */
  onSendTest?: () => Promise<void>;
};

export function PushNotificationControl({
  userId,
  onSendTest,
}: PushNotificationControlProps) {
  const [capability, setCapability] = useState<PushNotificationCapability>();
  const [enabled, setEnabled] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState<'enable' | 'disable' | 'test'>();
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    let active = true;
    void Promise.all([
      getPushNotificationCapability(),
      isPushNotificationsEnabled(userId),
    ])
      .then(([nextCapability, nextEnabled]) => {
        if (!active) return;
        setCapability(nextCapability);
        setEnabled(nextEnabled);
      })
      .catch((error: unknown) => {
        if (active) setMessage(errorMessage(error));
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const enable = async () => {
    setBusy('enable');
    setMessage(undefined);
    try {
      await enablePushNotifications(userId);
      setEnabled(true);
      setMessage('Notifications are enabled on this device.');
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(undefined);
    }
  };

  const disable = async () => {
    setBusy('disable');
    setMessage(undefined);
    try {
      await disablePushNotifications(userId);
      setEnabled(false);
      setMessage('Notifications are disabled on this device.');
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(undefined);
    }
  };

  const test = async () => {
    setBusy('test');
    setMessage(undefined);
    try {
      await (onSendTest ?? showPushNotificationTest)();
      setMessage('Test notification sent.');
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(undefined);
    }
  };

  const unsupportedReason =
    capability && !capability.available ? capability.reason : undefined;

  return (
    <section
      className="border-border bg-card rounded-2xl border p-4"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {enabled ? (
          <Bell aria-hidden="true" className="text-primary mt-0.5 size-5" />
        ) : (
          <BellOff
            aria-hidden="true"
            className="text-muted-foreground mt-0.5 size-5"
          />
        )}
        <div className="min-w-0">
          <h3 className="font-medium">Notifications on this device</h3>
          <p className="text-muted-foreground mt-1 text-sm leading-5">
            {unsupportedReason ??
              (enabled
                ? 'Reminder notifications are enabled for this browser or installed app.'
                : 'Enable this device to receive reminders. On iPhone or iPad, install the app first.')}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {enabled ? (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={checking || Boolean(busy)}
              onClick={() => void test()}
            >
              {busy === 'test' ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Bell className="size-4" />
              )}
              Test notification
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={checking || Boolean(busy)}
              onClick={() => void disable()}
            >
              {busy === 'disable' && (
                <LoaderCircle className="size-4 animate-spin" />
              )}
              Disable on this device
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            disabled={checking || Boolean(busy) || Boolean(unsupportedReason)}
            onClick={() => void enable()}
          >
            {busy === 'enable' && (
              <LoaderCircle className="size-4 animate-spin" />
            )}
            Enable notifications
          </Button>
        )}
      </div>
      {message && (
        <p className="text-muted-foreground mt-3 text-sm">{message}</p>
      )}
    </section>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.';
}
