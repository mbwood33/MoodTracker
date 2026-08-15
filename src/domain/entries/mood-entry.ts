import { z } from 'zod';

export const moodRatingSchema = z.number().int().min(1).max(5);
export const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Expected an ISO local calendar date (YYYY-MM-DD).',
});
export const timeZoneSchema = z.string().min(1);
export const isoTimestampSchema = z.string().datetime({ offset: true });

export const moodEntrySchema = z.object({
  id: z.string().uuid(),
  // Firebase Auth UIDs are opaque strings rather than UUIDs.
  userId: z.string().min(1).max(128),
  moodRating: moodRatingSchema,
  energyRating: moodRatingSchema.nullable(),
  // Kept separately from the searchable/export-friendly plain-text projection.
  // The default accepts records written before rich notes were added.
  noteJson: z.record(z.string(), z.unknown()).nullable().optional(),
  notePlainText: z.string().max(100_000),
  // Tags are kept with the entry for now so imports preserve their source
  // information while the dedicated hashtag collection is introduced.
  activityTags: z.array(z.string().min(1).max(120)).optional(),
  occurredAtUtc: isoTimestampSchema,
  occurredTimeZone: timeZoneSchema,
  // This is deliberately persisted instead of derived from UTC. It is the
  // canonical date used by all calendar and statistics features.
  occurredLocalDate: localDateSchema,
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  deletedAt: isoTimestampSchema.nullable(),
  revision: z.number().int().nonnegative(),
  clientMutationId: z.string().uuid(),
});

export type MoodEntry = z.infer<typeof moodEntrySchema>;

export const createMoodEntryInputSchema = moodEntrySchema
  .pick({
    userId: true,
    moodRating: true,
    energyRating: true,
    noteJson: true,
    notePlainText: true,
    activityTags: true,
    occurredAtUtc: true,
    occurredTimeZone: true,
    occurredLocalDate: true,
  })
  .partial({
    energyRating: true,
    noteJson: true,
    notePlainText: true,
    activityTags: true,
  })
  .strict();

export type CreateMoodEntryInput = z.input<typeof createMoodEntryInputSchema>;

export const updateMoodEntryInputSchema = createMoodEntryInputSchema
  .omit({ userId: true })
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    'An update must change a field.',
  );

export type UpdateMoodEntryInput = z.input<typeof updateMoodEntryInputSchema>;

export interface EntryIdentityFactory {
  createId(): string;
}

export interface Clock {
  now(): Date;
}

const browserIdentityFactory: EntryIdentityFactory = {
  createId: () => crypto.randomUUID(),
};

const systemClock: Clock = { now: () => new Date() };

export function createMoodEntry(
  input: CreateMoodEntryInput,
  dependencies: { clock?: Clock; identityFactory?: EntryIdentityFactory } = {},
): MoodEntry {
  const parsed = createMoodEntryInputSchema.parse(input);
  const now = (dependencies.clock ?? systemClock).now().toISOString();
  const createId = dependencies.identityFactory ?? browserIdentityFactory;

  return moodEntrySchema.parse({
    ...parsed,
    id: createId.createId(),
    energyRating: parsed.energyRating ?? null,
    noteJson: parsed.noteJson ?? null,
    notePlainText: parsed.notePlainText ?? '',
    activityTags: parsed.activityTags ?? [],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    revision: 0,
    clientMutationId: createId.createId(),
  });
}

export function updateMoodEntry(
  entry: MoodEntry,
  input: UpdateMoodEntryInput,
  dependencies: { clock?: Clock; identityFactory?: EntryIdentityFactory } = {},
): MoodEntry {
  const changes = updateMoodEntryInputSchema.parse(input);
  const createId = dependencies.identityFactory ?? browserIdentityFactory;

  return moodEntrySchema.parse({
    ...entry,
    ...changes,
    energyRating:
      changes.energyRating === undefined
        ? entry.energyRating
        : changes.energyRating,
    notePlainText:
      changes.notePlainText === undefined
        ? entry.notePlainText
        : changes.notePlainText,
    noteJson:
      changes.noteJson === undefined ? entry.noteJson : changes.noteJson,
    activityTags:
      changes.activityTags === undefined
        ? entry.activityTags
        : changes.activityTags,
    updatedAt: (dependencies.clock ?? systemClock).now().toISOString(),
    revision: entry.revision + 1,
    clientMutationId: createId.createId(),
  });
}

export function softDeleteMoodEntry(
  entry: MoodEntry,
  dependencies: { clock?: Clock; identityFactory?: EntryIdentityFactory } = {},
): MoodEntry {
  const createId = dependencies.identityFactory ?? browserIdentityFactory;
  const now = (dependencies.clock ?? systemClock).now().toISOString();

  return moodEntrySchema.parse({
    ...entry,
    deletedAt: now,
    updatedAt: now,
    revision: entry.revision + 1,
    clientMutationId: createId.createId(),
  });
}

export function restoreMoodEntry(
  entry: MoodEntry,
  dependencies: { clock?: Clock; identityFactory?: EntryIdentityFactory } = {},
): MoodEntry {
  const createId = dependencies.identityFactory ?? browserIdentityFactory;

  return moodEntrySchema.parse({
    ...entry,
    deletedAt: null,
    updatedAt: (dependencies.clock ?? systemClock).now().toISOString(),
    revision: entry.revision + 1,
    clientMutationId: createId.createId(),
  });
}
