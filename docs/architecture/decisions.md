# Architecture decisions

This document records the foundation decisions made in Phase 0. Decisions that
materially change these boundaries should update this record and, when they
affect product scope or formulas, `AGENTS.md` as well.

## ADR-001: Client platform and runtime baseline

**Status:** Accepted

Use React with strict TypeScript on Vite and require Node.js 22/npm 10 for local
and CI environments. Vite provides a small browser-oriented toolchain, direct
ES modules in development, mode-based environment loading, and a predictable
production build. TypeScript project references separate browser code from
Node-based build and test configuration.

No server-rendering framework is introduced. The product's critical entry flow
must work from a cached application shell and IndexedDB, so an SPA is the
simplest appropriate client foundation.

## ADR-002: Layer boundaries preserve local-first behavior

**Status:** Accepted

The source tree separates presentation (`app`, `pages`, `components`,
`features`), framework-independent domain rules (`domain`), local persistence
(`data/local`), remote services (`data/remote`), and synchronization (`sync`).
Dependencies point inward toward the domain; domain modules cannot import React
or either data implementation.

Dexie will be the immediate persistence boundary for user writes. Supabase is a
remote replica and account service, coordinated by `sync`; it is not the entry
save target. The Phase 0 folders document these rules without prematurely
inventing an IndexedDB schema before the Phase 1 entry model exists.

## ADR-003: State ownership is explicit

**Status:** Accepted

- React state owns ephemeral presentation state.
- React Hook Form plus Zod will own form state and validation.
- Dexie will own durable local application records and pending mutations.
- TanStack Query owns remote request state and cache lifecycles, with
  `offlineFirst` network mode as a safe default.
- Supabase owns authenticated remote persistence after synchronization.

TanStack Query is not a substitute for IndexedDB and its cache is never the sole
copy of unsynchronized user data. No additional global state library is added
until a concrete need cannot be met by these owners.

## ADR-004: Routing and application shell

**Status:** Accepted

React Router uses a single browser router with nested routes under a persistent
shell. The five primary destinations are semantic links shared by a desktop
sidebar and mobile bottom navigation. The main content has a skip link, clear
landmarks, visible focus rings, and large touch targets. Unknown or failed
routes use a non-destructive error page that does not imply local data loss.

The five pages remain placeholders in Phase 0. This validates navigation and
responsive composition without mixing feature behavior into the foundation.

## ADR-005: UI system and themes

**Status:** Accepted

Tailwind CSS supplies utility styling and CSS-variable design tokens. shadcn/ui
is source-owned rather than consumed as an opaque component package;
`components.json`, the shared `cn` helper, and the first accessible `Button`
component establish that workflow. Radix primitives may be used underneath
components when they materially improve accessibility.

Light and dark palettes are semantic CSS variables. The selected mode is
`light`, `dark`, or `system`, stored locally and applied by an inline head script
before React loads to prevent a color flash. Mood colors are deliberately not
defined yet because their accessible semantic palette belongs with Phase 1's
mood model. Reduced-motion preferences are honored globally.

## ADR-006: Progressive Web App strategy

**Status:** Accepted

`vite-plugin-pwa` generates a Workbox service worker for the application shell,
static assets, manifest, navigation fallback, and old-cache cleanup. SVG icons
provide scalable regular and maskable manifest assets until final branded PNG
and platform-specific launch assets are designed.

Service-worker updates use prompt mode: a waiting worker activates only after
the user chooses Reload. This avoids replacing the running app unexpectedly.
Phase 0 does not cache API data, implement background sync, or send push
notifications. Those require the versioned mutation queue and reminder design
from later phases.

## ADR-007: Environment and Supabase boundary

**Status:** Accepted

Only public browser configuration uses Vite environment variables. Zod validates
the public contract, and Supabase URL/key must appear together. The browser
client is lazy and optional so the shell remains runnable without a network or
backend. Administrative secrets are explicitly forbidden from `VITE_` values.

The versioned Supabase CLI is a development dependency. Its checked-in config,
seed file, and first migration make database recreation deterministic. The
foundation migration creates only a revoked `private` schema; application tables
and their mandatory Row Level Security policies arrive together in Phase 1.
Development and production examples are separate and real credentials are
ignored by Git.

## ADR-008: Rich content, charts, and maps are deferred integrations

**Status:** Accepted

Tiptap, Apache ECharts, and MapLibre GL JS are installed and locked because they
are committed platform choices, but Phase 0 does not initialize editors, charts,
workers, or maps. Feature routes will lazy-load these heavier libraries when the
corresponding phases begin. Tiptap output will eventually store structured JSON
plus derived plain text; ECharts data will come from tested domain functions;
MapLibre will never send exact coordinates to analytics services.

## ADR-009: Quality gates

**Status:** Accepted

ESLint uses the flat configuration with TypeScript, React Hooks, React Refresh,
and JSX accessibility rules. Prettier is the sole formatter and sorts Tailwind
classes through its plugin. Strict TypeScript includes unchecked-index and
unused-code checks.

Vitest with jsdom and Testing Library covers fast unit/component behavior.
Playwright checks the production build in desktop Chromium and a mobile Chromium
profile. GitHub Actions runs formatting, linting, type checking, unit tests,
production build, and both browser projects. Domain formulas will receive unit
tests as they are introduced; no arbitrary coverage threshold is imposed before
domain code exists.

## ADR-010: Dependency and security policy

**Status:** Accepted

Runtime and development versions are locked by `package-lock.json`; automated
updates are grouped by ecosystem and reviewed through CI. ESLint remains on the
latest 9.x line until the accessibility plugin declares ESLint 10 compatibility,
avoiding a forced peer-dependency graph.

At foundation creation, npm reports a React Router advisory affecting server
actions/RSC behavior. This client-only SPA does not enable those modes, but the
advisory remains tracked rather than suppressed. Upgrade immediately when the
router publishes a release that resolves the advisory without reintroducing the
older redirect/SSR advisories.

## ADR-011: Phase 1 entry and synchronization contract

**Status:** Accepted

Every entry mutation is first validated by the framework-independent domain
model, then committed with its outbox record in one Dexie transaction. Entries
retain `occurred_at_utc`, the original IANA time zone, and the supplied local
calendar date. The latter remains the canonical input for all later calendar and
statistics work.

The browser only attempts synchronization after the local commit. The queue is
ordered, retryable, and retains failed or interrupted records. A reconnect pushes
queued mutations and pulls the authenticated user's remote rows; a remote row
cannot replace an entry that still has a local queued mutation. This is a
deliberately conservative Phase 1 conflict posture: it preserves both sides for
later explicit resolution rather than silently losing an edit.

Supabase owns account identity and has a paired `profiles` record. Every
user-owned table has RLS enabled. The mutation RPC checks ownership and expected
revision atomically; it returns a serialization conflict instead of applying a
blind last-write-wins update. Presentation code stays persistence-agnostic via a
feature adapter supplied by application composition.
