import { DateTime } from 'luxon';

export interface ReminderSchedule {
  daysOfWeek: readonly number[];
  localTime: string;
  timeZone: string;
}

/** Finds the first configured local date/time strictly after `after`. */
export function nextReminderOccurrence(
  schedule: ReminderSchedule,
  after: Date = new Date(),
): string {
  const time = parseLocalTime(schedule.localTime);
  const localNow = DateTime.fromJSDate(after, { zone: schedule.timeZone });
  if (!localNow.isValid) {
    throw new Error(`Invalid reminder time zone: ${schedule.timeZone}`);
  }

  const selectedDays = new Set(schedule.daysOfWeek);
  for (let offset = 0; offset <= 7; offset += 1) {
    const date = localNow.startOf('day').plus({ days: offset });
    // Luxon uses Monday=1 through Sunday=7; MoodTracker uses Sunday=0.
    const moodTrackerWeekday = date.weekday % 7;
    if (!selectedDays.has(moodTrackerWeekday)) continue;

    const candidate = occurrenceOnLocalDate(date, time);
    if (candidate > localNow) return candidate.toUTC().toISO()!;
  }

  throw new Error(
    'A reminder must include at least one valid day of the week.',
  );
}

function occurrenceOnLocalDate(
  date: DateTime,
  time: { hour: number; minute: number },
) {
  const candidate = date.set({
    hour: time.hour,
    minute: time.minute,
    second: 0,
    millisecond: 0,
  });
  if (candidate.hour === time.hour && candidate.minute === time.minute) {
    return candidate;
  }

  // Some wall-clock minutes do not exist when daylight saving time begins.
  // Use the first real local minute after the gap instead of shifting the
  // requested minute by a full hour (02:30 becomes 03:00, not 03:30).
  const requestedMinute = time.hour * 60 + time.minute;
  const nextDate = date.plus({ days: 1 });
  for (
    let cursor = date;
    cursor < nextDate;
    cursor = cursor.plus({ minutes: 1 })
  ) {
    if (cursor.hour * 60 + cursor.minute >= requestedMinute) return cursor;
  }
  return candidate;
}

function parseLocalTime(localTime: string) {
  const match = /^(?<hour>[01]\d|2[0-3]):(?<minute>[0-5]\d)$/.exec(localTime);
  if (!match?.groups) {
    throw new Error(`Invalid reminder local time: ${localTime}`);
  }
  return {
    hour: Number(match.groups.hour),
    minute: Number(match.groups.minute),
  };
}
