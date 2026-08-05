import { AuthCard } from '@/features/auth/auth-card';

export function AuthPage() {
  return (
    <section>
      <div className="mx-auto max-w-md text-center">
        <p className="text-primary text-sm font-medium">Your private journal</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome to Mood Tracker
        </h1>
        <p className="text-muted-foreground mt-3 leading-7">
          Sign in to keep your entries private and available across your
          devices.
        </p>
      </div>
      <div className="mt-8">
        <AuthCard />
      </div>
    </section>
  );
}
