import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarClock, ChevronDown, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';

import {
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
  onSubmit,
  onCancel,
}: EntryComposerProps) {
  const [detailsOpen, setDetailsOpen] = useState(Boolean(entry));
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

  useEffect(() => {
    form.reset({
      moodRating: entry?.moodRating ?? 3,
      note: entry?.note ?? '',
      energyRating: entry?.energyRating ?? '',
      occurredAt: entry
        ? toDateTimeLocal(entry.occurredAt)
        : toDateTimeLocal(new Date().toISOString()),
    });
  }, [entry, form]);

  const selectedMood = useWatch({ control: form.control, name: 'moodRating' });

  const submit = form.handleSubmit(async (values) => {
    await onSubmit({
      moodRating: values.moodRating as MoodRating,
      note: values.note.trim(),
      energyRating:
        values.energyRating === '' ? null : (values.energyRating as MoodRating),
      occurredAt: new Date(values.occurredAt).toISOString(),
      occurredTimeZone: entry?.occurredTimeZone ?? currentTimeZone(),
      occurredLocalDate: values.occurredAt.slice(0, 10),
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
            <textarea
              className="border-input bg-background focus-visible:ring-ring min-h-28 rounded-xl border px-3 py-2 text-base outline-none focus-visible:ring-2"
              placeholder="What's on your mind?"
              {...form.register('note')}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Energy{' '}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
              <select
                className="border-input bg-background h-10 rounded-xl border px-3"
                {...form.register('energyRating')}
              >
                <option value="">Not recorded</option>
                {moods.map((mood) => (
                  <option key={mood.rating} value={mood.rating}>
                    {mood.rating} — {mood.label}
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
