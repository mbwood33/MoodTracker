import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import {
  connectStorageEmulator,
  getStorage,
  type FirebaseStorage,
} from 'firebase/storage';

import { env } from '@/config/env';

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
}

let services: FirebaseServices | undefined;
let emulatorsConnected = false;

export function isFirebaseConfigured(): boolean {
  return Boolean(env.VITE_FIREBASE_API_KEY);
}

/** Returns singleton Firebase services only when the complete public config exists. */
export function getFirebaseServices(): FirebaseServices | null {
  if (!isFirebaseConfigured()) return null;
  if (services) return services;

  const app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: env.VITE_FIREBASE_API_KEY,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: env.VITE_FIREBASE_APP_ID,
      });

  services = {
    app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    storage: getStorage(app),
  };

  if (env.VITE_USE_FIREBASE_EMULATORS && !emulatorsConnected) {
    connectAuthEmulator(services.auth, 'http://127.0.0.1:9099', {
      disableWarnings: true,
    });
    connectFirestoreEmulator(services.firestore, '127.0.0.1', 8080);
    connectStorageEmulator(services.storage, '127.0.0.1', 9199);
    emulatorsConnected = true;
  }

  return services;
}
