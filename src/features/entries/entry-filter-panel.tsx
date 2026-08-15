import { Search, SlidersHorizontal, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { ActivityTagFilter } from './activity-tag-input';
import {
  emptyEntryFilters,
  hasActiveEntryFilters,
  type EntryFilters,
} from './entry-filters';
import { energyLevels, moods, type MoodRating } from './types';

type EntryFilterPanelProps = {
  filters: EntryFilters;
  tags: string[];
  resultCount: number;
  onChange: (filters: EntryFilters) => void;
};

function ratingFrom(value: string): '' | MoodRating {
  return value ? (Number(value) as MoodRating) : '';
}

export function EntryFilterPanel({
  filters,
  tags,
  resultCount,
  onChange,
}: EntryFilterPanelProps) {
  const update = (changes: Partial<EntryFilters>) =>
    onChange({ ...filters, ...changes });

  return (
    <section
      className="border-border bg-card rounded-2xl border p-4 shadow-sm"
      aria-labelledby="entry-filters-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          <h2 className="font-semibold" id="entry-filters-title">
            Filter entries
          </h2>
        </div>
        {hasActiveEntryFilters(filters) ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(emptyEntryFilters)}
          >
            <X aria-hidden="true" className="size-4" /> Clear filters
          </Button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium sm:col-span-2 xl:col-span-1">
          Search notes and tags
          <span className="relative">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <input
              aria-label="Search notes and activity tags"
              className="border-input bg-background h-10 w-full rounded-xl border pr-3 pl-9"
              placeholder="Search your entries"
              value={filters.search}
              onChange={(event) => update({ search: event.target.value })}
            />
          </span>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          From date
          <input
            aria-label="Filter from date"
            className="border-input bg-background h-10 rounded-xl border px-3"
            type="date"
            value={filters.fromDate}
            onChange={(event) => update({ fromDate: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          To date
          <input
            aria-label="Filter to date"
            className="border-input bg-background h-10 rounded-xl border px-3"
            type="date"
            value={filters.toDate}
            onChange={(event) => update({ toDate: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Mood
          <select
            aria-label="Filter by mood"
            className="border-input bg-background h-10 rounded-xl border px-3"
            value={filters.moodRating}
            onChange={(event) => update({ moodRating: ratingFrom(event.target.value) })}
          >
            <option value="">All moods</option>
            {moods.map((mood) => (
              <option key={mood.rating} value={mood.rating}>
                {mood.face} {mood.label}
              </option>
            ))}
          </select>
        </label>
        <ActivityTagFilter
          value={filters.activityTag}
          tags={tags}
          onChange={(activityTag) => update({ activityTag })}
        />
        <label className="grid gap-1 text-sm font-medium">
          Energy
          <select
            aria-label="Filter by energy rating"
            className="border-input bg-background h-10 rounded-xl border px-3"
            value={filters.energyRating}
            onChange={(event) =>
              update({
                energyRating:
                  event.target.value === 'none'
                    ? 'none'
                    : ratingFrom(event.target.value),
              })
            }
          >
            <option value="">Any energy</option>
            <option value="none">No energy rating</option>
            {energyLevels.map((energy) => (
              <option key={energy.rating} value={energy.rating}>
                {energy.rating}/5 — {energy.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-10 items-center gap-2 self-end text-sm font-medium">
          <input
            aria-label="Only entries with notes"
            className="size-4 accent-primary"
            type="checkbox"
            checked={filters.hasNote}
            onChange={(event) => update({ hasNote: event.target.checked })}
          />
          Has a note
        </label>
      </div>
      <p className="text-muted-foreground mt-3 text-sm" aria-live="polite">
        {resultCount} {resultCount === 1 ? 'entry' : 'entries'} found
      </p>
    </section>
  );
}
