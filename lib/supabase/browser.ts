'use client';

import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

/** Browser client. Used only by the login screen to sign in and sign out. */
export function createBrowserSupabase() {
  return createBrowserClient(SUPABASE_URL(), SUPABASE_ANON_KEY());
}
