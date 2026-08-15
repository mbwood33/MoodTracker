import { ChevronDown, Image, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getDownloadURL, ref } from 'firebase/storage';

import { Button } from '@/components/ui/button';
import { getFirebaseServices } from '@/data/remote/firebase';

import { energyFor, moodFor, type MoodEntry } from './types';

const recentlyDeletedRetentionMs = 30 * 24 * 60 * 60 * 1000;
const entriesPerPage = 10;

type EntryTimelineProps = {
  entries: MoodEntry[];
  /** Deleted entries remain available for recovery even when active entries are filtered. */
  deletedEntries?: MoodEntry[];
  emptyActiveMessage?: string;
  emptyStateMessage?: string;
  onEdit: (entry: MoodEntry) => void;
  onDelete: (entry: MoodEntry) => void;
  onRestore: (entry: MoodEntry) => void;
};

function formatOccurredAt(value: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value));
}

function PhotoThumbnail({ storagePath }: { storagePath: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const firebase = getFirebaseServices();
    if (!firebase) return;
    void getDownloadURL(ref(firebase.storage, storagePath)).then(setUrl).catch(() => setUrl(null));
  }, [storagePath]);
  return url ? <img className="mt-3 h-24 w-24 rounded-xl object-cover" src={url} alt="Attached entry" /> : <p className="text-muted-foreground mt-3 inline-flex items-center gap-1 text-xs"><Image className="size-3.5" /> Photo attached</p>;
}

export function EntryTimeline({
  entries,
  deletedEntries: suppliedDeletedEntries,
  emptyActiveMessage = 'No active entries.',
  emptyStateMessage,
  onEdit,
  onDelete,
  onRestore,
}: EntryTimelineProps) {
  const [recentlyDeletedCutoff] = useState(
    () => Date.now() - recentlyDeletedRetentionMs,
  );
  const [visibleEntryCount, setVisibleEntryCount] = useState(entriesPerPage);
  const visibleEntries = entries
    .filter((entry) => entry.deletedAt === null)
    .sort(
      (first, second) =>
        new Date(second.occurredAt).getTime() -
        new Date(first.occurredAt).getTime(),
    );
  const deletedEntries = (suppliedDeletedEntries ?? entries)
    .filter(
      (entry) =>
        entry.deletedAt !== null &&
        new Date(entry.deletedAt).getTime() >= recentlyDeletedCutoff,
    )
    .sort(
      (first, second) =>
        new Date(second.deletedAt ?? 0).getTime() -
        new Date(first.deletedAt ?? 0).getTime(),
    );
  const displayedEntries = visibleEntries.slice(0, visibleEntryCount);
  const remainingEntryCount = Math.max(
    visibleEntries.length - displayedEntries.length,
    0,
  );

  if (visibleEntries.length === 0 && deletedEntries.length === 0) {
    return (
      <p className="text-muted-foreground rounded-2xl border border-dashed p-6 text-sm">
        {emptyStateMessage ??
          'No entries yet. Your first check-in can be as simple as choosing a mood.'}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {visibleEntries.length > 0 ? (
        <>
          <ol className="space-y-3" aria-label="Mood entries">
            {displayedEntries.map((entry) => {
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
                      {entry.activityTags.length ? (
                        <ul
                          className="mt-3 flex flex-wrap gap-1.5"
                          aria-label="Activities and tags"
                        >
                          {entry.activityTags.map((tag) => (
                            <li
                              className="bg-secondary rounded-full px-2 py-0.5 text-xs"
                              key={tag.toLocaleLowerCase()}
                            >
                              #{tag}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {entry.photo ? <PhotoThumbnail storagePath={entry.photo.storagePath} /> : null}
                      {entry.energyRating ? (
                        <p className="text-muted-foreground mt-3 text-sm">
                          Energy: {energyFor(entry.energyRating).label} (
                          {entry.energyRating}/5)
                        </p>
                      ) : null}
                      <div className="mt-3 flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(entry)}
                        >
                          <Pencil aria-hidden="true" className="size-3.5" />{' '}
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(entry)}
                        >
                          <Trash2 aria-hidden="true" className="size-3.5" />{' '}
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          {remainingEntryCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() =>
                setVisibleEntryCount((current) => current + entriesPerPage)
              }
            >
              <ChevronDown aria-hidden="true" className="size-4" />
              Show {Math.min(entriesPerPage, remainingEntryCount)} previous{' '}
              {Math.min(entriesPerPage, remainingEntryCount) === 1
                ? 'entry'
                : 'entries'}
              <span className="text-muted-foreground">
                ({remainingEntryCount} remaining)
              </span>
            </Button>
          ) : null}
        </>
      ) : (
        <p className="text-muted-foreground rounded-2xl border border-dashed p-4 text-sm">
          {emptyActiveMessage}
        </p>
      )}
      {deletedEntries.length > 0 ? (
        <section aria-labelledby="recently-deleted-title">
          <h3 className="text-base font-semibold" id="recently-deleted-title">
            Recently deleted (last 30 days)
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Restore an entry within 30 days. Restored entries are saved locally
            immediately and synchronize when a connection is available.
          </p>
          <ol className="mt-3 space-y-3" aria-label="Recently deleted entries">
            {deletedEntries.map((entry) => {
              const mood = moodFor(entry.moodRating);
              return (
                <li
                  className="bg-card border-border rounded-2xl border p-4 shadow-sm"
                  key={entry.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{mood.label}</p>
                      <p className="text-muted-foreground text-sm">
                        {formatOccurredAt(
                          entry.occurredAt,
                          entry.occurredTimeZone,
                        )}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onRestore(entry)}
                    >
                      Restore entry
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
