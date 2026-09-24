import { deleteApp, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  setDoc,
} from 'firebase/firestore';
import { afterAll, describe, expect, it } from 'vitest';

const projectId = 'demo-mood-tracker';
const app = initializeApp({
  apiKey: 'demo-api-key',
  appId: '1:000000000000:web:0000000000000000000000',
  authDomain: `${projectId}.firebaseapp.com`,
  projectId,
});
const auth = getAuth(app);
const firestore = getFirestore(app);

connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(firestore, '127.0.0.1', 8080);

afterAll(async () => {
  await signOut(auth);
  await deleteApp(app);
});

describe('local Firebase Auth and Firestore emulators', () => {
  it('creates an emulator account and persists an owner profile through Firestore rules', async () => {
    const email = `emulator-${crypto.randomUUID()}@example.test`;
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      'local-only-password',
    );
    const reference = doc(firestore, 'users', credential.user.uid);
    const profile = {
      displayName: 'Emulator user',
      email,
      timeZone: 'America/Chicago',
      locale: 'en-US',
      theme: 'system',
      weekStartDay: 0,
      createdAt: '2026-08-06T00:00:00.000Z',
      updatedAt: '2026-08-06T00:00:00.000Z',
    };

    await setDoc(reference, profile);

    const entryId = crypto.randomUUID();
    const entryReference = doc(
      firestore,
      'users',
      credential.user.uid,
      'moodEntries',
      entryId,
    );
    const entry = {
      id: entryId,
      userId: credential.user.uid,
      moodRating: 4,
      energyRating: null,
      noteJson: null,
      notePlainText: 'A calm afternoon.',
      activityTags: ['Walk', 'Outside'],
      photo: null,
      occurredAtUtc: '2026-08-06T00:00:00.000Z',
      occurredTimeZone: 'America/Chicago',
      occurredLocalDate: '2026-08-05',
      createdAt: '2026-08-06T00:00:00.000Z',
      updatedAt: '2026-08-06T00:00:00.000Z',
      deletedAt: null,
      revision: 0,
      clientMutationId: crypto.randomUUID(),
    };

    await setDoc(entryReference, entry);

    const snapshot = await getDoc(reference);
    const entrySnapshot = await getDoc(entryReference);
    expect(snapshot.exists()).toBe(true);
    expect(snapshot.data()).toEqual(profile);
    expect(entrySnapshot.exists()).toBe(true);
    expect(entrySnapshot.data()).toEqual(entry);
  });
});
