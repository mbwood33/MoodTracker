import { z } from 'zod';

import {
  isoTimestampSchema,
  timeZoneSchema,
} from '@/domain/entries/mood-entry';

export const reminderTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour time such as 09:00.');
export const reminderDaySchema = z.number().int().min(0).max(6);

export const reminderSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().min(1).max(128),
  localTime: reminderTimeSchema,
  daysOfWeek: z.array(reminderDaySchema).min(1).max(7),
  timeZone: timeZoneSchema,
  message: z.string().trim().max(180),
  enabled: z.boolean(),
  nextFireAt: isoTimestampSchema.nullable(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  lastSentAt: isoTimestampSchema.nullable(),
});

export type Reminder = z.infer<typeof reminderSchema>;

export const createReminderInputSchema = reminderSchema
  .pick({
    userId: true,
    localTime: true,
    daysOfWeek: true,
    timeZone: true,
    message: true,
  })
  .strict();

export type CreateReminderInput = z.input<typeof createReminderInputSchema>;

export type ReminderClock = { now(): Date };
export type ReminderIdentityFactory = { createId(): string };

const systemClock: ReminderClock = { now: () => new Date() };
const browserIdentityFactory: ReminderIdentityFactory = {
  createId: () => crypto.randomUUID(),
};

export function createReminder(
  input: CreateReminderInput,
  dependencies: {
    clock?: ReminderClock;
    identityFactory?: ReminderIdentityFactory;
  } = {},
): Reminder {
  const parsed = createReminderInputSchema.parse(input);
  const now = (dependencies.clock ?? systemClock).now();
  const enabled = true;

  return reminderSchema.parse({
    ...parsed,
    daysOfWeek: normalizeReminderDays(parsed.daysOfWeek),
    id: (dependencies.identityFactory ?? browserIdentityFactory).createId(),
    enabled,
    nextFireAt: nextReminderOccurrence(parsed, now)?.toISOString() ?? null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lastSentAt: null,
  });
}

export function updateReminder(
  reminder: Reminder,
  changes: Pick<
    Reminder,
    'localTime' | 'daysOfWeek' | 'timeZone' | 'message' | 'enabled'
  >,
  clock: ReminderClock = systemClock,
): Reminder {
  const now = clock.now();
  const candidate = {
    ...reminder,
    ...changes,
    daysOfWeek: normalizeReminderDays(changes.daysOfWeek),
    nextFireAt: changes.enabled
      ? (nextReminderOccurrence(changes, now)?.toISOString() ?? null)
      : null,
    updatedAt: now.toISOString(),
  };
  return reminderSchema.parse(candidate);
}

export function normalizeReminderDays(days: readonly number[]): number[] {
  return [...new Set(days)].sort((left, right) => left - right);
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
};

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(dateParts.find((part) => part.type === type)?.value);
  const weekdayName = dateParts.find((part) => part.type === 'weekday')?.value;
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    weekdayName ?? '',
  );

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    weekday,
    hour: value('hour'),
    minute: value('minute'),
  };
}

function offsetAt(date: Date, timeZone: string): number {
  const parts = zonedParts(date, timeZone);
  return (
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) -
    date.getTime()
  );
}

function localDateAfterDays(parts: ZonedParts, days: number) {
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days),
  );
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function sameLocalMinute(
  date: Date,
  target: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  },
  timeZone: string,
) {
  const parts = zonedParts(date, timeZone);
  return (
    parts.year === target.year &&
    parts.month === target.month &&
    parts.day === target.day &&
    parts.hour === target.hour &&
    parts.minute === target.minute
  );
}

function localMinuteValue(
  parts: Pick<ZonedParts, 'year' | 'month' | 'day' | 'hour' | 'minute'>,
) {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );
}

/** Converts a local wall-clock time to an instant, moving a skipped DST time forward. */
function instantForLocalTime(
  target: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  },
  timeZone: string,
): Date {
  const intended = Date.UTC(
    target.year,
    target.month - 1,
    target.day,
    target.hour,
    target.minute,
  );
  let timestamp = intended;
  for (let attempts = 0; attempts < 4; attempts += 1) {
    const adjusted = intended - offsetAt(new Date(timestamp), timeZone);
    if (adjusted === timestamp) break;
    timestamp = adjusted;
  }
  const resolved = new Date(timestamp);
  if (sameLocalMinute(resolved, target, timeZone)) return resolved;

  // A local time can be skipped during the spring DST transition. Pick the
  // first representable minute after the requested wall-clock time.
  for (let offsetMinutes = -180; offsetMinutes <= 360; offsetMinutes += 1) {
    const candidate = new Date(timestamp + offsetMinutes * 60_000);
    const parts = zonedParts(candidate, timeZone);
    if (localMinuteValue(parts) >= intended) return candidate;
  }
  return resolved;
}

/** Returns the next local reminder instant strictly after `from`. */
export function nextReminderOccurrence(
  reminder: Pick<Reminder, 'localTime' | 'daysOfWeek' | 'timeZone'>,
  from: Date,
): Date | null {
  const parsedTime = reminderTimeSchema.safeParse(reminder.localTime);
  if (!parsedTime.success || reminder.daysOfWeek.length === 0) return null;
  const [hour, minute] = reminder.localTime.split(':').map(Number);
  const localNow = zonedParts(from, reminder.timeZone);
  const days = new Set(normalizeReminderDays(reminder.daysOfWeek));

  for (let offsetDays = 0; offsetDays <= 7; offsetDays += 1) {
    const date = localDateAfterDays(localNow, offsetDays);
    const weekday = new Date(
      Date.UTC(date.year, date.month - 1, date.day),
    ).getUTCDay();
    if (!days.has(weekday)) continue;
    const candidate = instantForLocalTime(
      { ...date, hour: hour!, minute: minute! },
      reminder.timeZone,
    );
    if (candidate.getTime() > from.getTime()) return candidate;
  }
  return null;
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function describeReminderSchedule(
  reminder: Pick<Reminder, 'localTime' | 'daysOfWeek' | 'timeZone'>,
) {
  const days = normalizeReminderDays(reminder.daysOfWeek);
  const label =
    days.length === 7
      ? 'Every day'
      : days.map((day) => weekdayLabels[day]).join(', ');
  return `${label} at ${reminder.localTime}`;
}
