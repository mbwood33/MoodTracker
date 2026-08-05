# Synchronization boundary

Queue processing, push/pull coordination, retries, revision checks, conflict
handling, and visible synchronization state belong here. Synchronization is a
separate orchestration concern; it must never become a prerequisite for saving
an entry locally.

Phase 1 exposes `LocalFirstEntries` as the UI-facing create/edit/delete/restore
API and `synchronizePendingEntries` as the remote-delivery runner. The runner
uses a small `RemoteEntryWriter` contract, processes mutations chronologically,
and retains a failed mutation with error and retry metadata instead of removing
the local entry. Pull/conflict merging remains a later synchronization step;
the Phase 1 contract carries revisions and client mutation IDs for it.
