import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { DexieLocalEntryRepository } from '@/data/local';
import type { MoodEntry } from '@/domain';
import { useAuth } from '@/features/auth';
import {
  addMonths,
  buildCalendarDays,
  dailyAverages,
  startOfMonth,
} from '@/pages/calendar-utils';

const moodColors = [
  'var(--mood-awful)',
  'var(--mood-bad)',
  'var(--mood-meh)',
  'var(--mood-good)',
  'var(--mood-rad)',
];

export function CalendarPage() {
  const { status, user } = useAuth();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setEntries(await new DexieLocalEntryRepository().listForUser(user.uid));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const days = useMemo(() => buildCalendarDays(month), [month]);
  const averagesByDate = useMemo(() => dailyAverages(entries), [entries]);
  const selectedEntries = useMemo(
    () =>
      selectedDate
        ? entries.filter((entry) => entry.occurredLocalDate === selectedDate)
        : [],
    [entries, selectedDate],
  );
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(month);

  if (status === 'loading' || loading) return <LoadingState />;
  if (!user) return <SignedOutState />;

  return (
    <section className="mx-auto max-w-5xl pb-8">
      <p className="text-primary text-sm font-medium">Calendar</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Your month at a glance
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl leading-7">
            Each colored day is its average mood. Uncolored days mean no entry
            was recorded—not a neutral mood.
          </p>
        </div>
        <Button onClick={() => void load()} variant="outline">
          Refresh
        </Button>
      </div>

      <article className="border-border bg-card mt-7 rounded-3xl border p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <Button
            aria-label="Previous month"
            onClick={() => setMonth((value) => addMonths(value, -1))}
            size="icon"
            variant="ghost"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Button>
          <h2 className="text-center text-lg font-semibold" aria-live="polite">
            {monthLabel}
          </h2>
          <Button
            aria-label="Next month"
            onClick={() => setMonth((value) => addMonths(value, 1))}
            size="icon"
            variant="ghost"
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </Button>
        </div>
        <div className="mt-3 flex justify-center">
          <Button
            onClick={() => setMonth(startOfMonth(new Date()))}
            size="sm"
            variant="outline"
          >
            Today
          </Button>
        </div>

        <div className="text-muted-foreground mt-6 grid grid-cols-7 gap-1 text-center text-xs font-medium sm:gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name) => (
            <div key={name}>{name}</div>
          ))}
        </div>
        <div
          className="mt-2 grid grid-cols-7 gap-1 sm:gap-2"
          role="grid"
          aria-label={`${monthLabel} mood calendar`}
        >
          {days.map((day) => {
            const summary = averagesByDate.get(day.date);
            const isSelected = day.date === selectedDate;
            const label = summary
              ? `${formatLongDate(day.date)}: average mood ${summary.average.toFixed(2)} from ${summary.count} ${summary.count === 1 ? 'entry' : 'entries'}`
              : `${formatLongDate(day.date)}: no entries`;
            return (
              <button
                aria-label={label}
                className={`focus-visible:ring-ring relative min-h-15 rounded-xl border p-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none sm:min-h-22 sm:p-2 ${day.inMonth ? 'bg-background hover:bg-accent' : 'bg-muted/50 text-muted-foreground'} ${isSelected ? 'ring-primary ring-offset-card ring-2 ring-offset-2' : 'border-transparent'}`}
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
                type="button"
              >
                <span className="text-xs font-medium">{day.dayNumber}</span>
                {summary ? (
                  <span
                    aria-hidden="true"
                    className="mt-1 block h-2.5 w-full rounded-full sm:mt-2 sm:h-3"
                    style={{ backgroundColor: moodColor(summary.average) }}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="bg-muted mt-1 block h-2.5 w-full rounded-full sm:mt-2 sm:h-3"
                  />
                )}
                <span className="text-muted-foreground mt-1 hidden text-[10px] sm:block">
                  {summary
                    ? `${summary.count} ${summary.count === 1 ? 'entry' : 'entries'}`
                    : 'No data'}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-muted-foreground mt-4 text-xs">
          Select a day to view its entries. No data is shown in gray.
        </p>
      </article>

      {selectedDate ? (
        <DayEntries date={selectedDate} entries={selectedEntries} />
      ) : null}
    </section>
  );
}

function DayEntries({ date, entries }: { date: string; entries: MoodEntry[] }) {
  return (
    <article className="border-border bg-card mt-6 rounded-3xl border p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">{formatLongDate(date)}</h2>
      {entries.length ? (
        <ol className="divide-border mt-4 divide-y">
          {entries.map((entry) => (
            <li className="py-3 first:pt-0 last:pb-0" key={entry.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">
                  Mood {entry.moodRating} of 5
                </span>
                <time
                  className="text-muted-foreground text-sm"
                  dateTime={entry.occurredAtUtc}
                >
                  {formatTime(entry.occurredAtUtc, entry.occurredTimeZone)}
                </time>
              </div>
              {entry.notePlainText ? (
                <p className="text-muted-foreground mt-1 text-sm leading-6 whitespace-pre-wrap">
                  {entry.notePlainText}
                </p>
              ) : null}
              {entry.activityTags?.length ? (
                <p className="text-primary mt-2 text-xs">
                  {entry.activityTags.map((tag) => `#${tag}`).join('  ')}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground mt-2 leading-6">
          No entries were recorded on this date.
        </p>
      )}
    </article>
  );
}

function moodColor(average: number) {
  return moodColors[Math.max(0, Math.min(4, Math.round(average) - 1))]!;
}
function formatLongDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`));
}
function formatTime(timestamp: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(timestamp));
}
function LoadingState() {
  return (
    <div className="text-muted-foreground flex items-center gap-2 py-12">
      <LoaderCircle className="size-5 animate-spin" /> Loading your calendar…
    </div>
  );
}
function SignedOutState() {
  return (
    <section>
      <p className="text-primary text-sm font-medium">Calendar</p>
      <h1 className="mt-1 text-3xl font-semibold">Your month at a glance</h1>
      <p className="text-muted-foreground mt-3 leading-7">
        Sign in to see your private local-date mood calendar.
      </p>
    </section>
  );
}
