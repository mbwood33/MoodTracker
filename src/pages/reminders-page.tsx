import { Check, Clock3, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { PushNotificationControl } from '@/components/push-notification-control';
import { FirebaseReminderRepository } from '@/data/remote/reminder-repository';
import {
  createReminder,
  describeReminderSchedule,
  updateReminder,
  type Reminder,
} from '@/domain';
import { useAuth } from '@/features/auth';

const weekdays = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
] as const;

function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function RemindersPage() {
  const { status, user } = useAuth();
  const repository = useMemo(() => new FirebaseReminderRepository(), []);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<Reminder | 'new' | null>(null);

  const load = async () => {
    if (!user) {
      setReminders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setReminders(await repository.list());
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Unable to load reminders.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
    // The repository is memoized and user identity is the dependency that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const save = async (values: ReminderFormValues) => {
    if (!user) return;
    setError('');
    try {
      const next =
        editor && editor !== 'new'
          ? updateReminder(editor, values)
          : createReminder({ ...values, userId: user.uid });
      await repository.save(next);
      setEditor(null);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Unable to save reminder.',
      );
    }
  };

  const toggle = async (reminder: Reminder) => {
    setError('');
    try {
      await repository.save(
        updateReminder(reminder, { ...reminder, enabled: !reminder.enabled }),
      );
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Unable to update reminder.',
      );
    }
  };

  const remove = async (reminder: Reminder) => {
    setError('');
    try {
      await repository.remove(reminder.id);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Unable to delete reminder.',
      );
    }
  };

  if (status === 'loading' || loading) {
    return <p className="text-muted-foreground py-12">Loading remindersâ€¦</p>;
  }

  if (!user) {
    return (
      <section className="max-w-2xl">
        <p className="text-primary text-sm font-medium">Reminders</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          Gentle check-ins, on your schedule
        </h1>
        <p className="text-muted-foreground mt-3 leading-7">
          Sign in to create private reminders that follow you across devices.
        </p>
        <Button asChild className="mt-6">
          <Link to="/auth">Sign in or create an account</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl">
      <p className="text-primary text-sm font-medium">Reminders</p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Make space to check in
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
            Add as many gentle prompts as you need. Each uses your selected
            local time and days of the week.
          </p>
        </div>
        <Button
          aria-label="Add a new reminder"
          onClick={() => setEditor('new')}
        >
          <Plus aria-hidden="true" className="size-4" /> Add reminder
        </Button>
      </div>

      <div
        aria-label="Notification setup"
        className="mt-6"
        data-reminder-push-setup-slot
      >
        <PushNotificationControl userId={user.uid} />
      </div>

      {error ? (
        <p
          className="bg-destructive/10 text-destructive mt-5 rounded-xl p-3 text-sm"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {editor ? (
        <ReminderForm
          initial={editor === 'new' ? undefined : editor}
          onCancel={() => setEditor(null)}
          onSubmit={save}
        />
      ) : null}

      {!editor && reminders.length === 0 ? (
        <div className="border-border bg-card mt-6 rounded-3xl border border-dashed p-7 text-center shadow-sm">
          <Clock3 aria-hidden="true" className="text-primary mx-auto size-8" />
          <h2 className="mt-3 text-lg font-semibold">No reminders yet</h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-6">
            Add one for a daily moment, or combine different times and days to
            make a rhythm that works for you.
          </p>
          <Button className="mt-5" onClick={() => setEditor('new')}>
            <Plus aria-hidden="true" className="size-4" /> Add your first
            reminder
          </Button>
        </div>
      ) : null}

      {!editor && reminders.length > 0 ? (
        <ul className="mt-6 space-y-3" aria-label="Your reminders">
          {reminders.map((reminder) => (
            <li
              className="border-border bg-card rounded-2xl border p-4 shadow-sm"
              key={reminder.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-lg font-semibold">
                    <Clock3
                      aria-hidden="true"
                      className="text-primary size-5"
                    />
                    {reminder.localTime}
                    {!reminder.enabled ? (
                      <span className="text-muted-foreground text-xs font-medium">
                        Paused
                      </span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {describeReminderSchedule(reminder)} · {reminder.timeZone}
                  </p>
                  {reminder.message ? (
                    <p className="mt-2 text-sm">{reminder.message}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    aria-label={`${reminder.enabled ? 'Pause' : 'Resume'} ${reminder.localTime} reminder`}
                    onClick={() => void toggle(reminder)}
                    size="icon-sm"
                    title={
                      reminder.enabled ? 'Pause reminder' : 'Resume reminder'
                    }
                    variant={reminder.enabled ? 'secondary' : 'outline'}
                  >
                    <Check aria-hidden="true" className="size-4" />
                  </Button>
                  <Button
                    aria-label={`Edit ${reminder.localTime} reminder`}
                    onClick={() => setEditor(reminder)}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <Pencil aria-hidden="true" className="size-4" />
                  </Button>
                  <Button
                    aria-label={`Delete ${reminder.localTime} reminder`}
                    className="text-destructive hover:text-destructive"
                    onClick={() => void remove(reminder)}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

type ReminderFormValues = Pick<
  Reminder,
  'localTime' | 'daysOfWeek' | 'timeZone' | 'message' | 'enabled'
>;

function ReminderForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial?: Reminder;
  onCancel: () => void;
  onSubmit: (values: ReminderFormValues) => Promise<void>;
}) {
  const [localTime, setLocalTime] = useState(initial?.localTime ?? '09:00');
  const [days, setDays] = useState<number[]>(
    initial?.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6],
  );
  const [message, setMessage] = useState(
    initial?.message ?? 'Time to log your mood.',
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const timeZone = initial?.timeZone ?? deviceTimeZone();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (days.length === 0) {
      setFormError('Choose at least one day.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await onSubmit({
        localTime,
        daysOfWeek: days,
        timeZone,
        message,
        enabled: initial?.enabled ?? true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDay = (day: number) => {
    setDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((left, right) => left - right),
    );
  };

  return (
    <form
      className="border-border bg-card mt-6 rounded-3xl border p-5 shadow-sm sm:p-6"
      onSubmit={(event) => void submit(event)}
    >
      <h2 className="text-lg font-semibold">
        {initial ? 'Edit reminder' : 'New reminder'}
      </h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Time
          <input
            className="border-input bg-background h-11 rounded-xl border px-3 text-base"
            onChange={(event) => setLocalTime(event.target.value)}
            required
            type="time"
            value={localTime}
          />
        </label>
        <div className="grid gap-2 text-sm font-medium">
          <span>Time zone</span>
          <p className="border-input bg-muted/50 text-muted-foreground flex h-11 items-center rounded-xl border px-3 text-sm">
            {timeZone}
          </p>
        </div>
      </div>
      <fieldset className="mt-5">
        <legend className="text-sm font-medium">Repeat on</legend>
        <div className="mt-2 grid grid-cols-7 gap-1.5 sm:max-w-sm">
          {weekdays.map((day) => {
            const selected = days.includes(day.value);
            return (
              <label className="cursor-pointer" key={day.value}>
                <input
                  checked={selected}
                  className="peer sr-only"
                  onChange={() => toggleDay(day.value)}
                  type="checkbox"
                />
                <span className="border-input peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-ring flex h-10 items-center justify-center rounded-lg border text-xs font-semibold peer-focus-visible:ring-2">
                  {day.label}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <label className="mt-5 grid gap-2 text-sm font-medium">
        Reminder message{' '}
        <span className="text-muted-foreground font-normal">(optional)</span>
        <input
          className="border-input bg-background h-11 rounded-xl border px-3 text-base"
          maxLength={180}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Time to log your mood."
          value={message}
        />
      </label>
      {formError ? (
        <p className="text-destructive mt-3 text-sm" role="alert">
          {formError}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button onClick={onCancel} type="button" variant="ghost">
          Cancel
        </Button>
        <Button disabled={submitting} type="submit">
          {submitting ? 'Savingâ€¦' : initial ? 'Save changes' : 'Add reminder'}
        </Button>
      </div>
    </form>
  );
}
