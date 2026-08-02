-- Phase 0 intentionally creates no application tables. Each user-owned table
-- will be introduced with explicit Row Level Security in its own migration.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

comment on schema private is
  'Server-only functions and implementation details that must not be exposed by the Data API.';
