import { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

import { Button } from '@/components/ui/button';

export function PwaUpdatePrompt() {
  const [offlineReady, setOfflineReady] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const updateServiceWorker = useRef<
    ((reloadPage?: boolean) => Promise<void>) | undefined
  >(undefined);

  useEffect(() => {
    updateServiceWorker.current = registerSW({
      onOfflineReady: () => setOfflineReady(true),
      onNeedRefresh: () => setNeedsRefresh(true),
    });
  }, []);

  if (!offlineReady && !needsRefresh) {
    return null;
  }

  return (
    <section
      aria-live="polite"
      aria-label="Application update status"
      className="border-border bg-card text-card-foreground fixed right-4 bottom-20 z-50 max-w-sm rounded-2xl border p-4 shadow-2xl lg:bottom-6"
    >
      <p className="font-medium">
        {needsRefresh ? 'An update is ready' : 'Ready to use offline'}
      </p>
      <p className="text-muted-foreground mt-1 text-sm">
        {needsRefresh
          ? 'Reload when you are ready to use the latest version.'
          : 'The application shell is now cached on this device.'}
      </p>
      <div className="mt-3 flex gap-2">
        {needsRefresh && (
          <Button
            size="sm"
            onClick={() => void updateServiceWorker.current?.(true)}
          >
            Reload
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setOfflineReady(false);
            setNeedsRefresh(false);
          }}
        >
          Dismiss
        </Button>
      </div>
    </section>
  );
}
