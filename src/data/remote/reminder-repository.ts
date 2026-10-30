import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  type Firestore,
} from 'firebase/firestore';

import { reminderSchema, type Reminder } from '@/domain';

import { getFirebaseServices } from './firebase';

export class FirebaseReminderRepository {
  constructor(
    private readonly firestore: Firestore | null = getFirebaseServices()
      ?.firestore ?? null,
    private readonly getUserId: () => string = () => {
      const user = getFirebaseServices()?.auth.currentUser;
      if (!user) throw new Error('Authentication is required.');
      return user.uid;
    },
  ) {}

  async list(): Promise<Reminder[]> {
    const userId = this.getUserId();
    const snapshot = await getDocs(
      collection(this.requireFirestore(), 'users', userId, 'reminders'),
    );
    return snapshot.docs
      .map((item) => reminderSchema.parse(item.data()))
      .sort((left, right) => {
        if (left.enabled !== right.enabled) return left.enabled ? -1 : 1;
        return (left.nextFireAt ?? '').localeCompare(right.nextFireAt ?? '');
      });
  }

  async save(reminder: Reminder): Promise<void> {
    const userId = this.getUserId();
    const parsed = reminderSchema.parse(reminder);
    if (parsed.userId !== userId) {
      throw new Error(
        'Reminder owner must be the authenticated Firebase user.',
      );
    }
    await setDoc(
      doc(this.requireFirestore(), 'users', userId, 'reminders', parsed.id),
      parsed,
      { merge: true },
    );
  }

  async remove(reminderId: string): Promise<void> {
    const userId = this.getUserId();
    await deleteDoc(
      doc(this.requireFirestore(), 'users', userId, 'reminders', reminderId),
    );
  }

  private requireFirestore(): Firestore {
    if (!this.firestore) {
      throw new Error(
        'Firebase is not configured. Set the complete public Firebase configuration.',
      );
    }
    return this.firestore;
  }
}
