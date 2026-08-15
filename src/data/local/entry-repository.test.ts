import { afterEach, describe, expect, it } from 'vitest';

import { LocalFirstEntries } from '@/sync';

import { DexieLocalEntryRepository } from './entry-repository';
import { MoodTrackerDatabase } from './mood-tracker-db';

const databases: MoodTrackerDatabase[] = [];

function createDatabase() {
  const database = new MoodTrackerDatabase(
    `mood-tracker-test-${crypto.randomUUID()}`,
  );
  databases.push(database);
  return database;
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()));
});

describe('DexieLocalEntryRepository', () => {
  it('keeps a newly created entry and its mutation queue after reopening IndexedDB', async () => {
    const database = createDatabase();
    const repository = new DexieLocalEntryRepository(database);
    let identifier = 0;
    const entries = new LocalFirstEntries(repository, {
      clock: { now: () => new Date('2026-08-05T18:30:00.000Z') },
      identityFactory: {
        createId: () => {
          identifier += 1;
          return `00000000-0000-4000-8000-${String(identifier).padStart(12, '0')}`;
        },
      },
    });
    const userId = '00000000-0000-4000-8000-000000000099';

    const created = await entries.create({
      userId,
      moodRating: 4,
      notePlainText: 'A durable local entry.',
      occurredAtUtc: '2026-08-05T18:30:00.000Z',
      occurredTimeZone: 'America/Chicago',
      occurredLocalDate: '2026-08-05',
    });

    database.close();
    const reopened = new MoodTrackerDatabase(database.name);
    databases.push(reopened);
    const reopenedRepository = new DexieLocalEntryRepository(reopened);

    await expect(reopenedRepository.get(created.id)).resolves.toMatchObject({
      notePlainText: 'A durable local entry.',
      occurredLocalDate: '2026-08-05',
      occurredTimeZone: 'America/Chicago',
    });
    await expect(
      reopenedRepository.getPendingMutations(userId),
    ).resolves.toHaveLength(1);
  });

  it('soft-deletes locally without discarding the recoverable record', async () => {
    const repository = new DexieLocalEntryRepository(createDatabase());
    const entries = new LocalFirstEntries(repository, {
      identityFactory: { createId: () => crypto.randomUUID() },
    });
    const userId = '00000000-0000-4000-8000-000000000099';
    const created = await entries.create({
      userId,
      moodRating: 2,
      occurredAtUtc: '2026-08-05T18:30:00.000Z',
      occurredTimeZone: 'America/Chicago',
      occurredLocalDate: '2026-08-05',
    });

    await entries.remove(created.id);

    await expect(repository.listForUser(userId)).resolves.toEqual([]);
    await expect(repository.listForUser(userId, true)).resolves.toEqual([
      expect.objectContaining({
        id: created.id,
        deletedAt: expect.any(String),
      }),
    ]);
    await expect(repository.getPendingMutations(userId)).resolves.toHaveLength(
      2,
    );
  });

  it('persists a restored entry and enqueues its synchronization mutation', async () => {
    const database = createDatabase();
    const repository = new DexieLocalEntryRepository(database);
    const entries = new LocalFirstEntries(repository, {
      identityFactory: { createId: () => crypto.randomUUID() },
    });
    const userId = '00000000-0000-4000-8000-000000000099';
    const created = await entries.create({
      userId,
      moodRating: 2,
      occurredAtUtc: '2026-08-05T18:30:00.000Z',
      occurredTimeZone: 'America/Chicago',
      occurredLocalDate: '2026-08-05',
    });

    await entries.remove(created.id);
    const restored = await entries.restore(created.id);

    database.close();
    const reopened = new MoodTrackerDatabase(database.name);
    databases.push(reopened);
    const reopenedRepository = new DexieLocalEntryRepository(reopened);

    await expect(reopenedRepository.listForUser(userId)).resolves.toEqual([
      expect.objectContaining({ id: created.id, deletedAt: null }),
    ]);
    await expect(reopenedRepository.get(created.id)).resolves.toMatchObject({
      revision: restored.revision,
      clientMutationId: restored.clientMutationId,
      deletedAt: null,
    });
    await expect(
      reopenedRepository.getPendingMutations(userId),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: restored.clientMutationId,
          operation: 'upsert',
          entry: expect.objectContaining({ deletedAt: null }),
        }),
      ]),
    );
  });
});
