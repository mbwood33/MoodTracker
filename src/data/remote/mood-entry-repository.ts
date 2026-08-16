import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  writeBatch,
  where,
  type Firestore,
} from 'firebase/firestore';

import { moodEntrySchema, type MoodEntry } from '@/domain';

import { getFirebaseServices } from './firebase';

export type RemoteMoodEntry = MoodEntry;

export type RemotePushResult =
  | { status: 'applied'; entry: RemoteMoodEntry }
  | { status: 'conflict'; message: string };

export class RemoteConfigurationError extends Error {
  constructor() {
    super(
      'Firebase is not configured. Set the complete public Firebase configuration.',
    );
    this.name = 'RemoteConfigurationError';
  }
}

class RemoteConflictError extends Error {}

/** Firebase transport using one private moodEntries subcollection per user. */
export class FirebaseMoodEntryRepository {
  constructor(
    private readonly firestore: Firestore | null = getFirebaseServices()
      ?.firestore ?? null,
  ) {}

  async push(
    candidate: RemoteMoodEntry,
    expectedRevision: number,
  ): Promise<RemotePushResult> {
    const firestore = this.requireFirestore();
    this.assertAuthenticatedOwner(candidate.userId);
    const parsed = moodEntrySchema.parse(candidate);
    const reference = doc(
      firestore,
      'users',
      parsed.userId,
      'moodEntries',
      parsed.id,
    );

    try {
      const entry = await runTransaction(firestore, async (transaction) => {
        const snapshot = await transaction.get(reference);

        if (!snapshot.exists()) {
          if (expectedRevision !== 0 || parsed.revision !== 0) {
            throw new RemoteConflictError(
              `Entry does not exist at revision ${expectedRevision}.`,
            );
          }
          transaction.set(reference, parsed);
          return parsed;
        }

        const current = moodEntrySchema.parse(snapshot.data());
        if (current.clientMutationId === parsed.clientMutationId)
          return current;
        if (
          current.revision !== expectedRevision ||
          parsed.revision !== current.revision + 1
        ) {
          throw new RemoteConflictError(
            `Entry changed remotely; expected revision ${expectedRevision}, found ${current.revision}.`,
          );
        }

        transaction.set(reference, parsed);
        return parsed;
      });

      return { status: 'applied', entry };
    } catch (error) {
      if (error instanceof RemoteConflictError) {
        return { status: 'conflict', message: error.message };
      }
      const message = error instanceof Error ? error.message : 'Unknown error.';
      throw new Error(`Unable to synchronize mood entry: ${message}`);
    }
  }

  async write(entry: MoodEntry): Promise<void> {
    const result = await this.push(entry, Math.max(0, entry.revision - 1));
    if (result.status === 'conflict') throw new Error(result.message);
  }

  /**
   * Commits newly-created entries without a read per document. The sync runner
   * only uses this for revision-zero entries, whose UUIDs are generated locally.
   */
  async writeInitialEntries(entries: readonly MoodEntry[]): Promise<void> {
    if (entries.length === 0) return;
    const firestore = this.requireFirestore();
    const batch = writeBatch(firestore);

    for (const candidate of entries) {
      this.assertAuthenticatedOwner(candidate.userId);
      const parsed = moodEntrySchema.parse(candidate);
      if (parsed.revision !== 0) {
        throw new Error('Only newly-created entries can be batch synchronized.');
      }
      batch.set(
        doc(firestore, 'users', parsed.userId, 'moodEntries', parsed.id),
        parsed,
      );
    }

    await batch.commit();
  }

  async pullChanges(updatedAfter: string | null): Promise<MoodEntry[]> {
    const firestore = this.requireFirestore();
    const userId = this.authenticatedUserId();
    const entries = collection(firestore, 'users', userId, 'moodEntries');
    const changes = updatedAfter
      ? query(
          entries,
          where('updatedAt', '>', updatedAfter),
          orderBy('updatedAt', 'asc'),
        )
      : query(entries, orderBy('updatedAt', 'asc'));

    try {
      const snapshot = await getDocs(changes);
      return snapshot.docs.map((entry) => moodEntrySchema.parse(entry.data()));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error.';
      throw new Error(`Unable to retrieve mood entry changes: ${message}`);
    }
  }

  private assertAuthenticatedOwner(userId: string): void {
    if (this.authenticatedUserId() !== userId) {
      throw new Error('Entry owner must be the authenticated Firebase user.');
    }
  }

  private authenticatedUserId(): string {
    const user = getFirebaseServices()?.auth.currentUser;
    if (!user) throw new Error('Authentication is required.');
    return user.uid;
  }

  private requireFirestore(): Firestore {
    if (!this.firestore) throw new RemoteConfigurationError();
    return this.firestore;
  }
}
