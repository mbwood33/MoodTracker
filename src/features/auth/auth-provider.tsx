import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import {
  FirebaseAuthRepository,
  type SignUpInput,
} from '@/data/remote/auth-repository';
import { getFirebaseServices } from '@/data/remote/firebase';
import { AuthContext, type AuthStatus } from '@/features/auth/auth-context';

function getRecoveryCode(): string | undefined {
  const parameters = new URLSearchParams(window.location.search);
  return parameters.get('mode') === 'resetPassword'
    ? (parameters.get('oobCode') ?? undefined)
    : undefined;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const services = getFirebaseServices();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    services ? 'loading' : 'unconfigured',
  );
  const [recoveryCode, setRecoveryCode] = useState(getRecoveryCode);
  const repository = useMemo(() => new FirebaseAuthRepository(), []);

  useEffect(() => {
    if (!services) return;
    return onAuthStateChanged(
      services.auth,
      (nextUser) => {
        setUser(nextUser);
        setStatus(nextUser ? 'authenticated' : 'unauthenticated');
      },
      () => {
        setUser(null);
        setStatus('unauthenticated');
      },
    );
  }, [services]);

  const value = useMemo(
    () => ({
      status,
      user,
      isPasswordRecovery: Boolean(recoveryCode),
      signUp: (input: SignUpInput) => repository.signUp(input),
      signIn: async (email: string, password: string) => {
        await repository.signIn(email, password);
      },
      signOut: async () => {
        await repository.signOut();
      },
      sendPasswordReset: async (email: string) => {
        await repository.sendPasswordReset(
          email,
          `${window.location.origin}/auth`,
        );
      },
      updatePassword: async (password: string) => {
        await repository.updatePassword(password, recoveryCode);
        setRecoveryCode(undefined);
        window.history.replaceState({}, '', '/auth');
      },
    }),
    [recoveryCode, repository, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
