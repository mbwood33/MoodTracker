import type { Session, User } from '@supabase/supabase-js';

import { getSupabaseClient } from './supabase';

export interface SignUpInput {
  email: string;
  password: string;
  displayName?: string;
}

/**
 * Auth stays behind the remote boundary so components never handle the raw
 * Supabase client. Supabase's profile trigger creates the paired profile.
 */
export class SupabaseAuthRepository {
  async signUp(
    input: SignUpInput,
  ): Promise<{ user: User | null; session: Session | null }> {
    const { data, error } = await this.requireClient().auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: input.displayName
          ? { display_name: input.displayName }
          : undefined,
      },
    });
    if (error) throw new Error(`Unable to create account: ${error.message}`);
    return data;
  }

  async signIn(email: string, password: string): Promise<Session> {
    const { data, error } = await this.requireClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(`Unable to sign in: ${error.message}`);
    return data.session;
  }

  async signOut(): Promise<void> {
    const { error } = await this.requireClient().auth.signOut();
    if (error) throw new Error(`Unable to sign out: ${error.message}`);
  }

  async sendPasswordReset(email: string, redirectTo: string): Promise<void> {
    const { error } = await this.requireClient().auth.resetPasswordForEmail(
      email,
      {
        redirectTo,
      },
    );
    if (error)
      throw new Error(`Unable to send password reset: ${error.message}`);
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.requireClient().auth.updateUser({ password });
    if (error) throw new Error(`Unable to update password: ${error.message}`);
  }

  async getSession(): Promise<Session | null> {
    const { data, error } = await this.requireClient().auth.getSession();
    if (error) throw new Error(`Unable to retrieve session: ${error.message}`);
    return data.session;
  }

  private requireClient() {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error(
        'Supabase is not configured. Set both public Supabase environment values.',
      );
    }
    return client;
  }
}
