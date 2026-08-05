import { Link } from 'react-router-dom';

import { EntryWorkspaceContainer } from '@/app/entry-workspace-container';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth';

export function LogPage() {
  const { status, user } = useAuth();

  return (
    <section>
      <p className="text-primary text-sm font-medium">Log</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
        Your entries
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
        Record a moment now or add one from an earlier date. Entries save
        locally first and will synchronize when available.
      </p>
      <div className="mt-8">
        {status === 'loading' ? (
          <p className="text-muted-foreground text-sm">Loading your entries…</p>
        ) : user ? (
          <EntryWorkspaceContainer userId={user.id} />
        ) : (
          <div className="border-border bg-card max-w-xl rounded-3xl border p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Your private log awaits</h2>
            <p className="text-muted-foreground mt-2 leading-6">
              Create an account or sign in to record moods locally and keep them
              synchronized across your devices.
            </p>
            <Button asChild className="mt-5">
              <Link to="/auth">Sign in or create an account</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
