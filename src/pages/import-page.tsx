import { FileUp, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { DexieLocalEntryRepository } from '@/data/local';
import { getFirebaseServices } from '@/data/remote/firebase';
import { FirebaseMoodEntryRepository } from '@/data/remote/mood-entry-repository';
import { useAuth } from '@/features/auth';
import { parseMoodCsv, type CsvMoodImportResult } from '@/features/import';
import { LocalFirstEntries, synchronizePendingEntries } from '@/sync';

function currentTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function ImportPage() {
  const { status, user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<CsvMoodImportResult>();
  const [fileName, setFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState('');

  const selectFile = async (file: File | undefined) => {
    setMessage('');
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setPreview(undefined);
      setMessage('Choose a CSV file.');
      return;
    }
    try {
      setFileName(file.name);
      setPreview(parseMoodCsv(await file.text(), currentTimeZone()));
    } catch (error) {
      setPreview(undefined);
      setMessage(
        error instanceof Error ? error.message : 'Unable to read that CSV.',
      );
    }
  };

  const importRows = async () => {
    if (!user || !preview?.rows.length) return;
    setIsImporting(true);
    setMessage('');
    try {
      const local = new DexieLocalEntryRepository();
      const entries = new LocalFirstEntries(local);
      for (const row of preview.rows) {
        await entries.create({
          userId: user.uid,
          moodRating: row.moodRating,
          notePlainText: row.notePlainText,
          activityTags: row.activityTags,
          energyRating: row.energyRating,
          occurredAtUtc: row.occurredAtUtc,
          occurredTimeZone: row.occurredTimeZone,
          occurredLocalDate: row.occurredLocalDate,
        });
      }
      if (navigator.onLine && getFirebaseServices()) {
        void synchronizePendingEntries(user.uid, {
          repository: local,
          remote: new FirebaseMoodEntryRepository(),
          reader: new FirebaseMoodEntryRepository(),
        });
      }
      setMessage(
        `${preview.rows.length} entr${preview.rows.length === 1 ? 'y was' : 'ies were'} saved locally and will synchronize when possible.`,
      );
      setPreview(undefined);
      setFileName('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to save the import.',
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <section className="max-w-3xl">
      <p className="text-primary text-sm font-medium">Import</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
        Bring in your mood history
      </h1>
      <p className="text-muted-foreground mt-3 leading-7">
        Preview a CSV before saving. Required columns are <code>full_date</code>{' '}
        (m/d/yyyy), <code>time</code> (24-hour h:mm), <code>mood</code> (1–5),{' '}
        and <code>note</code>. The <code>activites</code> column is optional;
        when supplied, separate activity tags with <code> | </code>.
      </p>

      {status === 'loading' ? <p className="mt-8 text-sm">Loading…</p> : null}
      {status !== 'loading' && !user ? (
        <div className="border-border bg-card mt-8 rounded-3xl border p-6 shadow-sm">
          <p>Sign in to import entries into your private journal.</p>
          <Button asChild className="mt-4">
            <Link to="/auth">Sign in or create an account</Link>
          </Button>
        </div>
      ) : null}
      {user ? (
        <div className="border-border bg-card mt-8 rounded-3xl border p-5 shadow-sm sm:p-6">
          <input
            ref={inputRef}
            className="sr-only"
            accept=".csv,text/csv"
            id="mood-csv-file"
            type="file"
            onChange={(event) => void selectFile(event.target.files?.[0])}
          />
          <Button
            type="button"
            onClick={() => inputRef.current?.click()}
            variant="outline"
          >
            <FileUp aria-hidden="true" className="size-4" /> Choose CSV
          </Button>
          {fileName ? (
            <span className="text-muted-foreground ml-3 text-sm">
              {fileName}
            </span>
          ) : null}
          {message ? (
            <p className="mt-4 text-sm" role="status">
              {message}
            </p>
          ) : null}

          {preview ? (
            <div className="mt-6 border-t pt-5">
              <h2 className="text-lg font-semibold">Import preview</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {preview.rows.length} valid{' '}
                {preview.rows.length === 1 ? 'entry' : 'entries'} ready to
                import.
              </p>
              {preview.errors.length ? (
                <div
                  className="bg-destructive/10 text-destructive mt-4 rounded-xl p-3 text-sm"
                  role="alert"
                >
                  <p className="font-medium">
                    {preview.errors.length} row(s) will be skipped
                  </p>
                  <ul className="mt-1 list-disc pl-5">
                    {preview.errors.slice(0, 10).map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {preview.rows.length ? (
                <div className="mt-4 overflow-x-auto rounded-xl border">
                  <table className="w-full min-w-140 text-left text-sm">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Mood</th>
                        <th className="p-3">Activities</th>
                        <th className="p-3">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 5).map((row) => (
                        <tr className="border-t" key={row.rowNumber}>
                          <td className="p-3">{row.occurredLocalDate}</td>
                          <td className="p-3">{row.moodRating}</td>
                          <td className="p-3">
                            {row.activityTags.join(', ') || '—'}
                          </td>
                          <td className="p-3">{row.notePlainText || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              <Button
                className="mt-5"
                disabled={!preview.rows.length || isImporting}
                onClick={() => void importRows()}
              >
                <Upload aria-hidden="true" className="size-4" />{' '}
                {isImporting
                  ? 'Importing…'
                  : `Import ${preview.rows.length} entries`}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
