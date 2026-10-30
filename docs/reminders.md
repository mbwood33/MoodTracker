# Push reminders

Mood Tracker uses an installed PWA, Firebase Cloud Messaging (FCM), and one
shared Cloud Scheduler job to send reminders. A reminder is not a scheduler
job: users can create many reminders and subscribe several devices while the
backend runs a single function every minute.

## Required production setup

1. Upgrade the Firebase project to the Blaze plan. Cloud Functions and Cloud
   Scheduler require a linked billing account, although both have no-cost usage
   allowances.
2. In Firebase Console, open **Project settings → Cloud Messaging → Web
   configuration** and create a Web Push certificate (VAPID key pair).
3. Set `VITE_FIREBASE_VAPID_KEY` in the production hosting environment. It is
   public configuration, not a server secret.
4. Install function dependencies and deploy rules, indexes, and functions:

   ```powershell
   npm --prefix functions install
   npm --prefix functions run build
   firebase deploy --only firestore:rules,firestore:indexes,functions
   ```

5. On a phone, install the web app, sign in, then use the explicit **Enable
   notifications** action. iPhone and iPad require the PWA to be added to the
   Home Screen before notification permission is available.

## Data and privacy

All client-accessible data is stored below its owner:

- `users/{uid}/reminders/{reminderId}` stores local time, days, IANA timezone,
  optional text, and the next UTC delivery instant.
- `users/{uid}/pushSubscriptions/{deviceId}` stores an FCM registration token
  for one device.

Firestore rules restrict both collections to the authenticated owner. The
scheduled function runs with Admin privileges and is the only process that
performs cross-user due-reminder queries.

## Delivery behavior

`dispatchDueReminders` runs once per minute in UTC, finds due enabled
reminders through a collection-group index, claims each reminder with a
five-minute lease, and sends data-only FCM messages to all active devices.
The lease prevents overlapping scheduler executions from sending duplicates.
Invalid tokens are marked disabled. On successful delivery, the next occurrence
is calculated from the reminder's stored IANA timezone, so daylight-saving
transitions preserve the intended local schedule.

Push delivery is best-effort: device connectivity, notification permissions,
Focus/Do Not Disturb, and the browser or operating system can delay or suppress
a notification. The app must never use reminders for safety-critical alerts.

## Development and testing

Run the pure scheduling tests without Firebase credentials:

```powershell
npm --prefix functions install
npm --prefix functions test
```

Run Firestore rule tests from the repository root with the emulator:

```powershell
npm run test:rules
```

The Emulator Suite includes the Functions emulator on port `5001`. FCM does not
deliver to real browser devices from the emulator; use `sendTestReminder` after
deploying to a controlled Firebase project for a real-device test.
