import { readFile } from 'node:fs/promises';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';

const projectId = 'demo-mood-tracker';
const ownerId = 'firebase-owner-uid';
const entryId = '00000000-0000-4000-8000-000000000001';

let environment: RulesTestEnvironment;

function entry(revision = 0) {
  return {
    id: entryId,
    userId: ownerId,
    moodRating: 4,
    energyRating: null,
    notePlainText: 'A calm afternoon.',
    occurredAtUtc: '2026-08-05T18:30:00.000Z',
    occurredTimeZone: 'America/Chicago',
    occurredLocalDate: '2026-08-05',
    createdAt: '2026-08-05T18:30:00.000Z',
    updatedAt: `2026-08-05T18:3${revision}:00.000Z`,
    deletedAt: null,
    revision,
    clientMutationId: `00000000-0000-4000-8000-00000000000${revision + 2}`,
  };
}

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile('firestore.rules', 'utf8') },
  });
});

afterEach(async () => environment.clearFirestore());
afterAll(async () => environment.cleanup());

describe('Firestore ownership and entry invariants', () => {
  it('lets an owner create and read a valid mood entry', async () => {
    const database = environment.authenticatedContext(ownerId).firestore();
    const reference = doc(database, 'users', ownerId, 'moodEntries', entryId);

    await assertSucceeds(setDoc(reference, entry()));
    await assertSucceeds(getDoc(reference));
  });

  it('denies another user access to an owner entry', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'users', ownerId, 'moodEntries', entryId),
        entry(),
      );
    });
    const intruder = environment
      .authenticatedContext('different-firebase-uid')
      .firestore();

    await assertFails(
      getDoc(doc(intruder, 'users', ownerId, 'moodEntries', entryId)),
    );
  });

  it('rejects invalid mood values and skipped revisions', async () => {
    const database = environment.authenticatedContext(ownerId).firestore();
    const reference = doc(database, 'users', ownerId, 'moodEntries', entryId);

    await assertFails(setDoc(reference, { ...entry(), moodRating: 6 }));
    await assertSucceeds(setDoc(reference, entry()));
    await assertFails(setDoc(reference, entry(2)));
    await assertSucceeds(setDoc(reference, entry(1)));
  });
});
