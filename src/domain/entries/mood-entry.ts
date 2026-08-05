import { z } from 'zod';

export const moodRatingSchema = z.number().int().min(1).max(5);
export const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Expected an ISO local calendar date (YYYY-MM-DD).',
});
export const timeZoneSchema = z.string().min(1);
export const isoTimestampSchema = z.string().datetime({ offset: true });

export const moodEntrySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  moodRating: moodRatingSchema,
  energyRating: moodRatingSchema.nullable(),
  notePlainText: z.string().max(100_000),
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
    notePlainText: true,
    occurredAtUtc: true,
    occurredTimeZone: true,
    occurredLocalDate: true,
  })
  .partial({ energyRating: true, notePlainText: true })
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
    notePlainText: parsed.notePlainText ?? '',
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
