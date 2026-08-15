import { useCallback, useEffect, useRef, useState } from 'react';
import { ref, uploadBytes } from 'firebase/storage';

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
  showFilters?: boolean;
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
    activityTags: entry.activityTags ?? [],
    photo: entry.photo ?? null,
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
    activityTags: draft.activityTags,
    energyRating: draft.energyRating,
    occurredAtUtc: draft.occurredAt,
    occurredTimeZone: draft.occurredTimeZone,
    occurredLocalDate: draft.occurredLocalDate,
    photo: draft.photo ?? null,
  };
}

export function EntryWorkspaceContainer({
  userId,
  showTimeline,
  showFilters,
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
      const created = await services.entries.create(toDomainCreateInput(userId, draft));
      if (draft.photoFile) {
        await services.local.database.pendingPhotoUploads.put({
          id: crypto.randomUUID(), entryId: created.id, userId, file: draft.photoFile,
          fileName: draft.photoFile.name, contentType: draft.photoFile.type || 'image/jpeg', createdAt: new Date().toISOString(),
        });
      }
      updateSyncState('saved-locally');
      await loadEntries();
      void synchronize();
      void uploadPendingPhotos();
    },
    update: async (entryId, draft) => {
      await services.entries.update(entryId, {
        moodRating: draft.moodRating,
        noteJson: draft.noteJson,
        notePlainText: draft.note,
        activityTags: draft.activityTags,
        photo: draft.photo ?? null,
        energyRating: draft.energyRating,
        occurredAtUtc: draft.occurredAt,
        occurredTimeZone: draft.occurredTimeZone,
        occurredLocalDate: draft.occurredLocalDate,
      });
      if (draft.photoFile) {
        await services.local.database.pendingPhotoUploads.put({
          id: crypto.randomUUID(), entryId, userId, file: draft.photoFile,
          fileName: draft.photoFile.name, contentType: draft.photoFile.type || 'image/jpeg', createdAt: new Date().toISOString(),
        });
      }
      updateSyncState('saved-locally');
      await loadEntries();
      void synchronize();
      void uploadPendingPhotos();
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

  const uploadPendingPhotos = useCallback(async () => {
    const firebase = getFirebaseServices();
    if (!firebase || !navigator.onLine) return;
    const uploads = await services.local.database.pendingPhotoUploads.where('userId').equals(userId).toArray();
    for (const pending of uploads) {
      try {
        const extension = pending.contentType.split('/')[1] || 'jpg';
        const storagePath = `users/${userId}/media/${pending.entryId}/${pending.id}.${extension}`;
        await uploadBytes(ref(firebase.storage, storagePath), pending.file, { contentType: pending.contentType });
        await services.entries.update(pending.entryId, { photo: { id: pending.id, storagePath } });
        await services.local.database.pendingPhotoUploads.delete(pending.id);
      } catch { /* Retain the Blob in IndexedDB and retry later. */ }
    }
    await loadEntries();
    void synchronize();
  }, [loadEntries, services, synchronize, userId]);

  useEffect(() => {
    void uploadPendingPhotos();
  }, [uploadPendingPhotos]);

  return (
    <div className="space-y-4">
      <SyncStatus
        isOnline={isOnline}
        onRetry={() => void synchronize()}
        pendingCount={pendingCount}
        status={status}
      />
      <EntryWorkspace
        repository={repository}
        showFilters={showFilters}
        showTimeline={showTimeline}
      />
    </div>
  );
}
