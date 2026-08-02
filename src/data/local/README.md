# Local data boundary

Dexie-backed IndexedDB schemas, repositories, pending mutations, media queues,
and local search indexes belong here. Local persistence will be the immediate
write target for user-created data; no entry-save flow may depend on a network
request.

The schema is intentionally deferred until Phase 1 so it can be introduced with
the first versioned mood-entry model and migration tests.
