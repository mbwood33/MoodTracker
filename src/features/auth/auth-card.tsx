import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';

const credentialsSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
  displayName: z.string().max(80).optional(),
});
const passwordSchema = z.object({
  password: z.string().min(8, 'Use at least 8 characters.'),
});

type Credentials = z.infer<typeof credentialsSchema>;

export function AuthCard() {
  const {
    status,
    signIn,
    signUp,
    sendPasswordReset,
    updatePassword,
    isPasswordRecovery,
  } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '', displayName: '' },
  });
  const recoveryForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '' },
  });

  const isConfigured = status !== 'unconfigured';
  const submit = form.handleSubmit(async (values) => {
    setError(null);
    setMessage(null);

    try {
      if (mode === 'sign-in') {
        await signIn(values.email, values.password);
        setMessage('Signed in.');
        navigate('/', { replace: true });
      } else {
        const session = await signUp(values);
        setMessage(
          session
            ? 'Account created and signed in.'
            : 'Check your email to confirm your account, then sign in.',
        );
        if (session) navigate('/', { replace: true });
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to continue.',
      );
    }
  });

  const resetPassword = async () => {
    const email = form.getValues('email');
    const parsed = z.string().email().safeParse(email);
    if (!parsed.success) {
      form.setError('email', { message: 'Enter your email address first.' });
      return;
    }

    setError(null);
    try {
      await sendPasswordReset(parsed.data);
      setMessage('Password-reset instructions have been sent.');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to send reset email.',
      );
    }
  };

  const completePasswordReset = recoveryForm.handleSubmit(
    async ({ password }) => {
      setError(null);
      try {
        await updatePassword(password);
        setMessage('Password updated.');
        navigate('/', { replace: true });
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to update password.',
        );
      }
    },
  );

  return (
    <section className="border-border bg-card mx-auto w-full max-w-md rounded-3xl border p-5 shadow-sm sm:p-6">
      <div className="bg-muted flex gap-2 rounded-xl p-1" role="tablist">
        {[
          ['sign-in', 'Sign in'],
          ['sign-up', 'Create account'],
        ].map(([value, label]) => (
          <Button
            key={value}
            type="button"
            role="tab"
            size="sm"
            variant={mode === value ? 'secondary' : 'ghost'}
            aria-selected={mode === value}
            className="flex-1"
            onClick={() => setMode(value as typeof mode)}
          >
            {label}
          </Button>
        ))}
      </div>

      {!isConfigured ? (
        <p className="text-muted-foreground mt-5 text-sm leading-6">
          Supabase is not configured yet. Add the public URL and publishable key
          to the active Vite environment before creating an account.
        </p>
      ) : isPasswordRecovery ? (
        <form className="mt-5 grid gap-4" onSubmit={completePasswordReset}>
          <h2 className="text-lg font-semibold">Choose a new password</h2>
          <label className="grid gap-2 text-sm font-medium">
            New password
            <input
              className="border-input bg-background h-10 rounded-xl border px-3"
              autoComplete="new-password"
              type="password"
              {...recoveryForm.register('password')}
            />
            {recoveryForm.formState.errors.password ? (
              <span className="text-destructive text-xs">
                {recoveryForm.formState.errors.password.message}
              </span>
            ) : null}
          </label>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          {message ? <p className="text-success text-sm">{message}</p> : null}
          <Button type="submit" disabled={recoveryForm.formState.isSubmitting}>
            Update password
          </Button>
        </form>
      ) : (
        <form className="mt-5 grid gap-4" onSubmit={submit}>
          {mode === 'sign-up' ? (
            <label className="grid gap-2 text-sm font-medium">
              Display name{' '}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
              <input
                className="border-input bg-background h-10 rounded-xl border px-3"
                autoComplete="name"
                {...form.register('displayName')}
              />
            </label>
          ) : null}
          <label className="grid gap-2 text-sm font-medium">
            Email
            <input
              className="border-input bg-background h-10 rounded-xl border px-3"
              autoComplete="email"
              inputMode="email"
              type="email"
              {...form.register('email')}
            />
            {form.formState.errors.email ? (
              <span className="text-destructive text-xs">
                {form.formState.errors.email.message}
              </span>
            ) : null}
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Password
            <input
              className="border-input bg-background h-10 rounded-xl border px-3"
              autoComplete={
                mode === 'sign-in' ? 'current-password' : 'new-password'
              }
              type="password"
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <span className="text-destructive text-xs">
                {form.formState.errors.password.message}
              </span>
            ) : null}
          </label>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          {message ? <p className="text-success text-sm">{message}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </Button>
            {mode === 'sign-in' ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => void resetPassword()}
              >
                Reset password
              </Button>
            ) : null}
          </div>
        </form>
      )}
    </section>
  );
}
