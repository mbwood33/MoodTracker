# Remote data boundary

Supabase authentication, PostgreSQL queries, Storage operations, and Edge
Function clients belong here. Browser code may use only publishable/anonymous
credentials. Service-role and administrative credentials must never be exposed
through `VITE_` environment variables.

Phase 1 keeps authentication and entry persistence behind repositories. The
entry repository sends every queued mutation through an optimistic-concurrency
RPC; it does not overwrite a newer remote revision.
