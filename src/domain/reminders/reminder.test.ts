import { describe, expect, it } from 'vitest';

import {
  createReminder,
  describeReminderSchedule,
  nextReminderOccurrence,
  normalizeReminderDays,
} from './reminder';

const weekdays = [0, 1, 2, 3, 4, 5, 6];

describe('nextReminderOccurrence', () => {
  it('uses the reminder timezone instead of the browser timezone', () => {
    const next = nextReminderOccurrence(
      { localTime: '09:00', daysOfWeek: [1], timeZone: 'America/Chicago' },
      new Date('2026-03-02T14:30:00.000Z'),
    );

    expect(next?.toISOString()).toBe('2026-03-02T15:00:00.000Z');
  });

  it("moves to the next selected day once today's time has passed", () => {
    const next = nextReminderOccurrence(
      { localTime: '09:00', daysOfWeek: [1, 3], timeZone: 'America/Chicago' },
      new Date('2026-03-02T15:00:00.000Z'),
    );

    expect(next?.toISOString()).toBe('2026-03-04T15:00:00.000Z');
  });

  it('keeps the requested wall-clock time across a daylight-saving change', () => {
    const next = nextReminderOccurrence(
      { localTime: '09:00', daysOfWeek: weekdays, timeZone: 'America/Chicago' },
      new Date('2026-03-08T13:00:00.000Z'),
    );

    expect(next?.toISOString()).toBe('2026-03-08T14:00:00.000Z');
  });

  it('moves a skipped spring DST wall-clock time to the next available minute', () => {
    const next = nextReminderOccurrence(
      { localTime: '02:30', daysOfWeek: [0], timeZone: 'America/Chicago' },
      new Date('2026-03-08T06:00:00.000Z'),
    );

    expect(next?.toISOString()).toBe('2026-03-08T08:00:00.000Z');
  });
});

describe('reminder records', () => {
  it('normalizes days and calculates its initial next occurrence', () => {
    const reminder = createReminder(
      {
        userId: 'user-1',
        localTime: '08:30',
        daysOfWeek: [1, 1, 5],
        timeZone: 'America/Chicago',
        message: 'Check in',
      },
      {
        clock: { now: () => new Date('2026-03-02T14:00:00.000Z') },
        identityFactory: {
          createId: () => '00000000-0000-4000-8000-000000000001',
        },
      },
    );

    expect(reminder.daysOfWeek).toEqual([1, 5]);
    expect(reminder.nextFireAt).toBe('2026-03-02T14:30:00.000Z');
    expect(describeReminderSchedule(reminder)).toBe('Mon, Fri at 08:30');
    expect(normalizeReminderDays([5, 1, 1])).toEqual([1, 5]);
  });
});
