import { Download, Share } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

type InstallChoice = { outcome: 'accepted' | 'dismissed' };
type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

const dismissedKey = 'mood-tracker-install-prompt-dismissed';

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<DeferredInstallPromptEvent>();
  const [isInstalled, setIsInstalled] = useState(isStandaloneDisplayMode);
  const [dismissed, setDismissed] = useState(
    () => window.sessionStorage.getItem(dismissedKey) === 'true',
  );

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(undefined);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  if (isInstalled || dismissed || (!deferredPrompt && !isIosDevice())) {
    return null;
  }

  const dismiss = () => {
    window.sessionStorage.setItem(dismissedKey, 'true');
    setDismissed(true);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(undefined);
    }
  };

  return (
    <section
      aria-label="Install Mood Tracker"
      className="border-border bg-card text-card-foreground fixed right-4 bottom-52 z-50 max-w-sm rounded-2xl border p-4 shadow-2xl lg:bottom-36"
    >
      <div className="flex gap-3">
        <Download aria-hidden="true" className="text-primary mt-0.5 size-5" />
        <div>
          <p className="font-medium">Install Mood Tracker</p>
          <p className="text-muted-foreground mt-1 text-sm leading-5">
            {isIosDevice()
              ? 'In Safari, tap Share, then Add to Home Screen. It will open like an app and can receive reminders.'
              : 'Add Mood Tracker to your home screen for quick, app-like access and reminders.'}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {deferredPrompt ? (
          <Button size="sm" onClick={() => void install()}>
            Install app
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled>
            <Share aria-hidden="true" className="size-4" /> Add in Safari
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={dismiss}>
          Not now
        </Button>
      </div>
    </section>
  );
}

function isIosDevice() {
  return (
    /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
    (window.navigator.platform === 'MacIntel' &&
      window.navigator.maxTouchPoints > 1)
  );
}

function isStandaloneDisplayMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}
