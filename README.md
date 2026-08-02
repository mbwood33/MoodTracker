# Mood Tracker

A production-oriented foundation for a private, local-first mood-tracking PWA.
Phase 0 contains the application shell and engineering infrastructure only; it
does not yet create, store, or synchronize mood entries.

## Prerequisites

- Node.js 22 or newer
- npm 10 or newer
- Docker Desktop for the optional local Supabase stack

## Start locally

```bash
npm install
copy .env.development.example .env.development
npm run dev
```

The unconfigured application shell works without Supabase. When local Supabase
is running, copy its public API URL and publishable/anonymous key into
`.env.development`. Never place a service-role key in a `VITE_` variable.

## Commands

| Command                  | Purpose                                         |
| ------------------------ | ----------------------------------------------- |
| `npm run dev`            | Start Vite at `http://127.0.0.1:5173`           |
| `npm run build`          | Type-check and create the production PWA bundle |
| `npm run preview`        | Serve the built bundle at port 4173             |
| `npm run lint`           | Run ESLint, including accessibility rules       |
| `npm run format`         | Format supported files with Prettier            |
| `npm run typecheck`      | Run strict TypeScript project checks            |
| `npm run test:run`       | Run Vitest once                                 |
| `npm run test:e2e`       | Run desktop and mobile Playwright projects      |
| `npm run check`          | Run the local CI-equivalent checks except E2E   |
| `npm run supabase:start` | Start the Docker-based local backend            |
| `npm run supabase:reset` | Recreate local PostgreSQL from migrations       |

Install Playwright's Chromium browser once with
`npx playwright install chromium` before running E2E tests locally.

## Environment modes

Vite loads mode-specific environment files. Tracked examples document the
contract:

- `.env.development.example` targets local development.
- `.env.production.example` documents deployment values.
- `.env.local` may override either mode on one machine and is ignored by Git.

All browser-visible configuration uses the `VITE_` prefix and is validated by
Zod. Supabase URL and publishable key are optional in Phase 0, but must be set as
a pair once remote features are enabled.

## Project map

```text
src/
  app/              composition, providers, and routes
  components/       shared presentation and shadcn/ui components
  config/           validated public environment configuration
  data/local/       Dexie and IndexedDB boundary (Phase 1)
  data/remote/      Supabase boundary
  domain/           framework-independent types and calculations
  features/         feature-owned UI and orchestration
  hooks/            shared presentation hooks
  pages/            route entry points
  sync/             offline queue and synchronization boundary (Phase 1)
  styles/           global design tokens and theme styles
  test/             Vitest setup
e2e/                Playwright browser tests
supabase/            local configuration, migrations, and seed file
docs/architecture/  architecture decision record
```

See [Architecture decisions](docs/architecture/decisions.md) for the rationale
and dependency rules behind this structure.
