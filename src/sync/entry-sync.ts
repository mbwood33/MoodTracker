import type { MoodEntry } from '@/domain';
import type { LocalEntryRepository, MutationOperation } from '@/data/local';

/**
 * The remote boundary is deliberately small so the queue can be tested without
 * network access and the local-first model remains independent of Firebase.
 */
export interface RemoteEntryWriter {
  write(entry: MoodEntry, operation: MutationOperation): Promise<void>;
}

export interface RemoteEntryReader {
  pullChanges(updatedAfter: string | null): Promise<MoodEntry[]>;
}

export interface SyncRunResult {
  attempted: number;
  synchronized: number;
  failed: number;
  pulled: number;
}

export interface EntrySyncDependencies {
  repository: LocalEntryRepository;
  remote: RemoteEntryWriter;
  reader?: RemoteEntryReader;
  lastPulledAt?: string | null;
  now?: () => Date;
}

/**
 * Processes a user-scoped outbox in chronological order. A failure is retained
 * in IndexedDB and later runs retry it; a local entry is never removed here.
 */
export async function synchronizePendingEntries(
  userId: string,
  dependencies: EntrySyncDependencies,
): Promise<SyncRunResult> {
  const now = dependencies.now ?? (() => new Date());
  const queued = await dependencies.repository.getPendingMutations(userId);
  let synchronized = 0;
  let failed = 0;

  for (const mutation of queued) {
    const attemptedAt = now().toISOString();
    await dependencies.repository.markMutationProcessing(
      mutation.id,
      attemptedAt,
    );

    try {
      await dependencies.remote.write(mutation.entry, mutation.operation);
      await dependencies.repository.acknowledgeMutation(mutation.id);
      synchronized += 1;
    } catch (error) {
      await dependencies.repository.failMutation(
        mutation.id,
        attemptedAt,
        error instanceof Error
          ? error.message
          : 'Unknown synchronization error.',
      );
      failed += 1;
      // Preserve ordering. A later edit must not overtake an earlier mutation.
      break;
    }
  }

  let pulled = 0;
  if (failed === 0 && dependencies.reader) {
    const remoteEntries = await dependencies.reader.pullChanges(
      dependencies.lastPulledAt ?? null,
    );

    for (const entry of remoteEntries) {
      if (await dependencies.repository.applyRemote(entry)) pulled += 1;
    }
  }

  return { attempted: synchronized + failed, synchronized, failed, pulled };
}
