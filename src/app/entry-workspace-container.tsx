import { useCallback, useEffect, useRef, useState } from 'react';

import { DexieLocalEntryRepository } from '@/data/local';
import { SupabaseMoodEntryRepository } from '@/data/remote/mood-entry-repository';
import { getSupabaseClient } from '@/data/remote/supabase';
import type { MoodEntry as DomainMoodEntry } from '@/domain';
import {
  EntryWorkspace,
  type EntryDraft,
  type EntryRepositoryAdapter,
  type MoodEntry,
} from '@/features/entries';
import { LocalFirstEntries, synchronizePendingEntries } from '@/sync';

type EntryWorkspaceContainerProps = {
  userId: string;
  showTimeline?: boolean;
};

type SyncState = 'saved-locally' | 'synchronizing' | 'synchronized' | 'problem';

function toFeatureEntry(
  entry: DomainMoodEntry,
  syncStatus: SyncState,
): MoodEntry {
  return {
    id: entry.id,
    moodRating: entry.moodRating as MoodEntry['moodRating'],
    note: entry.notePlainText,
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
    remote: SupabaseMoodEntryRepository;
  }>(() => {
    const local = new DexieLocalEntryRepository();
    return {
      local,
      entries: new LocalFirstEntries(local),
      remote: new SupabaseMoodEntryRepository(),
    };
  });
  const syncing = useRef(false);
  const syncState = useRef<SyncState>('saved-locally');
  const [entries, setEntries] = useState<MoodEntry[]>([]);

  const loadEntries = useCallback(async () => {
    const [storedEntries, pending] = await Promise.all([
      services.local.listForUser(userId),
      services.local.getPendingMutations(userId),
    ]);
    const pendingEntryIds = new Set(
      pending.map((mutation) => mutation.entryId),
    );

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

    if (!navigator.onLine || !getSupabaseClient()) {
      syncState.current = 'saved-locally';
      await loadEntries();
      return;
    }

    syncing.current = true;
    syncState.current = 'synchronizing';
    try {
      const result = await synchronizePendingEntries(userId, {
        repository: services.local,
        remote: services.remote,
        reader: services.remote,
      });
      syncState.current = result.failed > 0 ? 'problem' : 'synchronized';
    } catch {
      syncState.current = 'problem';
    } finally {
      syncing.current = false;
      await loadEntries();
    }
  }, [loadEntries, services, userId]);

  useEffect(() => {
    void loadEntries();
    const initialSync = window.setTimeout(() => void synchronize(), 0);
    return () => window.clearTimeout(initialSync);
  }, [loadEntries, synchronize]);

  useEffect(() => {
    const handleOnline = () => void synchronize();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [synchronize]);

  const repository: EntryRepositoryAdapter = {
    entries,
    create: async (draft) => {
      await services.entries.create(toDomainCreateInput(userId, draft));
      await loadEntries();
      void synchronize();
    },
    update: async (entryId, draft) => {
      await services.entries.update(entryId, {
        moodRating: draft.moodRating,
        notePlainText: draft.note,
        energyRating: draft.energyRating,
        occurredAtUtc: draft.occurredAt,
        occurredTimeZone: draft.occurredTimeZone,
        occurredLocalDate: draft.occurredLocalDate,
      });
      await loadEntries();
      void synchronize();
    },
    remove: async (entryId) => {
      await services.entries.remove(entryId);
      await loadEntries();
      void synchronize();
    },
  };

  return <EntryWorkspace repository={repository} showTimeline={showTimeline} />;
}
