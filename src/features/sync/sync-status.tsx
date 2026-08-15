import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

export type SynchronizationStatus =
  'saved-locally' | 'synchronizing' | 'synchronized' | 'problem';

type SyncStatusProps = {
  isOnline: boolean;
  pendingCount: number;
  status: SynchronizationStatus;
  onRetry: () => void;
};

const statusCopy: Record<
  SynchronizationStatus,
  { title: string; description: string }
> = {
  'saved-locally': {
    title: 'Saved locally',
    description:
      'Your entries are safe on this device and will synchronize when possible.',
  },
  synchronizing: {
    title: 'Synchronizing',
    description: 'Updating your private entries across devices.',
  },
  synchronized: {
    title: 'Synchronized',
    description: 'Your saved entries are up to date.',
  },
  problem: {
    title: 'Sync needs attention',
    description:
      'Your entries are safely saved on this device. Try syncing again.',
  },
};

export function SyncStatus({
  isOnline,
  pendingCount,
  status,
  onRetry,
}: SyncStatusProps) {
  const copy = !isOnline
    ? {
        title: 'Offline',
        description:
          'Your entries are saved locally and will synchronize when you reconnect.',
      }
    : statusCopy[status];
  const canRetry = pendingCount > 0 && status !== 'synchronizing';

  return (
    <div className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm">
      <div aria-atomic="true" aria-live="polite" role="status">
        <p className="font-medium">{copy.title}</p>
        <p className="text-muted-foreground mt-0.5">
          {copy.description}
          {pendingCount > 0
            ? ` ${pendingCount} ${pendingCount === 1 ? 'change is' : 'changes are'} waiting.`
            : ''}
        </p>
      </div>
      {canRetry ? (
        <Button
          aria-label="Retry synchronization"
          disabled={!isOnline}
          onClick={onRetry}
          size="sm"
          type="button"
          variant="outline"
        >
          <RefreshCw aria-hidden="true" className="size-3.5" />
          Retry sync
        </Button>
      ) : null}
    </div>
  );
}
