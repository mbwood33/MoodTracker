# Mood Tracker

A private, local-first mood-tracking PWA. Phase 1 provides account access,
five-point mood entries, optional plain-text notes and energy, past-entry
creation, soft deletion, a reverse-chronological timeline, durable IndexedDB
storage, and Firebase synchronization.

## Prerequisites

- Node.js 22 or newer
- npm 10 or newer
- Java 21 or newer for the Firebase Local Emulator Suite

## Start locally with Firebase emulators

```bash
npm install
copy .env.development.example .env.development
npm run firebase:emulators
```

In a second terminal:

```bash
npm run dev
```

The emulator command explicitly uses the safe `demo-mood-tracker` project ID.
A `demo-` project cannot reach live Firebase resources if an emulator is
missing. The default deployment target is `moodtracker-c90e3`, and the Emulator
Suite UI is at `http://127.0.0.1:4000`.

The unconfigured shell can also be explored without Firebase. Accounts and
cross-device synchronization require either the emulators or a configured live
Firebase web app.

## Connect a live Firebase project

1. Create or select a Firebase project and register a Web app.
2. Enable Email/Password in Authentication.
3. Create a Cloud Firestore database and a Cloud Storage bucket.
4. Copy `.env.production.example` to `.env.local` and fill in the public Web app
   configuration. Keep `VITE_USE_FIREBASE_EMULATORS=false`.
5. Confirm `moodtracker-c90e3` is the intended default project in `.firebaserc`.
6. Deploy rules and Hosting with `npm run firebase:deploy`.

Firebase web app configuration is public by design; access control is enforced
by `firestore.rules` and `storage.rules`. Never put service-account credentials
or other secrets in a `VITE_` variable.

## Commands

| Command                           | Purpose                                          |
| --------------------------------- | ------------------------------------------------ |
| `npm run dev`                     | Start Vite at `http://127.0.0.1:5173`            |
| `npm run build`                   | Type-check and create the production PWA bundle  |
| `npm run preview`                 | Serve the built bundle at port 4173              |
| `npm run lint`                    | Run ESLint, including accessibility rules        |
| `npm run format`                  | Format supported files with Prettier             |
| `npm run typecheck`               | Run strict TypeScript project checks             |
| `npm run test:run`                | Run Vitest once                                  |
| `npm run test:e2e`                | Run desktop and mobile Playwright projects       |
| `npm run check`                   | Run the local CI-equivalent checks except E2E    |
| `npm run firebase:emulators`      | Start Auth, Firestore, Storage, and Hosting      |
| `npm run firebase:deploy:rules`   | Deploy Firestore and Storage rules               |
| `npm run firebase:deploy:hosting` | Build and deploy Hosting only                    |
| `npm run firebase:deploy`         | Build and deploy all configured Firebase targets |

Install Playwright's Chromium browser once with
`npx playwright install chromium` before running E2E tests locally.

## Environment modes

Vite loads mode-specific environment files. Tracked examples document the
contract:

- `.env.development.example` targets the Local Emulator Suite.
- `.env.production.example` documents live deployment values.
- `.env.local` may override either mode on one machine and is ignored by Git.

All six `VITE_FIREBASE_*` browser configuration values must either be present
together or omitted together. `VITE_USE_FIREBASE_EMULATORS=true` redirects Auth,
Firestore, and Storage to localhost.

## Firebase data layout

```text
users/{uid}                              account profile
users/{uid}/moodEntries/{entryId}        private synchronized entries
users/{uid}/media/...                    private photos and voice memos
```

Dexie remains the immediate persistence boundary. Creating an entry never waits
for Firebase: the app writes to IndexedDB and its mutation outbox first, then a
Firestore transaction synchronizes it when online. Revision checks prevent a
newer remote edit from being overwritten silently.

## Project map

```text
src/
  app/              composition, providers, and routes
  components/       shared presentation and shadcn/ui components
  config/           validated public environment configuration
  data/local/       versioned Dexie stores and local entry repository
  data/remote/      Firebase boundary
  domain/           framework-independent types and calculations
  features/         feature-owned UI and orchestration
  hooks/            shared presentation hooks
  pages/            route entry points
  sync/             offline mutation queue and synchronization boundary
  styles/           global design tokens and theme styles
  test/             Vitest setup
e2e/                Playwright browser tests
firebase.json       Hosting and emulator configuration
firestore.rules     private document access and schema validation
storage.rules       private user-media access and validation
docs/architecture/  architecture decision record
```

See [Architecture decisions](docs/architecture/decisions.md) for the rationale
and dependency rules behind this structure.
