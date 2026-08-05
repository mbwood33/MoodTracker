import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import type { Session } from '@supabase/supabase-js';

import {
  SupabaseAuthRepository,
  type SignUpInput,
} from '@/data/remote/auth-repository';
import { getSupabaseClient } from '@/data/remote/supabase';
import { AuthContext, type AuthStatus } from '@/features/auth/auth-context';

export function AuthProvider({ children }: PropsWithChildren) {
  const client = getSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    client ? 'loading' : 'unconfigured',
  );
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const repository = useMemo(() => new SupabaseAuthRepository(), []);

  useEffect(() => {
    if (!client) return;

    void client.auth.getSession().then(({ data, error }) => {
      if (error) {
        setSession(null);
        setStatus('unauthenticated');
        return;
      }

      setSession(data.session);
      setStatus(data.session ? 'authenticated' : 'unauthenticated');
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'unauthenticated');
      setIsPasswordRecovery(event === 'PASSWORD_RECOVERY');
    });

    return () => subscription.unsubscribe();
  }, [client]);

  const value = useMemo(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      isPasswordRecovery,
      signUp: async (input: SignUpInput) => {
        const result = await repository.signUp(input);
        return result.session;
      },
      signIn: async (email: string, password: string) => {
        await repository.signIn(email, password);
      },
      signOut: async () => {
        await repository.signOut();
        setIsPasswordRecovery(false);
      },
      sendPasswordReset: async (email: string) => {
        await repository.sendPasswordReset(email, window.location.origin);
      },
      updatePassword: async (password: string) => {
        await repository.updatePassword(password);
        setIsPasswordRecovery(false);
      },
    }),
    [isPasswordRecovery, repository, session, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
