import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_KEY, SUPABASE_URL } from './env';

/**
 * Service-role client. Bypasses RLS entirely, so it is the only thing that can
 * write posts, read drafts or upload media.
 *
 * `server-only` above makes importing this from a client component a build
 * error -- the key must never reach the browser. Every route handler that uses
 * it calls `requireAdmin()` first.
 */
export function createAdminClient() {
  return createClient(SUPABASE_URL(), SUPABASE_SERVICE_KEY(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
