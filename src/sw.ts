/// <reference lib="webworker" />

import { getApps, initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { revision?: string | null; url: string }>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (Object.values(firebaseConfig).every(Boolean)) {
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  // Reminder notifications are data-only so this handler is the sole owner of
  // display behavior and a browser never creates a duplicate alert for one push.
  onBackgroundMessage(messaging, (payload) => {
    const data = payload.data ?? {};
    void self.registration.showNotification(data.title ?? 'Mood Tracker', {
      body: data.body ?? 'Take a moment to log how you are feeling.',
      badge: '/pwa-maskable.svg',
      icon: '/pwa-icon.svg',
      data: { url: data.url ?? '/' },
      tag: data.tag ?? `mood-reminder-${Date.now()}`,
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notificationData = event.notification.data as
    { url?: string } | undefined;
  const targetUrl = new URL(notificationData?.url ?? '/', self.location.origin)
    .href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        const existingClient = windowClients.find((client) =>
          client.url.startsWith(self.location.origin),
        );
        if (!existingClient) return self.clients.openWindow(targetUrl);
        return existingClient
          .navigate(targetUrl)
          .then((client) => client?.focus());
      }),
  );
});
