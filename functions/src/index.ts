import { initializeApp } from 'firebase-admin/app';
import { getFirestore, type DocumentSnapshot } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger, setGlobalOptions } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/https';
import { onSchedule } from 'firebase-functions/scheduler';

import { nextReminderOccurrence, type ReminderSchedule } from './schedule.js';

initializeApp();
setGlobalOptions({ maxInstances: 10, region: 'us-central1' });

const database = getFirestore();
const leaseDurationMilliseconds = 5 * 60 * 1000;
const dueReminderLimit = 250;

interface ReminderDocument extends ReminderSchedule {
  enabled: boolean;
  id: string;
  lastSentAt: string | null;
  message: string;
  nextFireAt: string | null;
  userId: string;
  dispatchKey?: string | null;
  dispatchLeaseUntil?: string | null;
}

interface PushSubscriptionDocument {
  disabledAt: string | null;
  id: string;
  token: string;
  userId: string;
}

/** One shared per-minute scheduler processes every user's due reminders. */
export const dispatchDueReminders = onSchedule(
  { schedule: 'every 1 minutes', timeZone: 'Etc/UTC' },
  async () => {
    const now = new Date();
    const nowIso = now.toISOString();
    const due = await database
      .collectionGroup('reminders')
      .where('enabled', '==', true)
      .where('nextFireAt', '<=', nowIso)
      .orderBy('nextFireAt', 'asc')
      .limit(dueReminderLimit)
      .get();

    await Promise.all(
      due.docs.map((snapshot) => dispatchReminder(snapshot, now, nowIso)),
    );
    logger.info('Processed due mood reminders.', { count: due.size });
  },
);

/** Allows an authenticated user to test the registered devices they own. */
export const sendTestReminder = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before sending a test.');
  }

  const userId = request.auth.uid;
  const requestedDeviceId = readOptionalDeviceId(request.data);
  const subscriptions = await activeSubscriptions(userId, requestedDeviceId);
  const delivery = await sendPush(subscriptions, {
    body: 'This is a test reminder from Mood Tracker.',
    dispatchKey: `test:${Date.now()}`,
    reminderId: 'test-reminder',
    tag: `mood-reminder-test-${userId}`,
    title: 'Mood Tracker',
    url: '/',
  });
  await disableInvalidSubscriptions(
    subscriptions,
    delivery.invalidIds,
    new Date(),
  );

  return {
    failed: subscriptions.length - delivery.deliveredTo,
    sent: delivery.deliveredTo,
  };
});

async function dispatchReminder(
  snapshot: DocumentSnapshot,
  now: Date,
  nowIso: string,
) {
  const reminder = snapshot.data() as ReminderDocument | undefined;
  if (!reminder || !reminder.enabled || !reminder.nextFireAt) return;
  if (reminder.nextFireAt > nowIso || isLeased(reminder, nowIso)) return;

  const dispatchKey = `${snapshot.id}:${reminder.nextFireAt}`;
  const claimed = await database.runTransaction(async (transaction) => {
    const currentSnapshot = await transaction.get(snapshot.ref);
    const current = currentSnapshot.data() as ReminderDocument | undefined;
    if (
      !current ||
      !current.enabled ||
      !current.nextFireAt ||
      current.nextFireAt > nowIso ||
      isLeased(current, nowIso)
    ) {
      return false;
    }
    transaction.update(snapshot.ref, {
      dispatchKey,
      dispatchLeaseUntil: new Date(
        now.getTime() + leaseDurationMilliseconds,
      ).toISOString(),
    });
    return true;
  });
  if (!claimed) return;

  try {
    const subscriptions = await activeSubscriptions(reminder.userId);
    const delivery = await sendPush(
      subscriptions,
      reminderPayload(reminder, dispatchKey),
    );
    await disableInvalidSubscriptions(subscriptions, delivery.invalidIds, now);

    await database.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(snapshot.ref);
      const current = currentSnapshot.data() as ReminderDocument | undefined;
      if (!current || current.dispatchKey !== dispatchKey) return;
      transaction.update(snapshot.ref, {
        dispatchLeaseUntil: null,
        lastSentAt: nowIso,
        nextFireAt: nextReminderOccurrence(current, now),
      });
    });
  } catch (error) {
    logger.error('Unable to dispatch mood reminder.', {
      error,
      reminderId: snapshot.id,
    });
    // Keep the short lease: concurrent schedulers cannot duplicate a send, and a
    // later invocation can retry after the lease expires.
  }
}

function isLeased(reminder: ReminderDocument, nowIso: string) {
  return Boolean(
    reminder.dispatchLeaseUntil && reminder.dispatchLeaseUntil > nowIso,
  );
}

async function activeSubscriptions(userId: string, deviceId?: string) {
  let query = database
    .collection('users')
    .doc(userId)
    .collection('pushSubscriptions')
    .where('disabledAt', '==', null);
  if (deviceId) query = query.where('id', '==', deviceId);
  const snapshot = await query.get();
  return snapshot.docs
    .map((document) => document.data() as PushSubscriptionDocument)
    .filter(
      (subscription) => subscription.userId === userId && subscription.token,
    );
}

function reminderPayload(
  reminder: Pick<ReminderDocument, 'id' | 'message' | 'userId'>,
  dispatchKey: string,
) {
  return {
    body: reminder.message || 'How are you feeling right now?',
    dispatchKey,
    reminderId: reminder.id,
    tag: `mood-reminder-${reminder.id}`,
    title: 'Mood Tracker',
    url: '/',
  };
}

async function sendPush(
  subscriptions: PushSubscriptionDocument[],
  data: Record<string, string>,
) {
  if (!subscriptions.length)
    return { deliveredTo: 0, invalidIds: [] as string[] };
  const response = await getMessaging().sendEachForMulticast({
    data,
    tokens: subscriptions.map((subscription) => subscription.token),
  });
  const invalidIds = response.responses.flatMap((result, index) => {
    const code = result.error?.code;
    return code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token'
      ? [subscriptions[index]!.id]
      : [];
  });
  return { deliveredTo: response.successCount, invalidIds };
}

async function disableInvalidSubscriptions(
  subscriptions: PushSubscriptionDocument[],
  invalidIds: string[],
  now: Date,
) {
  if (!invalidIds.length) return;
  const invalidIdSet = new Set(invalidIds);
  const batch = database.batch();
  subscriptions
    .filter((subscription) => invalidIdSet.has(subscription.id))
    .forEach((subscription) => {
      batch.update(
        database
          .collection('users')
          .doc(subscription.userId)
          .collection('pushSubscriptions')
          .doc(subscription.id),
        { disabledAt: now.toISOString() },
      );
    });
  await batch.commit();
}

function readOptionalDeviceId(data: unknown) {
  if (!data || typeof data !== 'object' || !('deviceId' in data)) {
    return undefined;
  }
  const deviceId = data.deviceId;
  if (deviceId === undefined) return undefined;
  if (typeof deviceId !== 'string' || !deviceId) {
    throw new HttpsError('invalid-argument', 'deviceId must be a string.');
  }
  return deviceId;
}
