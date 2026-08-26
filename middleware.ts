import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Guards the CMS and keeps the admin's Supabase session alive.
 *
 * Two jobs, in this order:
 *  1. Refresh the auth token. Supabase access tokens are short-lived; without
 *     a refresh on each request a Server Component can read an expired session
 *     and bounce a working admin back to the login screen.
 *  2. Redirect signed-out visitors away from /admin, and signed-in ones away
 *     from the login page.
 *
 * Only /admin and /api/admin match. The marketing pages and the public blog
 * never run this, so they stay statically servable.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Not configured yet: let the request through so /admin can render its own
  // "finish the setup" screen instead of failing with an opaque 500.
  if (!url || !anonKey) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() -- not getSession() -- because only this one revalidates the JWT
  // with Supabase. getSession() trusts whatever is in the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = pathname === '/admin/login';

  if (!user && !isLoginPage) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/admin/login';
    // Remember where they were headed so login can send them back.
    redirect.search = pathname === '/admin' ? '' : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(redirect);
  }

  if (user && isLoginPage) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/admin';
    redirect.search = '';
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
