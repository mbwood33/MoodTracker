# Remote data boundary

Firebase Authentication, Cloud Firestore, Cloud Storage, and Cloud Function
clients belong here. Browser code may use only the public Firebase web app
configuration. Service-account and administrative credentials must never be
exposed through `VITE_` environment variables.

Phase 1 keeps authentication and entry persistence behind repositories. The
entry repository sends every queued mutation through a Firestore transaction
that checks the expected revision; it does not overwrite a newer remote
revision. Entries live under `users/{uid}/moodEntries/{entryId}` so Security
Rules can enforce ownership from the document path.
