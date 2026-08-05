import { Link } from 'react-router-dom';

import { EntryWorkspaceContainer } from '@/app/entry-workspace-container';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth';

export function TodayPage() {
  const { status, user } = useAuth();

  return (
    <section>
      <p className="text-primary text-sm font-medium">Today</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
        How are you?
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
        A quick check-in is just a mood and one tap. Add details only when they
        are useful.
      </p>
      <div className="mt-8">
        {status === 'loading' ? (
          <p className="text-muted-foreground text-sm">
            Loading your private journal…
          </p>
        ) : user ? (
          <EntryWorkspaceContainer userId={user.id} showTimeline={false} />
        ) : (
          <EntryAccessCard />
        )}
      </div>
    </section>
  );
}

function EntryAccessCard() {
  return (
    <div className="border-border bg-card max-w-xl rounded-3xl border p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Sign in to save a check-in</h2>
      <p className="text-muted-foreground mt-2 leading-6">
        Your entries are stored locally first, then synchronized privately when
        a connection is available.
      </p>
      <Button asChild className="mt-5">
        <Link to="/auth">Sign in or create an account</Link>
      </Button>
    </div>
  );
}
