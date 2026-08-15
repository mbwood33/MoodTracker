import { useCallback, useEffect, useRef, useState } from 'react';

import { DexieLocalEntryRepository } from '@/data/local';
import { getFirebaseServices } from '@/data/remote/firebase';
import { FirebaseMoodEntryRepository } from '@/data/remote/mood-entry-repository';
import type { MoodEntry as DomainMoodEntry } from '@/domain';
import {
  EntryWorkspace,
  type EntryDraft,
  type EntryRepositoryAdapter,
  type MoodEntry,
} from '@/features/entries';
import {
  SyncStatus,
  type SynchronizationStatus,
} from '@/features/sync/sync-status';
import { LocalFirstEntries, synchronizePendingEntries } from '@/sync';

type EntryWorkspaceContainerProps = {
  userId: string;
  showTimeline?: boolean;
};

type SyncState = SynchronizationStatus;

function toFeatureEntry(
  entry: DomainMoodEntry,
  syncStatus: SyncState,
): MoodEntry {
  return {
    id: entry.id,
    moodRating: entry.moodRating as MoodEntry['moodRating'],
    note: entry.notePlainText,
    noteJson: entry.noteJson ?? null,
    energyRating: entry.energyRating as MoodEntry['energyRating'],
    occurredAt: entry.occurredAtUtc,
    occurredTimeZone: entry.occurredTimeZone,
    occurredLocalDate: entry.occurredLocalDate,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    deletedAt: entry.deletedAt,
    syncStatus,
  };
}

function toDomainCreateInput(userId: string, draft: EntryDraft) {
  return {
    userId,
    moodRating: draft.moodRating,
    noteJson: draft.noteJson,
    notePlainText: draft.note,
    energyRating: draft.energyRating,
    occurredAtUtc: draft.occurredAt,
    occurredTimeZone: draft.occurredTimeZone,
    occurredLocalDate: draft.occurredLocalDate,
  };
}

export function EntryWorkspaceContainer({
  userId,
  showTimeline,
}: EntryWorkspaceContainerProps) {
  const [services] = useState<{
    local: DexieLocalEntryRepository;
    entries: LocalFirstEntries;
    remote: FirebaseMoodEntryRepository;
  }>(() => {
    const local = new DexieLocalEntryRepository();
    return {
      local,
      entries: new LocalFirstEntries(local),
      remote: new FirebaseMoodEntryRepository(),
    };
  });
  const syncing = useRef(false);
  const syncState = useRef<SyncState>('saved-locally');
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [status, setStatus] = useState<SyncState>('saved-locally');
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  const updateSyncState = useCallback((nextState: SyncState) => {
    syncState.current = nextState;
    setStatus(nextState);
  }, []);

  const loadEntries = useCallback(async () => {
    const [storedEntries, pending] = await Promise.all([
      services.local.listForUser(userId, true),
      services.local.getPendingMutations(userId),
    ]);
    const pendingEntryIds = new Set(
      pending.map((mutation) => mutation.entryId),
    );

    setPendingCount(pending.length);
    setEntries(
      storedEntries.map((entry) =>
        toFeatureEntry(
          entry,
          pendingEntryIds.has(entry.id) ? syncState.current : 'synchronized',
        ),
      ),
    );
  }, [services, userId]);

  const synchronize = useCallback(async () => {
    if (syncing.current) return;

    if (!navigator.onLine || !getFirebaseServices()) {
      updateSyncState('saved-locally');
      await loadEntries();
      return;
    }

    syncing.current = true;
    updateSyncState('synchronizing');
    try {
      const result = await synchronizePendingEntries(userId, {
        repository: services.local,
        remote: services.remote,
        reader: services.remote,
      });
      updateSyncState(result.failed > 0 ? 'problem' : 'synchronized');
    } catch {
      updateSyncState('problem');
    } finally {
      syncing.current = false;
      await loadEntries();
    }
  }, [loadEntries, services, updateSyncState, userId]);

  useEffect(() => {
    const initialSync = window.setTimeout(() => void synchronize(), 0);
    return () => window.clearTimeout(initialSync);
  }, [synchronize]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void synchronize();
    };
    const handleOffline = () => {
      setIsOnline(false);
      updateSyncState('saved-locally');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [synchronize, updateSyncState]);

  const repository: EntryRepositoryAdapter = {
    entries,
    create: async (draft) => {
      await services.entries.create(toDomainCreateInput(userId, draft));
      updateSyncState('saved-locally');
      await loadEntries();
      void synchronize();
    },
    update: async (entryId, draft) => {
      await services.entries.update(entryId, {
        moodRating: draft.moodRating,
        noteJson: draft.noteJson,
        notePlainText: draft.note,
        energyRating: draft.energyRating,
        occurredAtUtc: draft.occurredAt,
        occurredTimeZone: draft.occurredTimeZone,
        occurredLocalDate: draft.occurredLocalDate,
      });
      updateSyncState('saved-locally');
      await loadEntries();
      void synchronize();
    },
    remove: async (entryId) => {
      await services.entries.remove(entryId);
      updateSyncState('saved-locally');
      await loadEntries();
      void synchronize();
    },
    restore: async (entryId) => {
      await services.entries.restore(entryId);
      updateSyncState('saved-locally');
      await loadEntries();
      void synchronize();
    },
  };

  return (
    <div className="space-y-4">
      <SyncStatus
        isOnline={isOnline}
        onRetry={() => void synchronize()}
        pendingCount={pendingCount}
        status={status}
      />
      <EntryWorkspace repository={repository} showTimeline={showTimeline} />
    </div>
  );
}
