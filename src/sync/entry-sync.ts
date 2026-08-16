import type { MoodEntry } from '@/domain';
import type {
  EntryMutation,
  LocalEntryRepository,
  MutationOperation,
} from '@/data/local';

/**
 * The remote boundary is deliberately small so the queue can be tested without
 * network access and the local-first model remains independent of Firebase.
 */
export interface RemoteEntryWriter {
  write(entry: MoodEntry, operation: MutationOperation): Promise<void>;
  writeInitialEntries?(entries: readonly MoodEntry[]): Promise<void>;
}

/** Optional fast path for fresh UUID-backed entries, such as CSV imports. */
export interface InitialEntryBatchWriter {
  writeInitialEntries(entries: readonly MoodEntry[]): Promise<void>;
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

const INITIAL_ENTRY_BATCH_SIZE = 450;
const activeSynchronizations = new Map<string, Promise<SyncRunResult>>();

function isInitialEntry(mutation: EntryMutation): boolean {
  return mutation.operation === 'upsert' && mutation.entry.revision === 0;
}

function supportsInitialEntryBatches(
  remote: RemoteEntryWriter,
): remote is RemoteEntryWriter & InitialEntryBatchWriter {
  return typeof remote.writeInitialEntries === 'function';
}

function syncCursorKey(userId: string): string {
  return `mood-entries:last-pulled:${userId}`;
}

/**
 * Processes a user-scoped outbox in chronological order. A failure is retained
 * in IndexedDB and later runs retry it; a local entry is never removed here.
 */
export async function synchronizePendingEntries(
  userId: string,
  dependencies: EntrySyncDependencies,
): Promise<SyncRunResult> {
  const existing = activeSynchronizations.get(userId);
  if (existing) return existing;

  const run = synchronizePendingEntriesInternal(userId, dependencies);
  activeSynchronizations.set(userId, run);
  void run.then(
    () => {
      if (activeSynchronizations.get(userId) === run)
        activeSynchronizations.delete(userId);
    },
    () => {
      if (activeSynchronizations.get(userId) === run)
        activeSynchronizations.delete(userId);
    },
  );
  return run;
}

async function synchronizePendingEntriesInternal(
  userId: string,
  dependencies: EntrySyncDependencies,
): Promise<SyncRunResult> {
  const now = dependencies.now ?? (() => new Date());
  const queued = await dependencies.repository.getPendingMutations(userId);
  let synchronized = 0;
  let failed = 0;

  for (let index = 0; index < queued.length; index += 1) {
    const mutation = queued[index];
    if (!mutation) break;

    if (isInitialEntry(mutation) && supportsInitialEntryBatches(dependencies.remote)) {
      const batch: EntryMutation[] = [];
      for (
        let batchIndex = index;
        batchIndex < queued.length && batch.length < INITIAL_ENTRY_BATCH_SIZE;
        batchIndex += 1
      ) {
        const candidate = queued[batchIndex];
        if (!candidate) break;
        if (!isInitialEntry(candidate)) break;
        batch.push(candidate);
      }
      const attemptedAt = now().toISOString();
      await Promise.all(
        batch.map((item) =>
          dependencies.repository.markMutationProcessing(item.id, attemptedAt),
        ),
      );

      try {
        await dependencies.remote.writeInitialEntries(
          batch.map((item) => item.entry),
        );
        await Promise.all(
          batch.map((item) => dependencies.repository.acknowledgeMutation(item.id)),
        );
        synchronized += batch.length;
        index += batch.length - 1;
        continue;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown synchronization error.';
        await Promise.all(
          batch.map((item) =>
            dependencies.repository.failMutation(item.id, attemptedAt, message),
          ),
        );
        failed += batch.length;
        break;
      }
    }

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
    const cursor = dependencies.repository.getSyncMetadata
      ? await dependencies.repository.getSyncMetadata(syncCursorKey(userId))
      : (dependencies.lastPulledAt ?? null);
    const remoteEntries = await dependencies.reader.pullChanges(
      cursor,
    );

    for (const entry of remoteEntries) {
      if (await dependencies.repository.applyRemote(entry)) pulled += 1;
    }

    const newestUpdatedAt = remoteEntries.reduce<string | null>(
      (newest, entry) =>
        !newest || entry.updatedAt > newest ? entry.updatedAt : newest,
      cursor,
    );
    if (newestUpdatedAt && dependencies.repository.setSyncMetadata) {
      await dependencies.repository.setSyncMetadata(
        syncCursorKey(userId),
        newestUpdatedAt,
      );
    }
  }

  return { attempted: synchronized + failed, synchronized, failed, pulled };
}
