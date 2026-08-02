# Domain layer

Framework-independent types and calculations belong here. Mood averages,
streaks, stability, time-zone rules, import/export transformations, insights,
and forecasts must not import React, Dexie, Supabase, or UI components.

Every statistical formula will be introduced with focused unit tests and will
use the entry's stored original local date for day-based calculations.
