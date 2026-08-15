import { useMemo, useState } from 'react';

import { EntryComposer } from './entry-composer';
import { EntryTimeline } from './entry-timeline';
import type { EntryDraft, EntryRepositoryAdapter, MoodEntry } from './types';

type EntryWorkspaceProps = {
  repository?: EntryRepositoryAdapter;
  entries?: MoodEntry[];
  onCreate?: (draft: EntryDraft) => Promise<void> | void;
  onUpdate?: (id: string, draft: EntryDraft) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  showTimeline?: boolean;
};

function createEntry(draft: EntryDraft): MoodEntry {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    ...draft,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: 'saved-locally',
  };
}

/**
 * Temporary presentation adapter. Parent composition can supply callbacks from
 * the local-first repository; until then this offers a non-persistent preview.
 */
export function EntryWorkspace({
  repository,
  entries,
  onCreate,
  onUpdate,
  onDelete,
  showTimeline = true,
}: EntryWorkspaceProps) {
  const [previewEntries, setPreviewEntries] = useState<MoodEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<MoodEntry | undefined>();
  const currentEntries = repository?.entries ?? entries ?? previewEntries;
  const heading = editingEntry ? 'Edit entry' : 'Check in';

  const actions = useMemo(
    () => ({
      create: async (draft: EntryDraft) => {
        if (repository) await repository.create(draft);
        else if (onCreate) await onCreate(draft);
        else setPreviewEntries((current) => [createEntry(draft), ...current]);
      },
      update: async (id: string, draft: EntryDraft) => {
        if (repository) await repository.update(id, draft);
        else if (onUpdate) await onUpdate(id, draft);
        else
          setPreviewEntries((current) =>
            current.map((item) =>
              item.id === id
                ? { ...item, ...draft, updatedAt: new Date().toISOString() }
                : item,
            ),
          );
      },
      remove: async (entry: MoodEntry) => {
        if (repository) await repository.remove(entry.id);
        else if (onDelete) await onDelete(entry.id);
        else
          setPreviewEntries((current) =>
            current.map((item) =>
              item.id === entry.id
                ? { ...item, deletedAt: new Date().toISOString() }
                : item,
            ),
          );
      },
      restore: async (entry: MoodEntry) => {
        if (repository) await repository.restore(entry.id);
        else
          setPreviewEntries((current) =>
            current.map((item) =>
              item.id === entry.id
                ? {
                    ...item,
                    deletedAt: null,
                    updatedAt: new Date().toISOString(),
                  }
                : item,
            ),
          );
      },
    }),
    [onCreate, onDelete, onUpdate, repository],
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.9fr)] lg:items-start">
      <section aria-labelledby="entry-composer-title">
        <h2 className="mb-3 text-xl font-semibold" id="entry-composer-title">
          {heading}
        </h2>
        <EntryComposer
          entry={editingEntry}
          key={editingEntry?.id ?? 'new-entry'}
          onCancel={editingEntry ? () => setEditingEntry(undefined) : undefined}
          onSubmit={async (draft) => {
            if (editingEntry) {
              await actions.update(editingEntry.id, draft);
              setEditingEntry(undefined);
            } else await actions.create(draft);
          }}
        />
      </section>
      {showTimeline ? (
        <section aria-labelledby="entry-timeline-title">
          <h2 className="mb-3 text-xl font-semibold" id="entry-timeline-title">
            Recent entries
          </h2>
          <EntryTimeline
            entries={currentEntries}
            onEdit={setEditingEntry}
            onDelete={(entry) => void actions.remove(entry)}
            onRestore={(entry) => void actions.restore(entry)}
          />
        </section>
      ) : null}
    </div>
  );
}
