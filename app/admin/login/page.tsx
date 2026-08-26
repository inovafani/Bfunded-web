'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { error: signInError } = await createBrowserSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'That email and password do not match an account.'
          : signInError.message,
      );
      setBusy(false);
      return;
    }

    // router.refresh() matters: the session now lives in a cookie the server
    // has not seen, so the RSC payload must be re-fetched before navigating.
    const next = params.get('next');
    router.replace(next && next.startsWith('/admin') ? next : '/admin');
    router.refresh();
  }

  return (
    <form className="bfa-login-card" onSubmit={handleSubmit}>
      <p className="bfa-eyebrow">BFunded CMS</p>
      <h1 className="bfa-h1">Sign in</h1>

      {error ? (
        <div className="bfa-notice" data-tone="error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="bfa-field">
        <label className="bfa-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="bfa-input"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@bfunded.io"
        />
      </div>

      <div className="bfa-field">
        <label className="bfa-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          className="bfa-input"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••"
        />
      </div>

      <button className="bfa-btn bfa-btn-primary" type="submit" disabled={busy} style={{ width: '100%' }}>
        {busy ? <span className="bfa-spin" /> : null}
        {busy ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="bfa-hint" style={{ marginTop: 18, textAlign: 'center' }}>
        Accounts are created in the Supabase dashboard under Authentication → Users.
      </p>
    </form>
  );
}

function NotConfigured() {
  return (
    <div className="bfa-login-card">
      <p className="bfa-eyebrow">BFunded CMS</p>
      <h1 className="bfa-h1">Not connected yet</h1>
      <div className="bfa-notice" data-tone="info">
        <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> are not
        set on this deploy.
      </div>
      <p className="bfa-hint">
        Follow <code>docs/cms-setup.md</code>: create the Supabase project, run{' '}
        <code>supabase/schema.sql</code>, then add the three environment variables and redeploy.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="bfa-login">
      {isSupabaseConfigured() ? (
        <Suspense fallback={<div className="bfa-login-card" />}>
          <LoginForm />
        </Suspense>
      ) : (
        <NotConfigured />
      )}
    </div>
  );
}
