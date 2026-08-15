import {
  BarChart3,
  CalendarDays,
  Flame,
  LoaderCircle,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { calculateMoodStatistics, type MoodStatistics } from '@/domain';
import { DexieLocalEntryRepository } from '@/data/local';
import { useAuth } from '@/features/auth';

const moodLabels = ['Awful', 'Bad', 'Meh', 'Good', 'Rad'];
const moodColors = [
  'bg-rose-500',
  'bg-orange-500',
  'bg-amber-400',
  'bg-lime-500',
  'bg-emerald-500',
];

export function StatsPage() {
  const { status, user } = useAuth();
  const [stats, setStats] = useState<MoodStatistics | null>(null);
  const [loading, setLoading] = useState(Boolean(user));

  const load = useCallback(async () => {
    if (!user) {
      setStats(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const entries = await new DexieLocalEntryRepository().listForUser(user.uid);
    setStats(calculateMoodStatistics(entries));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  if (status === 'loading' || loading) {
    return <LoadingState />;
  }

  if (!user) return <SignedOutState />;
  if (!stats || stats.entries === 0) return <EmptyState />;

  const recentDays = stats.dailyMoods.slice(-14);
  const maxEntries = Math.max(...recentDays.map((day) => day.entryCount));

  return (
    <section className="mx-auto max-w-5xl pb-8">
      <p className="text-primary text-sm font-medium">Stats</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Your mood, clearly
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl leading-7">
            Based on {stats.entries} entries across {stats.loggedDays} logged{' '}
            {stats.loggedDays === 1 ? 'day' : 'days'}.
          </p>
        </div>
        <button
          className="text-primary text-sm font-medium underline-offset-4 hover:underline"
          onClick={() => void load()}
          type="button"
        >
          Refresh
        </button>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Average daily mood"
          value={formatMood(stats.averageDailyMood)}
        />
        <StatCard
          icon={CalendarDays}
          label="Logged days"
          value={String(stats.loggedDays)}
        />
        <StatCard
          icon={Flame}
          label="Current chain"
          value={`${stats.currentChain} days`}
        />
        <StatCard
          icon={BarChart3}
          label="Longest chain"
          value={`${stats.longestChain} days`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <article className="border-border bg-card rounded-3xl border p-5 shadow-sm sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Daily mood</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Your last {recentDays.length} logged days. Each dot is that
                day&apos;s average.
              </p>
            </div>
            <span className="text-muted-foreground text-xs">1–5 scale</span>
          </div>
          <div
            className="mt-7 flex h-44 items-end gap-2"
            aria-label="Daily mood chart"
          >
            {recentDays.map((day) => (
              <div
                className="group flex min-w-0 flex-1 flex-col items-center gap-2"
                key={day.date}
              >
                <div className="text-muted-foreground invisible text-[10px] whitespace-nowrap group-hover:visible">
                  {formatMood(day.average)}
                </div>
                <div
                  className="bg-primary w-full rounded-t-xl transition-opacity group-hover:opacity-80"
                  style={{
                    height: `${Math.max(12, (day.average / 5) * 115)}px`,
                  }}
                  title={`${day.date}: ${formatMood(day.average)} from ${day.entryCount} entries`}
                />
                <span className="text-muted-foreground text-[10px]">
                  {day.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-5 text-xs leading-5">
            Daily mood is the average of all entries recorded on the same local
            calendar date. Missing days are not treated as neutral.
          </p>
        </article>

        <article className="border-border bg-card rounded-3xl border p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">Mood distribution</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            How individual entries are rated.
          </p>
          <div className="mt-6 space-y-4">
            {stats.distribution.map((count, index) => (
              <div key={moodLabels[index]}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span>{moodLabels[index]}</span>
                  <span className="text-muted-foreground">
                    {count} · {Math.round((count / stats.entries) * 100)}%
                  </span>
                </div>
                <div className="bg-muted h-2.5 overflow-hidden rounded-full">
                  <div
                    className={`${moodColors[index]} h-full rounded-full`}
                    style={{ width: `${(count / stats.entries) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-6 text-xs leading-5">
            This counts entries, not days—multiple check-ins on one day each
            count here.
          </p>
        </article>
      </div>

      <article className="border-border bg-card mt-6 rounded-3xl border p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Logging activity</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Entries recorded per logged day in the recent period.
        </p>
        <div
          className="mt-5 flex h-20 items-end gap-1.5"
          aria-label="Recent logging activity"
        >
          {recentDays.map((day) => (
            <div
              className="bg-secondary min-w-0 flex-1 rounded-t-md"
              key={day.date}
              style={{
                height: `${Math.max(8, (day.entryCount / maxEntries) * 72)}px`,
              }}
              title={`${day.date}: ${day.entryCount} entries`}
            />
          ))}
        </div>
      </article>
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
}) {
  return (
    <article className="border-border bg-card rounded-2xl border p-4 shadow-sm">
      <Icon className="text-primary size-5" />
      <p className="text-muted-foreground mt-4 text-sm">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </article>
  );
}

function formatMood(value: number | null) {
  return value === null ? '—' : value.toFixed(2);
}
function LoadingState() {
  return (
    <div className="text-muted-foreground flex items-center gap-2 py-12">
      <LoaderCircle className="size-5 animate-spin" /> Loading your statistics…
    </div>
  );
}
function SignedOutState() {
  return (
    <section>
      <p className="text-primary text-sm font-medium">Stats</p>
      <h1 className="mt-1 text-3xl font-semibold">Your mood, clearly</h1>
      <p className="text-muted-foreground mt-3 leading-7">
        Sign in to see patterns from your private entries.
      </p>
    </section>
  );
}
function EmptyState() {
  return (
    <section>
      <p className="text-primary text-sm font-medium">Stats</p>
      <h1 className="mt-1 text-3xl font-semibold">Your mood, clearly</h1>
      <div className="border-border bg-card mt-7 max-w-xl rounded-3xl border p-6 shadow-sm">
        <h2 className="text-lg font-semibold">No entries yet</h2>
        <p className="text-muted-foreground mt-2 leading-6">
          Add a few check-ins and this page will show your daily averages,
          streaks, and mood distribution.
        </p>
      </div>
    </section>
  );
}
