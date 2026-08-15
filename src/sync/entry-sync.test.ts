import { describe, expect, it } from 'vitest';

import type { EntryMutation, LocalEntryRepository } from '@/data/local';
import type { MoodEntry } from '@/domain';

import {
  synchronizePendingEntries,
  type RemoteEntryWriter,
} from './entry-sync';

const entry: MoodEntry = {
  id: '00000000-0000-4000-8000-000000000001',
  userId: '00000000-0000-4000-8000-000000000002',
  moodRating: 3,
  energyRating: null,
  noteJson: null,
  notePlainText: '',
  occurredAtUtc: '2026-08-05T18:30:00.000Z',
  occurredTimeZone: 'America/Chicago',
  occurredLocalDate: '2026-08-05',
  createdAt: '2026-08-05T18:30:00.000Z',
  updatedAt: '2026-08-05T18:30:00.000Z',
  deletedAt: null,
  revision: 0,
  clientMutationId: '00000000-0000-4000-8000-000000000003',
};

function queuedMutation(id: string): EntryMutation {
  return {
    id,
    clientMutationId: entry.clientMutationId,
    userId: entry.userId,
    entryId: entry.id,
    operation: 'upsert',
    entry,
    status: 'pending',
    attemptCount: 0,
    createdAt: entry.createdAt,
    lastAttemptAt: null,
    lastError: null,
  };
}

describe('entry synchronization', () => {
  it('acknowledges successfully written local mutations', async () => {
    const calls: string[] = [];
    const repository: LocalEntryRepository = {
      save: async () => undefined,
      applyRemote: async () => false,
      get: async () => undefined,
      listForUser: async () => [],
      getPendingMutations: async () => [queuedMutation('mutation-1')],
      markMutationProcessing: async (id) => {
        calls.push(`processing:${id}`);
      },
      acknowledgeMutation: async (id) => {
        calls.push(`acknowledged:${id}`);
      },
      failMutation: async () => undefined,
    };
    const remote: RemoteEntryWriter = { write: async () => undefined };

    await expect(
      synchronizePendingEntries(entry.userId, { repository, remote }),
    ).resolves.toEqual({
      attempted: 1,
      synchronized: 1,
      failed: 0,
      pulled: 0,
    });
    expect(calls).toEqual(['processing:mutation-1', 'acknowledged:mutation-1']);
  });

  it('retains a failed mutation and stops to preserve write ordering', async () => {
    const failed: string[] = [];
    const repository: LocalEntryRepository = {
      save: async () => undefined,
      applyRemote: async () => false,
      get: async () => undefined,
      listForUser: async () => [],
      getPendingMutations: async () => [
        queuedMutation('mutation-1'),
        queuedMutation('mutation-2'),
      ],
      markMutationProcessing: async () => undefined,
      acknowledgeMutation: async () => undefined,
      failMutation: async (id) => {
        failed.push(id);
      },
    };
    const remote: RemoteEntryWriter = {
      write: async () => Promise.reject(new Error('Offline')),
    };

    await expect(
      synchronizePendingEntries(entry.userId, { repository, remote }),
    ).resolves.toEqual({
      attempted: 1,
      synchronized: 0,
      failed: 1,
      pulled: 0,
    });
    expect(failed).toEqual(['mutation-1']);
  });

  it('hydrates remote entries only after local queued writes are safe', async () => {
    const applied: string[] = [];
    const repository: LocalEntryRepository = {
      save: async () => undefined,
      applyRemote: async (remoteEntry) => {
        applied.push(remoteEntry.id);
        return true;
      },
      get: async () => undefined,
      listForUser: async () => [],
      getPendingMutations: async () => [],
      markMutationProcessing: async () => undefined,
      acknowledgeMutation: async () => undefined,
      failMutation: async () => undefined,
    };

    const result = await synchronizePendingEntries(entry.userId, {
      repository,
      remote: { write: async () => undefined },
      reader: { pullChanges: async () => [entry] },
    });

    expect(result).toEqual({
      attempted: 0,
      synchronized: 0,
      failed: 0,
      pulled: 1,
    });
    expect(applied).toEqual([entry.id]);
  });
});
