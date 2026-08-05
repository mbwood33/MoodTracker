import { createContext, useContext } from 'react';

import type { Session, User } from '@supabase/supabase-js';

import type { SignUpInput } from '@/data/remote/auth-repository';

export type AuthStatus =
  'loading' | 'authenticated' | 'unauthenticated' | 'unconfigured';

export type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  isPasswordRecovery: boolean;
  signUp: (input: SignUpInput) => Promise<Session | null>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
