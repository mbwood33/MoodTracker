import { LogIn, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth';

export function AccountControl() {
  const { status, user, signOut } = useAuth();

  if (status === 'loading') {
    return (
      <span className="text-muted-foreground text-sm">Checking account…</span>
    );
  }

  if (!user) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link to="/auth">
          <LogIn aria-hidden="true" className="size-4" /> Sign in
        </Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground hidden max-w-40 truncate text-sm sm:block">
        {user.email}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => void signOut()}
      >
        <LogOut aria-hidden="true" className="size-4" />
        <span className="sr-only sm:not-sr-only">Sign out</span>
      </Button>
    </div>
  );
}
