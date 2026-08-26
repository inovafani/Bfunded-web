import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

/**
 * Request-scoped client that reads (and refreshes) the admin's auth cookies.
 *
 * Use this to answer "who is signed in?". It runs as the anon role, so RLS
 * applies -- it can read published posts and nothing else. Writes go through
 * `createAdminClient()` after this one has confirmed a session.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // middleware refreshes the session on every request, so dropping the
          // write here is harmless.
        }
      },
    },
  });
}

/** The signed-in admin, or null. Never throws on a missing/expired session. */
export async function getAdminUser() {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user ?? null;
  } catch {
    return null;
  }
}
