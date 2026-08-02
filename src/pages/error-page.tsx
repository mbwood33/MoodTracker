import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export function ErrorPage() {
  const error = useRouteError();
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <main className="bg-background text-foreground grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="text-primary text-sm font-semibold">
          {isNotFound ? '404' : 'Something went wrong'}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {isNotFound ? 'Page not found' : 'This page could not be opened'}
        </h1>
        <p className="text-muted-foreground mt-3">
          Your local data has not been changed. Return to the application shell
          and try again.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Return to Today</Link>
        </Button>
      </div>
    </main>
  );
}
