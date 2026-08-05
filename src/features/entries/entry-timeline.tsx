import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { moodFor, type MoodEntry } from './types';

type EntryTimelineProps = {
  entries: MoodEntry[];
  onEdit: (entry: MoodEntry) => void;
  onDelete: (entry: MoodEntry) => void;
};

function formatOccurredAt(value: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value));
}

export function EntryTimeline({
  entries,
  onEdit,
  onDelete,
}: EntryTimelineProps) {
  const visibleEntries = entries
    .filter((entry) => entry.deletedAt === null)
    .sort(
      (first, second) =>
        new Date(second.occurredAt).getTime() -
        new Date(first.occurredAt).getTime(),
    );

  if (visibleEntries.length === 0) {
    return (
      <p className="text-muted-foreground rounded-2xl border border-dashed p-6 text-sm">
        No entries yet. Your first check-in can be as simple as choosing a mood.
      </p>
    );
  }

  return (
    <ol className="space-y-3" aria-label="Mood entries">
      {visibleEntries.map((entry) => {
        const mood = moodFor(entry.moodRating);
        return (
          <li
            className="bg-card border-border rounded-2xl border p-4 shadow-sm"
            key={entry.id}
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="bg-secondary grid size-11 shrink-0 place-items-center rounded-xl text-2xl"
              >
                {mood.face}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{mood.label}</p>
                    <p className="text-muted-foreground text-sm">
                      {formatOccurredAt(
                        entry.occurredAt,
                        entry.occurredTimeZone,
                      )}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-xs capitalize">
                    {entry.syncStatus.replace('-', ' ')}
                  </span>
                </div>
                {entry.note ? (
                  <p className="mt-3 text-sm leading-6 whitespace-pre-wrap">
                    {entry.note}
                  </p>
                ) : null}
                {entry.energyRating ? (
                  <p className="text-muted-foreground mt-3 text-sm">
                    Energy: {entry.energyRating}/5
                  </p>
                ) : null}
                <div className="mt-3 flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(entry)}
                  >
                    <Pencil aria-hidden="true" className="size-3.5" /> Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(entry)}
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
