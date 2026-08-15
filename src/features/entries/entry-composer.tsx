import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarClock, ChevronDown, ImagePlus, Save, X } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import type { JSONContent } from '@tiptap/react';

import { Button } from '@/components/ui/button';

import { NoteEditor } from './note-editor';
import { ActivityTagInput } from './activity-tag-input';
import { normalizeActivityTags } from './activity-tags';

import {
  energyLevels,
  moods,
  type EntryDraft,
  type MoodEntry,
  type MoodRating,
} from './types';

const entryFormSchema = z.object({
  moodRating: z.coerce.number().int().min(1).max(5),
  note: z.string().max(10_000),
  energyRating: z.union([z.literal(''), z.coerce.number().int().min(1).max(5)]),
  occurredAt: z.string().min(1, 'Choose a date and time.'),
});

type EntryFormValues = z.infer<typeof entryFormSchema>;

type EntryComposerProps = {
  entry?: MoodEntry;
  tagSuggestions?: string[];
  onSubmit: (draft: EntryDraft) => Promise<void> | void;
  onCancel?: () => void;
};

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function currentTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function EntryComposer({
  entry,
  tagSuggestions = [],
  onSubmit,
  onCancel,
}: EntryComposerProps) {
  const [detailsOpen, setDetailsOpen] = useState(Boolean(entry));
  const [noteJson, setNoteJson] = useState<JSONContent | null>(
    entry?.noteJson ?? null,
  );
  const [activityTags, setActivityTags] = useState(entry?.activityTags ?? []);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: {
      moodRating: entry?.moodRating ?? 3,
      note: entry?.note ?? '',
      energyRating: entry?.energyRating ?? '',
      occurredAt: entry
        ? toDateTimeLocal(entry.occurredAt)
        : toDateTimeLocal(new Date().toISOString()),
    },
  });

  const selectedMood = useWatch({ control: form.control, name: 'moodRating' });
  const note = useWatch({ control: form.control, name: 'note' });

  const submit = form.handleSubmit(async (values) => {
    await onSubmit({
      moodRating: values.moodRating as MoodRating,
      note: values.note.trim(),
      noteJson,
      activityTags: normalizeActivityTags(activityTags),
      energyRating:
        values.energyRating === '' ? null : (values.energyRating as MoodRating),
      occurredAt: new Date(values.occurredAt).toISOString(),
      occurredTimeZone: entry?.occurredTimeZone ?? currentTimeZone(),
      occurredLocalDate: values.occurredAt.slice(0, 10),
      photo: removeExistingPhoto ? null : (entry?.photo ?? null),
      photoFile,
    });
  });

  return (
    <form
      className="bg-card border-border rounded-3xl border p-5 shadow-sm sm:p-6"
      onSubmit={submit}
    >
      <fieldset>
        <legend className="text-lg font-semibold">How are you feeling?</legend>
        <p className="text-muted-foreground mt-1 text-sm">
          Choose the mood that fits right now.
        </p>
        <div
          className="mt-4 grid grid-cols-5 gap-2"
          role="radiogroup"
          aria-label="Mood"
        >
          {moods.map((mood) => {
            const selected = selectedMood === mood.rating;
            return (
              <label
                className={`border-border hover:bg-accent flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-2xl border px-1 text-center transition-colors ${
                  selected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background'
                }`}
                key={mood.rating}
              >
                <input
                  className="sr-only"
                  type="radio"
                  value={mood.rating}
                  {...form.register('moodRating')}
                />
                <span aria-hidden="true" className="text-2xl">
                  {mood.face}
                </span>
                <span className="mt-1 text-xs font-medium">{mood.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          <Save aria-hidden="true" className="size-4" />
          {entry ? 'Save changes' : 'Save entry'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setDetailsOpen((open) => !open)}
        >
          <ChevronDown
            aria-hidden="true"
            className={`size-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`}
          />
          {detailsOpen ? 'Hide details' : 'Add details'}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>

      {detailsOpen ? (
        <div className="mt-5 grid gap-4 border-t pt-5">
          <label className="grid gap-2 text-sm font-medium">
            Note{' '}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
            <NoteEditor
              document={noteJson}
              onBlur={() => form.trigger('note')}
              onChange={({ plainText, document }) => {
                setNoteJson(document);
                form.setValue('note', plainText, { shouldDirty: true });
              }}
              value={note}
            />
          </label>
          <ActivityTagInput
            value={activityTags}
            suggestions={tagSuggestions}
            onChange={setActivityTags}
          />
          <div className="grid gap-2 text-sm font-medium">
            <span>Photo <span className="text-muted-foreground font-normal">(optional)</span></span>
            {photoPreview ? (
              <div className="relative w-fit">
                <img className="h-28 w-28 rounded-xl object-cover" src={photoPreview} alt="Selected attachment preview" />
                <Button className="absolute -right-2 -top-2" type="button" size="icon" variant="secondary" aria-label="Remove selected photo" onClick={() => { URL.revokeObjectURL(photoPreview); setPhotoPreview(null); setPhotoFile(null); }}><X className="size-4" /></Button>
              </div>
            ) : entry?.photo && !removeExistingPhoto ? (
              <div className="flex items-center gap-2"><p className="text-muted-foreground text-sm">A photo is already attached. Selecting a new one replaces it.</p><Button type="button" variant="ghost" size="sm" onClick={() => setRemoveExistingPhoto(true)}>Remove photo</Button></div>
            ) : null}
            <label className="border-input bg-background flex h-10 w-fit cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm">
              <ImagePlus className="size-4" /> {photoFile || (entry?.photo && !removeExistingPhoto) ? 'Replace photo' : 'Choose photo'}
              <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 25 * 1024 * 1024) { form.setError('note', { message: 'Photos must be smaller than 25 MB.' }); return; } if (photoPreview) URL.revokeObjectURL(photoPreview); setRemoveExistingPhoto(false); setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)); }} />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              <span>
                Energy{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </span>
              <select
                className="border-input bg-background h-10 rounded-xl border px-3"
                {...form.register('energyRating')}
              >
                <option value="">Not recorded</option>
                {energyLevels.map((energy) => (
                  <option key={energy.rating} value={energy.rating}>
                    {energy.rating} — {energy.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              <span className="inline-flex items-center gap-2">
                <CalendarClock aria-hidden="true" className="size-4" /> Date and
                time
              </span>
              <input
                className="border-input bg-background h-10 rounded-xl border px-3"
                type="datetime-local"
                {...form.register('occurredAt')}
              />
              {form.formState.errors.occurredAt ? (
                <span className="text-destructive text-xs">
                  {form.formState.errors.occurredAt.message}
                </span>
              ) : null}
            </label>
          </div>
        </div>
      ) : null}
    </form>
  );
}
