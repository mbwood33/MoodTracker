# AGENTS.md

## Project: Personal Mood Tracker PWA

## 1. Product Summary

Build a private, account-based mood-tracking application inspired by Daylio, optimized for desktop and mobile browsers.

The application will allow users to record mood entries, notes, photos, voice memos, hashtags, locations, weather, and an optional energy rating. Entries will synchronize between devices, remain usable during temporary internet outages, and feed into calendars, charts, maps, statistics, memories, forecasts, and non-AI insights.

The initial product should prioritize:

1. Fast mood entry
2. Reliable data preservation and synchronization
3. Excellent mobile usability
4. Useful but understandable statistics
5. Straightforward import and export
6. Privacy and user control
7. A manageable development scope

---

## 2. Product Principles

### Fast by default

A basic entry should require only:

1. Open the app
2. Select one of five moods
3. Tap Save

Notes, energy, photos, recordings, hashtags, location, weather, and past-entry dating should be optional.

### Progressive disclosure

The entry screen should initially show only the most frequently used controls. Additional fields should appear under an **Add details** section.

### Transparent statistics

Every statistic should have an information button explaining:

- What it measures
- How it is calculated
- Which entries are included
- How missing days are handled
- Whether it represents correlation rather than causation

### User-owned data

Users must be able to export all entries and media in common, documented formats without losing information.

### Offline-tolerant operation

Entries should save locally immediately and synchronize afterward. A weak connection must not prevent the user from recording a mood.

### Privacy by design

Location, weather, media, and voice recording must be optional. Request sensitive permissions only when the user activates the related feature.

---

## 3. Scope

## Version 1: Core Release

### Accounts and synchronization

Implement:

- Account creation
- Sign-in and sign-out
- Password reset or passwordless sign-in
- Synchronization across devices
- Visible synchronization status
- Local offline entry storage
- Automatic synchronization when connectivity returns
- Full data export
- Account deletion with associated data removal

### Mood entries

Each entry may contain:

- Mood rating from 1 through 5
- Corresponding face illustration
- Optional rich-text note
- Optional energy rating from 1 through 5
- Optional hashtags
- Optional photo
- Optional voice memo
- Optional location
- Automatically captured weather when location is available
- Entry date and time
- Original time zone
- Creation and modification timestamps

Default mood labels:

1. Awful
2. Bad
3. Meh
4. Good
5. Rad

Keep mood labels separate from numeric ratings in the database and UI so custom labels and illustrations can be added later without altering historical data.

### Entry management

Implement:

- Create a current entry
- Create an entry for a past date and time
- Edit an existing entry
- Delete an entry
- Restore recently deleted entries
- View complete entry details
- Duplicate an entry as a starting point
- Clearly distinguish occurrence time from creation time

### Hashtags

Implement:

- Dedicated hashtag input
- Autocomplete using the user’s previous hashtags
- Case-insensitive matching
- Duplicate prevention within the same entry
- Tap a hashtag to view matching entries
- Preserve original display capitalization
- Later support renaming and merging hashtags

### Photos

Implement:

- Select a photo from the device
- Take a new photo on supported mobile devices
- Preview before saving
- Remove or replace a photo
- View the full-resolution image
- Generate thumbnails for timelines and calendars
- Correct image orientation
- Strip unnecessary metadata from uploaded copies

### Voice memos

Implement:

- Record from the browser
- Pause, resume, stop, preview, and discard
- Display duration
- Play recordings inside an entry
- Upload an existing compatible audio file
- Apply an initial recording-duration limit
- Detect supported formats rather than assuming one format works everywhere

Automatic transcription is out of scope for Version 1.

### Rich-text notes

Initially support:

- Paragraphs
- Bold
- Italic
- Underline
- Bulleted lists
- Numbered lists
- Links
- Undo and redo
- Plain-text paste
- Clear formatting

Store notes as structured editor JSON and also generate plain text for search, statistics, and export.

Avoid advanced features such as tables, comments, embedded video, and collaborative editing.

### Location

Users must be able to:

- Use their current GPS location
- Select a location manually on a map
- Search for a place
- Reuse a previously saved place
- Edit the location label
- Remove location from an entry
- Disable location features entirely

Store:

- Latitude
- Longitude
- Accuracy, when available
- Location source: GPS or manual
- User-facing place label
- Optional provider place identifier

### Location privacy controls

Offer three storage modes:

- Exact location
- Approximate location
- Place name only

Approximate-location mode should reduce coordinate precision before upload.

Do not retrieve location continuously in the background. Capture it only during entry creation or when explicitly requested.

### Weather

When an entry has coordinates, retrieve and permanently store a weather snapshot corresponding to the entry’s location and time.

Suggested fields:

- Temperature
- Apparent temperature
- Relative humidity
- Precipitation
- Weather condition code
- Cloud cover
- Wind speed
- Surface pressure
- Daylight or nighttime status
- Weather provider
- Retrieval timestamp

Weather is an entry snapshot. Opening an old entry must not silently replace the original weather data.

For past entries, retrieve historical weather when supported.

If weather retrieval fails, save the entry anyway and allow retry later.

### Reminders

Users should be able to create multiple reminders with:

- Local time
- Selected days of the week
- Enabled or disabled state
- Optional reminder text
- Time zone
- Device notification status

Recommended implementation:

1. The installed PWA creates a Web Push subscription.
2. The subscription is associated with the user and device.
3. A server-side scheduled job determines which reminders are due.
4. The server sends a push message.
5. The service worker displays the notification.
6. Tapping it opens the new-entry screen.

Requirements:

- Ask for notification permission only after the user enables reminders.
- Explain when the browser does not support the necessary behavior.
- Let users test a notification.
- Let users remove subscriptions for old devices.
- Do not treat notification delivery as guaranteed.
- Show reminders inside the app even when push delivery is unavailable.

### Entry log

Provide a reverse-chronological timeline with:

- Mood face and label
- Entry date and time
- Note preview
- Hashtags
- Photo thumbnail
- Voice-memo indicator
- Location label
- Weather summary
- Energy rating when present

Filters:

- Date range
- Mood rating
- Hashtag
- Has photo
- Has voice memo
- Has note
- Has location
- Energy rating

Include text search across plain-text notes and hashtags.

### Calendar

Provide a monthly calendar view.

Each date should display:

- Color representing the day’s average mood
- Number of entries
- Optional photo indicator
- A distinct blank state when no entries exist

Interactions:

- Tap a date to see its entries
- Create an entry for the selected date
- Move between months
- Jump to today
- Jump to a specific month and year

Do not confuse missing data with neutral mood.

### Photo timeline

Provide a media gallery containing attached photos.

Features:

- Chronological grid
- Month and year grouping
- Full-screen viewer
- Entry date and mood overlay
- Tap through to the original entry
- Filter by date, mood, hashtag, or location

Voice recordings do not require a dedicated gallery in Version 1.

### Map

Use an interactive map with two modes.

#### Entry markers

Display individual entries or grouped clusters. Tapping a marker should show:

- Date
- Mood
- Place label
- Photo thumbnail when available
- Link to the entry

#### Mood heatmap

Allow switching between:

- Entry density
- Average mood
- Positive-entry density
- Negative-entry density

Do not send exact coordinates to third-party analytics services.

---

## 4. Statistics

All calculations must use the entry’s original local date rather than deriving the date from UTC alone.

### Daily mood

For a given local calendar date:

```text
daily mood = sum of mood ratings / number of entries
```

Example:

```text
Ratings: 2, 3, 5
Daily mood: 3.33
```

### Mood chart

Display daily mood averages as a smooth line.

Controls:

- 7 days
- 30 days
- Current month
- Previous month
- Custom range
- Whole year

Keep underlying data points visible. Do not let curve smoothing imply values outside the 1–5 scale.

Show missing days as gaps.

### Current chain

A chain is a sequence of consecutive local calendar days containing at least one entry.

Rules:

- If today has an entry, include today.
- If today has no entry but yesterday does, continue displaying the chain through yesterday because today is incomplete.
- Once a complete local day is missed, reset the chain.

### Longest chain

The greatest number of consecutive calendar days containing at least one entry.

### Average daily mood by weekday

For the selected month:

1. Calculate an average mood for each calendar date.
2. Group daily averages by weekday.
3. Average those daily averages within each weekday group.

This prevents days with many entries from receiving disproportionate weight.

### Mood distribution

Show separately:

- Count and percentage of entries rated 1 through 5
- Count and percentage of days whose daily average falls into each mood band

### Mood stability

Use a transparent measure of day-to-day variation.

For consecutive logged calendar days:

```text
change = absolute value of today’s daily average minus yesterday’s daily average
```

Then calculate:

```text
mean change = average of all qualifying changes
stability score = round(100 × (1 - mean change / 4))
```

Clamp the final result between 0 and 100.

Interpretation:

- 100 means no change between consecutive logged days.
- Lower scores indicate larger day-to-day changes.
- The score does not indicate whether mood is good.
- A consistently low mood can still have high stability.

Only compare genuinely consecutive calendar days.

Do not calculate the score until at least five qualifying comparisons exist.

Display:

- Stability score
- Average daily change
- Number of comparisons
- Daily mood graph
- Seven-day rolling average
- Plain-language explanation

### Best-day streak

Define a best day as a logged day whose average mood is at least 4.0.

Calculate:

- Current positive-day streak
- Longest positive-day streak
- Date range of the longest streak

Prefer the label **Positive Day Streak** unless user testing strongly favors **Best Day Streak**.

### Monthly statistics

Include:

- Number of entries
- Number of logged days
- Average entries per logged day
- Average daily mood
- Highest-rated day
- Lowest-rated day
- Most frequent mood
- Most common hashtags
- Longest chain during the month
- Mood stability
- Number of photos
- Number and duration of voice memos
- Most frequently recorded location
- Comparison with the previous month

### Yearly statistics

Allow selection of any year containing data.

Include:

- Number of entries
- Number of logged days
- Average daily mood
- Number of note words
- Mood distribution
- Best month
- Most difficult month
- Longest entry chain
- Longest positive-day streak
- Most frequently used hashtags
- Number of photos
- Number and duration of voice memos
- Most frequently recorded locations
- Average mood by weekday
- Average mood by month

### Yearly mood chart

Calculate one value per month:

```text
monthly mood = average of the daily averages in that month
```

Do not weight months according to raw entry counts.

### Year in pixels

Display one colored square per calendar day.

Requirements:

- Color represents daily mood average.
- Empty days use a distinct no-data color.
- Tap or hover shows date, daily average, and entry count.
- Support calendar-grid and month-row layouts.
- Provide an accessible text alternative.

### Note word count

Count words from plain-text notes.

Exclude:

- Rich-text markup
- URLs when practical
- Dedicated hashtag fields
- Deleted entries

Document the counting rules.

---

## 5. Non-AI Insights

Insights must use understandable statistical comparisons and must never claim causation.

### Initial insight categories

#### Hashtags

Examples:

- Entries tagged `#therapy` average 0.6 points higher.
- Mood tends to be lower on days containing `#migraine`.
- `#music` appears most often on high-mood days.

#### Locations

Examples:

- Average recorded mood at a location
- Number of entries at a location
- Most frequently recorded positive-mood location

#### Weather

Examples:

- Rainy versus non-rainy logged days
- Temperature ranges
- Cloud-cover ranges
- Daylight versus nighttime
- Pressure ranges when enough data exists

#### Time patterns

Examples:

- Average mood by hour
- Average mood by weekday
- Morning versus afternoon versus evening
- Weekends versus weekdays

#### Entry behavior

Examples:

- Months with the most consistent logging
- Relationship between logging frequency and recorded mood
- Hashtags that commonly appear during positive streaks

### Insight safeguards

An insight should require:

- A minimum number of observations
- Enough observations in both comparison groups
- A visible sample size
- An effect-size threshold
- A clear date range

Suggested minimum:

- At least 10 observations total
- At least 5 observations per comparison group

Use wording such as:

- Associated with
- Tends to appear alongside
- In your recorded entries
- Based on 18 logged days

Do not use wording such as:

- Causes
- Treats
- Prevents
- Proves

Allow users to hide individual insight categories.

---

## 6. Mood Forecast

Treat forecasting as an experimental later feature, not a clinical prediction.

### Initial non-AI method

Calculate a forecast using a weighted combination of:

- Recent seven-day average
- Recent 30-day average
- Average for the same weekday during recent weeks
- Short-term trend

Example:

```text
50% recent 7-day average
25% recent 30-day average
25% same-weekday average
```

Apply only a modest trend adjustment and clamp values to 1–5.

Display:

- Forecast value
- Broad range instead of false precision
- Confidence level
- Factors contributing to the forecast
- A statement that it is a pattern estimate, not a medical assessment

Do not produce forecasts until enough history exists, such as:

- At least 30 logged days
- At least four examples of the target weekday

Exclude forecasting from the initial MVP unless core storage, synchronization, import, and export are already stable.

---

## 7. Memories

### Memory types

- One year ago today
- Previous years on this date
- Random entry from the same month
- Previous high-mood day
- Previous photo memory
- Monthly review

### User controls

Implement:

- Enable or disable memories
- Hide a specific memory
- Exclude moods 1 and 2 from random memories
- Exclude specific hashtags
- Exclude date ranges
- Exclude entries marked private or sensitive
- Disable notifications while retaining in-app memories

Do not unexpectedly surface difficult entries without user control.

---

## 8. Recommended Technology Stack

### Frontend

Use:

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- shadcn/ui or a comparable accessible component system
- Tiptap for rich-text notes
- Apache ECharts for charts
- MapLibre GL JS for maps and heatmaps
- Dexie for IndexedDB
- TanStack Query for server-state requests
- Zod for validation
- React Hook Form for forms

### Progressive Web App

Use:

- Web app manifest
- Service worker
- Cached application shell
- Offline route support
- Install guidance
- Web Push subscriptions
- Background synchronization where supported
- PWA icons and launch screens

Use a custom service worker if reminder and synchronization requirements exceed generated defaults.

### Backend

Recommended initial backend: Supabase.

Use:

- Supabase Auth
- PostgreSQL
- Supabase Storage
- Row Level Security
- Edge Functions
- Supabase Cron
- Optional PostGIS extension

### Local storage

Use IndexedDB through Dexie for:

- Offline drafts
- Locally saved entries
- Pending mutations
- Cached entry lists
- Cached statistics
- Photo thumbnails
- Temporary media uploads
- Recently viewed media metadata

---

## 9. Application Architecture

### Presentation layer

Contains:

- Pages
- Dialogs
- Forms
- Charts
- Calendar
- Timeline
- Map
- Photo gallery

### Domain layer

Contains:

- Mood calculations
- Streak calculations
- Stability calculations
- Insight generation
- Forecasting
- Date and time-zone handling
- Import transformations
- Export transformations

Domain calculations must be framework-independent and thoroughly unit tested.

### Local data layer

Contains:

- IndexedDB schema
- Cached records
- Pending mutation queue
- Upload queue
- Synchronization metadata
- Local search indexes

### Remote data layer

Contains:

- Supabase client
- Authentication
- PostgreSQL queries
- Storage uploads
- Edge Function calls
- Push subscription registration

### Synchronization layer

Responsible for:

- Sending pending changes
- Pulling remote changes
- Retrying failed operations
- Resolving conflicts
- Reporting status
- Cleaning completed queue items

---

## 10. Data Model

### `profiles`

```text
id
display_name
time_zone
locale
theme
week_start_day
created_at
updated_at
```

### `mood_entries`

```text
id
user_id
mood_rating
energy_rating
note_json
note_plain_text
occurred_at_utc
occurred_time_zone
occurred_local_date
created_at
updated_at
deleted_at
revision
client_mutation_id
```

Constraints:

- Mood rating must be between 1 and 5.
- Energy rating may be null or between 1 and 5.
- User ID must match the authenticated user.
- Soft-deleted records remain available briefly for restoration and synchronization.

### `entry_locations`

```text
id
entry_id
user_id
latitude
longitude
accuracy_meters
precision_mode
source
display_name
provider_place_id
created_at
updated_at
```

### `weather_snapshots`

```text
id
entry_id
provider
observed_for
retrieved_at
temperature
apparent_temperature
humidity
precipitation
cloud_cover
wind_speed
surface_pressure
weather_code
is_day
raw_data_version
```

### `hashtags`

```text
id
user_id
normalized_name
display_name
usage_count
created_at
updated_at
```

### `entry_hashtags`

```text
entry_id
hashtag_id
created_at
```

Use a unique constraint on `(entry_id, hashtag_id)`.

### `media_attachments`

```text
id
entry_id
user_id
media_type
storage_path
thumbnail_path
mime_type
file_size
width
height
duration_ms
original_file_name
created_at
updated_at
deleted_at
```

### `reminders`

```text
id
user_id
local_time
days_of_week
time_zone
message
enabled
created_at
updated_at
```

### `push_subscriptions`

```text
id
user_id
device_name
endpoint
p256dh_key
auth_key
last_used_at
created_at
disabled_at
```

### `saved_locations`

```text
id
user_id
display_name
latitude
longitude
precision_mode
usage_count
created_at
updated_at
```

### `user_preferences`

```text
user_id
location_default
weather_enabled
energy_enabled
memory_settings
forecast_enabled
notification_settings
mood_labels
created_at
updated_at
```

---

## 11. Synchronization Strategy

### Local-first creation

When saving an entry:

1. Generate a UUID on the client.
2. Save the entry to IndexedDB.
3. Mark it as pending synchronization.
4. Immediately update the UI.
5. Attempt the remote write.
6. Upload media separately.
7. Mark the entry synchronized after server confirmation.

The user must not lose an entry because a network request timed out.

### Synchronization states

Display one of:

- Saved
- Saving
- Saved locally
- Synchronizing
- Synchronized
- Synchronization problem

### Conflict handling

Use:

- Record revision number
- Updated timestamp
- Device-generated mutation identifier
- Last-known server revision

Initial policy:

- Merge changes to different fields when practical.
- Preserve both versions when the same field changed concurrently.
- Present a conflict-resolution UI rather than silently discarding data.
- Merge media attachments rather than overwrite them.
- Do not let a deletion silently destroy a newer edit.

### Media uploads

1. Save temporary media locally.
2. Create the entry immediately.
3. Upload media separately.
4. Record upload progress.
5. Retry failures.
6. Keep a visible warning until upload succeeds.
7. Allow cancel and retry.

Do not block the full entry save operation on large media uploads.

---

## 12. Import

### Import goals

- Preserve as much information as possible
- Preview before committing
- Report unmapped fields
- Detect duplicates
- Allow rollback
- Record import source and date

### Initial formats

Support:

- Native JSON backup
- Native ZIP backup
- CSV
- Daylio export adapter

Build the Daylio adapter only after inspecting representative exports.

### Import workflow

1. Select file.
2. Detect format and schema.
3. Parse without changing the database.
4. Show record count and date range.
5. Show mood-mapping preview.
6. Show warnings and unsupported fields.
7. Let the user adjust mappings.
8. Detect likely duplicates.
9. Perform import as a transaction or tracked batch.
10. Display a result report.
11. Allow import-batch rollback.

### Duplicate detection

Consider entries possible duplicates when several of these match:

- Source identifier
- Date and time
- Mood
- Note text
- Hashtags
- Media filename or checksum

Never delete possible duplicates automatically without informing the user.

---

## 13. Export and Backup

### Full backup

Create a ZIP archive containing:

```text
manifest.json
entries.json
entries.csv
hashtags.json
locations.json
weather.json
reminders.json
media/
thumbnails/
README.txt
```

The manifest should include:

- Export date
- Application version
- Schema version
- User time zone
- Record counts
- File checksums
- Included data categories

### Additional exports

Support:

- Entries as CSV
- Entries as JSON
- Notes as Markdown
- Year in pixels as an image
- Charts as PNG or SVG
- Printable yearly report
- Photo archive

### Export requirements

- No proprietary-only format
- Stable identifiers
- ISO 8601 timestamps
- Original time-zone information
- Documented mood values
- Documented rich-text representation
- Media files referenced by entry records
- Option to omit exact coordinates
- Option to omit voice recordings or photos
- Encrypted backup as a later enhancement

---

## 14. Security and Privacy

### Database policies

Enable Row Level Security on every user-owned table.

Policies must ensure:

- Users can read only their own records.
- Users can create rows only with their own user ID.
- Users can update or delete only their own rows.
- Storage objects are accessible only to the owner.
- Administrative credentials never appear in browser code.

### Media

- Use private storage buckets.
- Use short-lived signed URLs where appropriate.
- Validate MIME type and file signature.
- Apply file-size limits.
- Reject executable or unsupported formats.
- Sanitize uploaded filenames.
- Remove abandoned uploads.
- Never expose photos through permanent public URLs.

### Sensitive permissions

Request permissions contextually:

- Location when **Use current location** is selected
- Microphone when recording begins
- Camera when taking a photo
- Notifications when reminders are enabled

Provide a settings screen showing current permission status.

### Account controls

Provide:

- Export all data
- Delete all data
- Delete account
- Sign out of all devices
- Remove notification subscriptions
- Review active sessions
- Change password or authentication method

---

## 15. User Interface

### Primary navigation

Use mobile bottom navigation and an equivalent desktop side navigation.

Primary destinations:

- Today
- Log
- Calendar
- Stats
- More

Place Map, Photos, Memories, Import, Export, Reminders, and Settings under **More** initially.

### Today screen

Include:

- Large “How are you?” prompt
- Five mood faces
- Quick-entry button
- Latest entry
- Current chain
- Seven-day summary
- Pending synchronization warning
- Optional memory card

### Entry screen

Recommended order:

1. Mood
2. Save button
3. Note
4. Hashtags
5. Energy
6. Photo
7. Voice memo
8. Location and weather
9. Date and time

Keep the Save button reachable without scrolling on common phone sizes.

Autosave unfinished drafts, but do not convert a draft into a completed entry until the user explicitly saves it.

### Stats screen

Sections:

- Overview
- Mood
- Patterns
- Locations
- Yearly
- Insights

Use consistent filters across charts.

### Accessibility

Requirements:

- Keyboard navigation
- Screen-reader labels
- Non-color mood indicators
- Sufficient contrast
- Reduced-motion support
- Large tap targets
- Scalable text
- Text alternatives for charts
- Faces distinguishable without relying only on color

---

## 16. Themes

### Version 1

Include:

- Light mode
- Dark mode
- Follow system setting

Keep mood colors semantically consistent across themes.

### Later

Possible additions:

- Curated color themes
- Custom accent color
- Custom mood labels
- Custom mood illustrations

Do not build a fully open-ended theme editor initially.

---

## 17. Development Phases

### Phase 0: Project foundation

Deliverables:

- Repository setup
- TypeScript configuration
- Formatting and linting
- Automated tests
- Environment configuration
- Continuous integration
- Supabase local-development configuration
- Database migration system
- Basic design tokens
- Mobile and desktop application shell

Exit criteria:

- App runs locally.
- Automated checks run on every change.
- Database can be recreated from migrations.
- Development and production configuration are separated.

### Phase 1: Core mood entries

Deliverables:

- Account creation and sign-in
- Five mood choices
- Current and past entry date/time
- Plain-text notes initially
- Optional energy
- Create, view, edit, and delete
- Basic timeline
- Local IndexedDB storage
- Basic remote synchronization

Exit criteria:

- An offline entry survives reload.
- It synchronizes when connectivity returns.
- It appears on another device.
- Editing and deletion synchronize correctly.

### Phase 2: Rich notes and hashtags

Deliverables:

- Tiptap editor
- Structured JSON and plain-text storage
- Hashtag input
- Autocomplete
- Tag filtering
- Search

Exit criteria:

- Rich formatting survives editing and synchronization.
- Search works against plain-text notes.
- Suggestions use the user’s tag history.

### Phase 3: Media

Deliverables:

- Photo upload and camera capture
- Thumbnail generation
- Voice recording and playback
- Offline upload queue
- Storage security policies
- Media retry interface

Exit criteria:

- Entries save even when media upload fails.
- Media remains private.
- Media appears correctly on a second device.

### Phase 4: Calendar and statistics

Deliverables:

- Monthly calendar
- Daily averages
- Mood charts
- Current and longest chain
- Weekday averages
- Mood distribution
- Stability score
- Positive-day streak
- Monthly and yearly summaries
- Year in pixels

Exit criteria:

- Tests cover missing days and multiple entries per day.
- Statistics use original local dates.
- Charts work on narrow mobile screens.
- No-data states are distinct from neutral mood.

### Phase 5: Location, weather, and maps

Deliverables:

- GPS permission flow
- Manual map selection
- Saved locations
- Location precision controls
- Current and historical weather
- Entry map
- Heatmap
- Location and weather statistics

Exit criteria:

- Entry creation succeeds without location or weather.
- Exact coordinates are optional.
- Historical entries retain snapshots.
- Maps remain responsive with large histories.

### Phase 6: Import and export

Deliverables:

- Native JSON export
- Full ZIP backup
- CSV export
- CSV import
- Daylio import adapter
- Import preview
- Duplicate detection
- Rollback

Exit criteria:

- Exported data can recreate the account.
- Media references survive round-trip import.
- Invalid files produce understandable errors.
- Unsupported fields are never silently discarded.

### Phase 7: PWA and reminders

Deliverables:

- Installable PWA
- Offline app shell
- Service worker updates
- Push subscription management
- Multiple reminders
- Scheduled reminder delivery
- Test notification
- Browser capability messaging

Exit criteria:

- App launches from the home screen.
- Basic entry creation works offline.
- Reminders work on supported devices.
- Service-worker updates do not trap users on broken versions.

### Phase 8: Insights and memories

Deliverables:

- Non-AI insight engine
- Minimum-sample safeguards
- Location, hashtag, weather, and time insights
- Memory cards
- Sensitive-memory controls
- Monthly review

Exit criteria:

- Every insight shows sample size and date range.
- Wording avoids causal claims.
- Users can disable or exclude memories.

### Phase 9: Forecasting

Deliverables:

- Non-AI forecast formula
- Confidence calculation
- Contributing-factor display
- Opt-in setting
- Historical backtesting

Exit criteria:

- Forecasts require adequate history.
- Values remain within 1–5.
- UI describes forecasts as experimental.
- Backtesting compares performance against a simple baseline.

---

## 18. Testing Plan

### Unit tests

Prioritize:

- Daily averages
- Monthly averages
- Yearly averages
- Weekday grouping
- Chains
- Positive streaks
- Stability
- Forecast calculations
- Insight minimums
- Word counts
- Mood-band conversion
- Time-zone conversion
- Daylight-saving transitions
- Import mapping
- Duplicate detection

### Integration tests

Cover:

- Authentication
- Row Level Security
- Entry synchronization
- Storage authorization
- Media upload retry
- Push subscription registration
- Weather failure handling
- Account deletion
- Import rollback
- Export completeness

### End-to-end tests

Essential scenarios:

1. Create a basic entry.
2. Create a detailed entry.
3. Create an entry offline.
4. Reconnect and synchronize.
5. Edit on another device.
6. Resolve a conflict.
7. Upload a photo.
8. Record a voice memo.
9. Add GPS and weather.
10. Create a past entry.
11. Import a backup.
12. Export and restore data.
13. Enable and test a reminder.
14. Navigate by keyboard.
15. Use reduced-motion mode.

### Performance tests

Test with:

- 10,000 entries
- Thousands of hashtags
- Several thousand photos
- Long notes
- A decade of calendar data
- Large map datasets
- Slow connections
- Interrupted uploads

Use clustering and aggregation so maps and charts do not render every raw item unnecessarily.

---

## 19. Version 1 Non-Goals

Do not include initially:

- Medication tracking
- Habit tracking
- Health Connect integration
- Apple Health integration
- Sleep tracking
- Expanded symptom scales
- Journal prompts
- Multiple journals
- Custom rating scales
- Home-screen widgets
- AI analysis
- Automatic voice transcription
- Social sharing
- Public profiles
- Therapist or clinician portals
- Diagnostic or treatment recommendations
- Full theme creator
- Custom mood illustrations
- Collaborative journals

Revisit these only after core entry, synchronization, import, export, and statistics systems are dependable.

---

## 20. Recommended MVP Cut Line

The first publicly usable version should contain:

- Accounts
- Five-point mood entry
- Rich-text note
- Optional energy
- Hashtags with autocomplete
- Past-entry creation
- Editing and deletion
- Entry timeline
- Calendar
- Basic charts
- Current and longest chain
- Year in pixels
- Photo upload
- Voice memo
- GPS and manual location
- Weather snapshot
- Offline-tolerant synchronization
- JSON, CSV, and complete backup export
- Daylio import
- Light and dark modes
- Installable PWA

Ship afterward:

- Push reminders
- Photo timeline
- Map heatmap
- Advanced yearly report
- Mood stability
- Non-AI insights
- Memories
- Mood forecast

The application’s most important promise is that users can quickly record their mood, trust that the information is preserved, and access it from every device.

---

## 21. Instructions for Coding Agents

When modifying this project:

1. Preserve the local-first data model.
2. Never make network availability a requirement for creating an entry.
3. Never silently discard user data.
4. Treat import, export, backup, and synchronization as core features.
5. Keep medical claims and diagnostic interpretations out of the application.
6. Keep mood forecasting explicitly experimental and non-clinical.
7. Use the original local date and time zone for all day-based calculations.
8. Add unit tests for every statistics formula.
9. Add database migrations for every schema change.
10. Apply Row Level Security to every user-owned database object.
11. Keep media private by default.
12. Request permissions only in direct response to user actions.
13. Maintain keyboard and screen-reader accessibility.
14. Keep the basic mood-entry flow fast and uncluttered.
15. Prefer simple, inspectable statistical methods over opaque scoring.
16. Document any import assumptions and unsupported fields.
17. Ensure all exported formats remain documented and portable.
18. Do not add out-of-scope health, medication, habit, or AI features without an explicit product decision.
19. Avoid adding dependencies when the existing stack can reasonably solve the problem.
20. Update this file when architecture, scope, formulas, or development phases materially change.
