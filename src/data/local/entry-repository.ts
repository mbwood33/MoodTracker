import Dexie from 'dexie';

import type { MoodEntry } from '@/domain';

import {
  type EntryMutation,
  type MoodTrackerDatabase,
  getLocalDatabase,
} from './mood-tracker-db';

export interface LocalEntryRepository {
  save(entry: MoodEntry): Promise<void>;
  applyRemote(entry: MoodEntry): Promise<boolean>;
  get(entryId: string): Promise<MoodEntry | undefined>;
  listForUser(userId: string, includeDeleted?: boolean): Promise<MoodEntry[]>;
  getPendingMutations(userId: string): Promise<EntryMutation[]>;
  markMutationProcessing(
    mutationId: string,
    attemptedAt: string,
  ): Promise<void>;
  acknowledgeMutation(mutationId: string): Promise<void>;
  failMutation(
    mutationId: string,
    attemptedAt: string,
    error: string,
  ): Promise<void>;
}

export class DexieLocalEntryRepository implements LocalEntryRepository {
  constructor(
    private readonly database: MoodTrackerDatabase = getLocalDatabase(),
  ) {}

  async save(entry: MoodEntry): Promise<void> {
    const mutation: EntryMutation = {
      id: entry.clientMutationId,
      clientMutationId: entry.clientMutationId,
      userId: entry.userId,
      entryId: entry.id,
      operation: entry.deletedAt ? 'delete' : 'upsert',
      entry,
      status: 'pending',
      attemptCount: 0,
      createdAt: entry.updatedAt,
      lastAttemptAt: null,
      lastError: null,
    };

    await this.database.transaction(
      'rw',
      this.database.moodEntries,
      this.database.entryMutations,
      async () => {
        await this.database.moodEntries.put(entry);
        await this.database.entryMutations.put(mutation);
      },
    );
  }

  /**
   * Applies a server copy only when it cannot overwrite a local queued change.
   * Returning false means the local-first copy remains the conflict candidate.
   */
  async applyRemote(entry: MoodEntry): Promise<boolean> {
    return this.database.transaction(
      'rw',
      this.database.moodEntries,
      this.database.entryMutations,
      async () => {
        const pendingCount = await this.database.entryMutations
          .where('entryId')
          .equals(entry.id)
          .count();

        if (pendingCount > 0) return false;

        const local = await this.database.moodEntries.get(entry.id);
        if (
          local &&
          (local.revision > entry.revision ||
            (local.revision === entry.revision &&
              local.updatedAt.localeCompare(entry.updatedAt) >= 0))
        ) {
          return false;
        }

        await this.database.moodEntries.put(entry);
        return true;
      },
    );
  }

  get(entryId: string): Promise<MoodEntry | undefined> {
    return this.database.moodEntries.get(entryId);
  }

  async listForUser(
    userId: string,
    includeDeleted = false,
  ): Promise<MoodEntry[]> {
    const entries = await this.database.moodEntries
      .where('[userId+occurredAtUtc]')
      .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
      .reverse()
      .toArray();

    return includeDeleted
      ? entries
      : entries.filter((entry) => entry.deletedAt === null);
  }

  async getPendingMutations(userId: string): Promise<EntryMutation[]> {
    const [pending, failed, processing] = await Promise.all([
      this.database.entryMutations
        .where('[userId+status]')
        .equals([userId, 'pending'])
        .toArray(),
      this.database.entryMutations
        .where('[userId+status]')
        .equals([userId, 'failed'])
        .toArray(),
      // A browser can close between marking a mutation processing and receiving
      // the server response. Treat it as retryable on the next run.
      this.database.entryMutations
        .where('[userId+status]')
        .equals([userId, 'processing'])
        .toArray(),
    ]);

    return [...pending, ...failed, ...processing].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );
  }

  async markMutationProcessing(
    mutationId: string,
    attemptedAt: string,
  ): Promise<void> {
    await this.database.entryMutations.update(mutationId, (mutation) => {
      if (!mutation) return;
      mutation.status = 'processing';
      mutation.attemptCount += 1;
      mutation.lastAttemptAt = attemptedAt;
      mutation.lastError = null;
    });
  }

  acknowledgeMutation(mutationId: string): Promise<void> {
    return this.database.entryMutations.delete(mutationId);
  }

  async failMutation(
    mutationId: string,
    attemptedAt: string,
    error: string,
  ): Promise<void> {
    await this.database.entryMutations.update(mutationId, (mutation) => {
      if (!mutation) return;
      mutation.status = 'failed';
      mutation.lastAttemptAt = attemptedAt;
      mutation.lastError = error;
    });
  }
}
