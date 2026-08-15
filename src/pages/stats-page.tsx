import {
  BarChart3,
  CalendarDays,
  Flame,
  LoaderCircle,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { calculateMoodStatistics, type MoodStatistics } from '@/domain';
import { DexieLocalEntryRepository } from '@/data/local';
import { useAuth } from '@/features/auth';

const moodLabels = ['Awful', 'Bad', 'Meh', 'Good', 'Rad'];
const moodColors = [
  'var(--mood-awful)',
  'var(--mood-bad)',
  'var(--mood-meh)',
  'var(--mood-good)',
  'var(--mood-rad)',
];
const chartWindowDays = 14;

type ChartView = 'bar' | 'line';
type ChartWindowDirection = 'older' | 'newer';
type ChartDay = { date: string; average: number | null; entryCount: number };

export function StatsPage() {
  const { status, user } = useAuth();
  const [stats, setStats] = useState<MoodStatistics | null>(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [chartView, setChartView] = useState<ChartView>('bar');
  const [windowOffset, setWindowOffset] = useState(0);
  const [chartWindowDirection, setChartWindowDirection] =
    useState<ChartWindowDirection>('older');

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

  const chartDays = useMemo(
    () => (stats ? buildChartDays(stats.dailyMoods, windowOffset) : []),
    [stats, windowOffset],
  );

  if (status === 'loading' || loading) return <LoadingState />;
  if (!user) return <SignedOutState />;
  if (!stats || stats.entries === 0) return <EmptyState />;

  const oldestDate = stats.dailyMoods[0]?.date;
  const canViewOlder = Boolean(
    oldestDate && chartDays[0] && chartDays[0].date > oldestDate,
  );
  const maxEntries = Math.max(...chartDays.map((day) => day.entryCount), 1);
  const chartWindowKey = chartDays[0]?.date ?? 'empty';

  const showOlderEntries = () => {
    setChartWindowDirection('older');
    setWindowOffset((offset) => offset + 1);
  };

  const showNewerEntries = () => {
    setChartWindowDirection('newer');
    setWindowOffset((offset) => Math.max(0, offset - 1));
  };
  const rangeLabel = `${formatDate(chartDays[0]?.date)} – ${formatDate(chartDays.at(-1)?.date)}`;

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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Daily mood</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {rangeLabel}. Missing days remain gaps.
              </p>
            </div>
            <div
              className="bg-muted flex rounded-lg p-1"
              aria-label="Chart type"
              role="group"
            >
              <ChartToggle
                active={chartView === 'bar'}
                onClick={() => setChartView('bar')}
              >
                Bars
              </ChartToggle>
              <ChartToggle
                active={chartView === 'line'}
                onClick={() => setChartView('line')}
              >
                Smooth line
              </ChartToggle>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              className="border-input hover:bg-muted rounded-lg border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canViewOlder}
              onClick={showOlderEntries}
              type="button"
            >
              ← Older
            </button>
            <button
              className="border-input hover:bg-muted rounded-lg border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              disabled={windowOffset === 0}
              onClick={showNewerEntries}
              type="button"
            >
              Newer →
            </button>
          </div>
          <div
            className={`stats-chart-window stats-chart-window--${chartWindowDirection}`}
            key={chartWindowKey}
          >
            {chartView === 'bar' ? (
              <MoodBarChart days={chartDays} />
            ) : (
              <MoodLineChart days={chartDays} />
            )}
          </div>
          <p className="text-muted-foreground mt-5 text-xs leading-5">
            Daily mood is the average of all entries recorded on the same local
            calendar date. The line is constrained to the 1–5 scale and does not
            connect missing days.
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
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: moodColors[index],
                      width: `${(count / stats.entries) * 100}%`,
                    }}
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
          Entries per day for the selected period.
        </p>
        <div
          aria-label="Logging activity in selected period"
          aria-live="polite"
          className={`stats-chart-window stats-chart-window--${chartWindowDirection}`}
          key={chartWindowKey}
        >
          <div className="mt-5 flex h-20 items-end gap-1.5">
            {chartDays.map((day) => (
              <div
                className="bg-secondary min-w-0 flex-1 rounded-t-md"
                key={day.date}
                style={{
                  height: day.entryCount
                    ? `${Math.max(8, (day.entryCount / maxEntries) * 72)}px`
                    : '2px',
                }}
                title={`${day.date}: ${day.entryCount} entries`}
              />
            ))}
          </div>
        </div>
      </article>
    </section>
  );
}

function ChartToggle({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`rounded-md px-2.5 py-1 text-xs font-medium ${active ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function MoodBarChart({ days }: { days: ChartDay[] }) {
  return (
    <div
      className="mt-7 flex h-44 items-end gap-2"
      aria-label="Daily mood bar chart"
    >
      {days.map((day) => (
        <div
          className="group flex min-w-0 flex-1 flex-col items-center gap-2"
          key={day.date}
        >
          {day.average === null ? (
            <div
              className="bg-muted mt-auto h-0.5 w-full"
              title={`${day.date}: no entries`}
            />
          ) : (
            <>
              <div className="text-muted-foreground invisible text-[10px] whitespace-nowrap group-hover:visible">
                {formatMood(day.average)}
              </div>
              <div
                className="mood-chart-bar-gradient w-full rounded-t-xl transition-opacity group-hover:opacity-80"
                style={{ height: `${Math.max(12, (day.average / 5) * 115)}px` }}
                title={`${day.date}: ${formatMood(day.average)} from ${day.entryCount} entries`}
              />
            </>
          )}
          <span className="text-muted-foreground text-[10px]">
            {day.date.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}

function MoodLineChart({ days }: { days: ChartDay[] }) {
  const paths = buildSmoothPaths(days);
  return (
    <div className="mt-7 h-44" aria-label="Daily mood smooth line chart">
      <svg
        className="h-full w-full overflow-visible"
        preserveAspectRatio="none"
        role="img"
        viewBox="0 0 100 100"
      >
        <title>Daily mood averages from 1 to 5; missing days are gaps.</title>
        <defs>
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id="daily-mood-line-gradient"
            x1="0"
            x2="0"
            y1="100"
            y2="0"
          >
            {moodColors.map((color, index) => (
              <stop key={color} offset={`${index * 25}%`} stopColor={color} />
            ))}
          </linearGradient>
        </defs>
        <line
          stroke="currentColor"
          className="text-border"
          strokeDasharray="2 2"
          x1="0"
          x2="100"
          y1="0"
          y2="0"
        />
        <line
          stroke="currentColor"
          className="text-border"
          strokeDasharray="2 2"
          x1="0"
          x2="100"
          y1="100"
          y2="100"
        />
        {paths.map((path, index) => (
          <path
            d={path}
            fill="none"
            key={index}
            stroke="url(#daily-mood-line-gradient)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {days.map((day, index) =>
          day.average === null ? null : (
            <circle
              cx={xFor(index, days.length)}
              cy={yFor(day.average)}
              key={day.date}
              r="1.7"
              fill={moodColorFor(day.average)}
            >
              <title>{`${day.date}: ${formatMood(day.average)} from ${day.entryCount} entries`}</title>
            </circle>
          ),
        )}
      </svg>
      <div className="text-muted-foreground mt-2 flex justify-between text-[10px]">
        <span>{days[0]?.date}</span>
        <span>{days.at(-1)?.date}</span>
      </div>
    </div>
  );
}

function buildChartDays(
  dailyMoods: MoodStatistics['dailyMoods'],
  offset: number,
): ChartDay[] {
  const last = dailyMoods.at(-1)?.date;
  if (!last) return [];
  const dayByDate = new Map(dailyMoods.map((day) => [day.date, day]));
  const end = addLocalDays(last, -offset * chartWindowDays);
  return Array.from({ length: chartWindowDays }, (_, index) => {
    const date = addLocalDays(end, index - (chartWindowDays - 1));
    const day = dayByDate.get(date);
    return {
      date,
      average: day?.average ?? null,
      entryCount: day?.entryCount ?? 0,
    };
  });
}

function buildSmoothPaths(days: ChartDay[]) {
  const paths: string[] = [];
  let segment: Array<{ x: number; y: number }> = [];
  const addSegment = () => {
    if (!segment.length) return;
    const firstPoint = segment[0]!;
    let path = `M ${firstPoint.x} ${firstPoint.y}`;
    for (let index = 1; index < segment.length; index += 1) {
      const previous = segment[index - 1]!;
      const point = segment[index]!;
      const middle = (previous.x + point.x) / 2;
      path += ` C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
    }
    paths.push(path);
    segment = [];
  };
  days.forEach((day, index) => {
    if (day.average === null) {
      addSegment();
      return;
    }
    segment.push({ x: xFor(index, days.length), y: yFor(day.average) });
  });
  addSegment();
  return paths;
}

function xFor(index: number, total: number) {
  return total === 1 ? 50 : (index / (total - 1)) * 100;
}
function yFor(average: number) {
  return 100 - ((Math.min(5, Math.max(1, average)) - 1) / 4) * 100;
}
function moodColorFor(average: number) {
  const index = Math.min(4, Math.max(0, Math.round(average) - 1));
  return moodColors[index]!;
}
function addLocalDays(date: string, amount: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}
function formatDate(date: string | undefined) {
  return date
    ? new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${date}T00:00:00.000Z`))
    : '';
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
