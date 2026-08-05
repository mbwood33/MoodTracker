# Domain layer

Framework-independent types and calculations belong here. Mood averages,
streaks, stability, time-zone rules, import/export transformations, insights,
and forecasts must not import React, Dexie, Supabase, or UI components.

Every statistical formula will be introduced with focused unit tests and will
use the entry's stored original local date for day-based calculations.

Phase 1 defines the validated `MoodEntry` model under `entries/`. It keeps the
numeric rating separate from labels, stores both UTC and original local time
context, and uses a new client mutation ID for every mutation. Entry factories
accept injected clocks and ID factories so their behavior is deterministic in
tests and independent of UI, storage, and network concerns.
