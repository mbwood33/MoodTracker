# Synchronization boundary

Queue processing, push/pull coordination, retries, revision checks, conflict
handling, and visible synchronization state belong here. Synchronization is a
separate orchestration concern; it must never become a prerequisite for saving
an entry locally.

The implementation begins in Phase 1 alongside the first versioned local and
remote entry schemas.
