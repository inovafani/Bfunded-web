/**
 * Environment access for the three Supabase keys, in one place so a missing
 * value fails with a sentence that says what to do instead of `undefined is
 * not a valid URL` from somewhere deep inside the client.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local ` +
        `and fill it from your Supabase project (Settings -> API). ` +
        `On Netlify, add it under Site configuration -> Environment variables.`,
    );
  }
  return value;
}

export const SUPABASE_URL = () =>
  required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);

export const SUPABASE_ANON_KEY = () =>
  required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const SUPABASE_SERVICE_KEY = () =>
  required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * True when the blog has been wired up at all. The public pages check this so
 * a deploy without Supabase env vars renders an empty blog instead of a 500 --
 * the marketing pages must never go down because the CMS is unconfigured.
 */
export const isSupabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/**
 * True when the CMS can also *write*. The service-role key is a separate
 * variable that is easy to forget on a new deploy, and forgetting it must
 * surface as a message in the admin UI rather than a 500 from a thrown client.
 */
export const isAdminConfigured = () =>
  isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export const MEDIA_BUCKET = 'blog-media';
