import Dexie, { type EntityTable } from 'dexie';

import type { MoodEntry } from '@/domain';

export type MutationOperation = 'upsert' | 'delete';
export type MutationStatus = 'pending' | 'processing' | 'failed';

/** A durable outbox record. Payload is a full entry snapshot for retry safety. */
export interface EntryMutation {
  id: string;
  clientMutationId: string;
  userId: string;
  entryId: string;
  operation: MutationOperation;
  entry: MoodEntry;
  status: MutationStatus;
  attemptCount: number;
  createdAt: string;
  lastAttemptAt: string | null;
  lastError: string | null;
}

export interface SyncMetadata {
  key: string;
  value: string;
  updatedAt: string;
}
export interface PendingPhotoUpload {
  id: string;
  entryId: string;
  userId: string;
  file: Blob;
  fileName: string;
  contentType: string;
  createdAt: string;
}

export class MoodTrackerDatabase extends Dexie {
  moodEntries!: EntityTable<MoodEntry, 'id'>;
  entryMutations!: EntityTable<EntryMutation, 'id'>;
  syncMetadata!: EntityTable<SyncMetadata, 'key'>;
  pendingPhotoUploads!: EntityTable<PendingPhotoUpload, 'id'>;

  constructor(name = 'mood-tracker') {
    super(name);

    // Version 1 reserves indexes for the Phase 1 timeline and per-user outbox.
    // Future versions must add Dexie migrations rather than rewrite existing data.
    this.version(1).stores({
      moodEntries:
        'id, userId, occurredAtUtc, occurredLocalDate, deletedAt, [userId+occurredAtUtc], [userId+occurredLocalDate]',
      entryMutations:
        'id, userId, entryId, status, createdAt, [userId+status], [entryId+createdAt]',
      syncMetadata: 'key',
    });
    this.version(2).stores({
      moodEntries: 'id, userId, occurredAtUtc, occurredLocalDate, deletedAt, [userId+occurredAtUtc], [userId+occurredLocalDate]',
      entryMutations: 'id, userId, entryId, status, createdAt, [userId+status], [entryId+createdAt]',
      syncMetadata: 'key',
      pendingPhotoUploads: 'id, entryId, userId, createdAt, [userId+createdAt]',
    });
  }
}

let browserDatabase: MoodTrackerDatabase | undefined;

export function getLocalDatabase(): MoodTrackerDatabase {
  browserDatabase ??= new MoodTrackerDatabase();
  return browserDatabase;
}
