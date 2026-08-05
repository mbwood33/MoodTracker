# Local data boundary

Dexie-backed IndexedDB schemas, repositories, pending mutations, media queues,
and local search indexes belong here. Local persistence will be the immediate
write target for user-created data; no entry-save flow may depend on a network
request.

Phase 1 introduces `MoodTrackerDatabase` schema version 1. Its `moodEntries`
table stores the original local date and time zone alongside UTC occurrence
time. `entryMutations` is a durable outbox: each local create, edit, delete,
or restore writes both the entry snapshot and its retryable mutation in one
Dexie transaction. This makes the IndexedDB commit the first and required save
destination; remote delivery is always subsequent and retryable.
