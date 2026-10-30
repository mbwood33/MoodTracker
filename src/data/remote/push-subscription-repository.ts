import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
} from 'firebase/messaging';

import { env } from '@/config/env';
import { getFirebaseServices } from '@/data/remote/firebase';

const deviceIdKey = 'mood-tracker-push-device-id';

export type PushNotificationCapability =
  { available: true } | { available: false; reason: string };

export type PushSubscriptionRecord = {
  id: string;
  userId: string;
  token: string;
  deviceName: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
  disabledAt: null;
};

export async function getPushNotificationCapability(): Promise<PushNotificationCapability> {
  if (!window.isSecureContext) {
    return {
      available: false,
      reason: 'Notifications require a secure HTTPS connection.',
    };
  }
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    return {
      available: false,
      reason: 'This browser does not support push notifications.',
    };
  }
  if (Notification.permission === 'denied') {
    return {
      available: false,
      reason:
        'Notifications are blocked in this browser. Allow them in browser or device settings, then try again.',
    };
  }
  if (!env.VITE_FIREBASE_VAPID_KEY) {
    return {
      available: false,
      reason: 'Push notifications are not configured for this deployment yet.',
    };
  }
  if (!(await isSupported())) {
    return {
      available: false,
      reason: 'This browser does not support Firebase messaging.',
    };
  }
  return { available: true };
}

export async function enablePushNotifications(userId: string) {
  const capability = await getPushNotificationCapability();
  if (!capability.available) throw new Error(capability.reason);

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const serviceWorkerRegistration = await navigator.serviceWorker.ready;
  const messaging = getMessaging(services.app);
  const token = await getToken(messaging, {
    vapidKey: env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration,
  });
  if (!token)
    throw new Error('The browser did not provide a push subscription.');

  const now = new Date().toISOString();
  const deviceId = getDeviceId();
  const subscription = doc(
    services.firestore,
    'users',
    userId,
    'pushSubscriptions',
    deviceId,
  );
  const existing = await getDoc(subscription);
  const existingCreatedAt = existing.data()?.createdAt;
  const record: PushSubscriptionRecord = {
    id: deviceId,
    userId,
    token,
    deviceName: getDeviceName(),
    createdAt: typeof existingCreatedAt === 'string' ? existingCreatedAt : now,
    updatedAt: now,
    lastUsedAt: now,
    disabledAt: null,
  };
  await setDoc(subscription, record, { merge: true });
  return record;
}

export async function disablePushNotifications(userId: string) {
  const services = getFirebaseServices();
  if (!services) return;

  const deviceId = getExistingDeviceId();
  const now = new Date().toISOString();
  if (deviceId) {
    const subscription = doc(
      services.firestore,
      'users',
      userId,
      'pushSubscriptions',
      deviceId,
    );
    if ((await getDoc(subscription)).exists()) {
      await updateDoc(subscription, {
        disabledAt: now,
        updatedAt: now,
        lastUsedAt: now,
      });
    }
  }

  if ((await isSupported()) && 'serviceWorker' in navigator) {
    try {
      await deleteToken(getMessaging(services.app));
    } catch {
      // The server-side record is already disabled. Local token cleanup is
      // best-effort so an offline browser can still turn reminders off.
    }
  }
}

export async function isPushNotificationsEnabled(userId: string) {
  if (window.Notification?.permission !== 'granted') return false;
  const services = getFirebaseServices();
  const deviceId = getExistingDeviceId();
  if (!services || !deviceId) return false;

  const snapshot = await getDoc(
    doc(services.firestore, 'users', userId, 'pushSubscriptions', deviceId),
  );
  if (!snapshot.exists()) return false;
  const record = snapshot.data();
  return (
    record.userId === userId &&
    typeof record.token === 'string' &&
    record.token.length > 0 &&
    record.disabledAt === null
  );
}

export async function showPushNotificationTest() {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const sendTestReminder = httpsCallable<
    { deviceId: string },
    { failed: number; sent: number }
  >(services.functions, 'sendTestReminder');
  const result = await sendTestReminder({ deviceId: getDeviceId() });
  if (result.data.sent === 0) {
    throw new Error(
      'No active notification subscription was found for this device.',
    );
  }
}

function getDeviceId() {
  const existingId = getExistingDeviceId();
  if (existingId) return existingId;

  const deviceId = window.crypto.randomUUID();
  window.localStorage.setItem(deviceIdKey, deviceId);
  return deviceId;
}

function getExistingDeviceId() {
  return window.localStorage.getItem(deviceIdKey);
}

function getDeviceName() {
  const platform =
    window.navigator.userAgentData?.platform ?? window.navigator.platform;
  return platform ? `${platform} browser` : 'This browser';
}
