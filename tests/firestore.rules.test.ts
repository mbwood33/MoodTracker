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
const reminderId = '00000000-0000-4000-8000-000000000010';
const subscriptionId = '00000000-0000-4000-8000-000000000011';

let environment: RulesTestEnvironment;

function entry(revision = 0) {
  return {
    id: entryId,
    userId: ownerId,
    moodRating: 4,
    energyRating: null,
    noteJson: null,
    notePlainText: 'A calm afternoon.',
    activityTags: ['Walk', 'Outside'],
    photo: null,
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

function reminder() {
  return {
    id: reminderId,
    userId: ownerId,
    localTime: '09:00',
    daysOfWeek: [1, 3, 5],
    timeZone: 'America/Chicago',
    message: 'How are you feeling?',
    enabled: true,
    nextFireAt: '2026-08-07T14:00:00.000Z',
    createdAt: '2026-08-05T18:30:00.000Z',
    updatedAt: '2026-08-05T18:30:00.000Z',
    lastSentAt: null,
  };
}

function pushSubscription() {
  return {
    id: subscriptionId,
    userId: ownerId,
    token: 'example-fcm-token',
    deviceName: 'Chrome on Windows',
    createdAt: '2026-08-05T18:30:00.000Z',
    updatedAt: '2026-08-05T18:30:00.000Z',
    lastUsedAt: '2026-08-05T18:30:00.000Z',
    disabledAt: null,
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

  it('accepts the current entry payload with photo metadata', async () => {
    const database = environment.authenticatedContext(ownerId).firestore();
    const reference = doc(database, 'users', ownerId, 'moodEntries', entryId);

    await assertSucceeds(
      setDoc(reference, {
        ...entry(),
        photo: {
          id: '00000000-0000-4000-8000-000000000009',
          storagePath: `users/${ownerId}/entries/${entryId}/photo.jpg`,
        },
      }),
    );
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

describe('Reminder and push-subscription ownership', () => {
  it('lets an owner create a valid reminder and push subscription', async () => {
    const database = environment.authenticatedContext(ownerId).firestore();

    await assertSucceeds(
      setDoc(
        doc(database, 'users', ownerId, 'reminders', reminderId),
        reminder(),
      ),
    );
    await assertSucceeds(
      setDoc(
        doc(database, 'users', ownerId, 'pushSubscriptions', subscriptionId),
        pushSubscription(),
      ),
    );
  });

  it('rejects invalid reminder days and times', async () => {
    const database = environment.authenticatedContext(ownerId).firestore();
    const reference = doc(database, 'users', ownerId, 'reminders', reminderId);

    await assertFails(setDoc(reference, { ...reminder(), localTime: '25:00' }));
    await assertFails(setDoc(reference, { ...reminder(), daysOfWeek: [1, 1] }));
  });

  it('keeps reminder delivery metadata server-owned', async () => {
    const owner = environment.authenticatedContext(ownerId).firestore();
    const reference = doc(owner, 'users', ownerId, 'reminders', reminderId);

    await assertFails(
      setDoc(reference, {
        ...reminder(),
        dispatchKey: 'client-controlled',
      }),
    );
    await assertFails(
      setDoc(reference, {
        ...reminder(),
        lastSentAt: '2026-08-05T18:30:00.000Z',
      }),
    );

    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'users', ownerId, 'reminders', reminderId),
        {
          ...reminder(),
          dispatchKey: 'server-claim',
          dispatchLeaseUntil: '2026-08-05T18:35:00.000Z',
        },
      );
    });

    await assertSucceeds(
      setDoc(
        reference,
        {
          message: 'A user-editable message',
          updatedAt: '2026-08-05T18:31:00.000Z',
        },
        { merge: true },
      ),
    );
    await assertFails(
      setDoc(
        reference,
        { dispatchLeaseUntil: '2099-01-01T00:00:00.000Z' },
        { merge: true },
      ),
    );
  });

  it('denies another user access to reminders and device tokens', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const database = context.firestore();
      await setDoc(
        doc(database, 'users', ownerId, 'reminders', reminderId),
        reminder(),
      );
      await setDoc(
        doc(database, 'users', ownerId, 'pushSubscriptions', subscriptionId),
        pushSubscription(),
      );
    });
    const intruder = environment
      .authenticatedContext('different-firebase-uid')
      .firestore();

    await assertFails(
      getDoc(doc(intruder, 'users', ownerId, 'reminders', reminderId)),
    );
    await assertFails(
      getDoc(
        doc(intruder, 'users', ownerId, 'pushSubscriptions', subscriptionId),
      ),
    );
  });
});
