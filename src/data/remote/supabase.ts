import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/config/env';

let client: SupabaseClient | undefined;

/**
 * Returns a singleton browser client when both public Supabase values exist.
 * Phase 0 permits an unconfigured backend so the application shell runs alone.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }

  client ??= createClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );

  return client;
}
