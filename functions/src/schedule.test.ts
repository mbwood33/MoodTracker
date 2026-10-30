import assert from 'node:assert/strict';
import test from 'node:test';

import { nextReminderOccurrence } from './schedule.js';

test('nextReminderOccurrence uses the selected local weekday and time', () => {
  assert.equal(
    nextReminderOccurrence(
      {
        daysOfWeek: [1, 3, 5],
        localTime: '09:15',
        timeZone: 'America/Chicago',
      },
      new Date('2026-10-05T14:00:00.000Z'),
    ),
    '2026-10-05T14:15:00.000Z',
  );
});

test('nextReminderOccurrence moves to the next selected day after time passes', () => {
  assert.equal(
    nextReminderOccurrence(
      { daysOfWeek: [1, 4], localTime: '09:00', timeZone: 'America/Chicago' },
      new Date('2026-10-05T15:00:00.000Z'),
    ),
    '2026-10-08T14:00:00.000Z',
  );
});

test('nextReminderOccurrence moves a skipped DST wall time forward', () => {
  assert.equal(
    nextReminderOccurrence(
      { daysOfWeek: [0], localTime: '02:30', timeZone: 'America/Chicago' },
      new Date('2026-03-07T18:00:00.000Z'),
    ),
    '2026-03-08T08:00:00.000Z',
  );
});
