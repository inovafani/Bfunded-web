import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase/server';
import { isAdminConfigured } from '@/lib/supabase/env';

/**
 * Every /api/admin handler starts with this. The middleware already blocks
 * signed-out requests, but the check is repeated here so a route stays safe if
 * the matcher is ever edited -- the service-role key is on the other side.
 */
export async function requireAdmin() {
  // Checked before anything touches a client, so a deploy that is missing the
  // service-role key answers with a sentence instead of a stack trace.
  if (!isAdminConfigured()) {
    return {
      user: null,
      deny: NextResponse.json(
        {
          error:
            'SUPABASE_SERVICE_ROLE_KEY is not set on this deploy. Add it in Netlify under Site configuration → Environment variables, then redeploy.',
        },
        { status: 503 },
      ),
    };
  }

  const user = await getAdminUser();
  if (!user) {
    return { user: null, deny: NextResponse.json({ error: 'Not signed in.' }, { status: 401 }) };
  }
  return { user, deny: null };
}

/** Turns a Postgres error into something an editor can act on. */
export function dbError(error: { code?: string; message: string }, subject = 'post') {
  if (error.code === '23505') {
    return NextResponse.json(
      { error: `That URL slug is already taken by another ${subject}. Change it and try again.` },
      { status: 409 },
    );
  }
  if (error.code === '42P01') {
    return NextResponse.json(
      { error: 'The database tables are missing. Run supabase/schema.sql in the Supabase SQL editor.' },
      { status: 500 },
    );
  }
  return NextResponse.json({ error: error.message }, { status: 500 });
}
