import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminConfigured } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';

const ROLES = ['Founder', 'Investor'];
const MAX = { name: 200, email: 320, other: 500 };
const SHEETS_TIMEOUT_MS = 8000;

type Submission = {
  role: string;
  name: string;
  email: string;
  company: string | null;
  url: string | null;
  firm: string | null;
  focus: string | null;
  source: string | null;
};

/** Trimmed and length-capped; empty becomes null so the table stays tidy. */
function field(form: FormData, key: string, max: number): string | null {
  const value = form.get(key);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

function parse(form: FormData): { ok: true; row: Submission } | { ok: false; error: string } {
  const role = field(form, 'role', 20) ?? 'Founder';
  const name = field(form, 'name', MAX.name);
  const email = field(form, 'email', MAX.email);

  if (!ROLES.includes(role)) return { ok: false, error: 'Unknown role.' };
  if (!name) return { ok: false, error: 'Name is required.' };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'A valid email is required.' };
  }

  // Only the half of the form that belongs to the chosen role is kept, so a
  // founder who toggled to Investor and back does not store stale fields.
  const founder = role === 'Founder';
  return {
    ok: true,
    row: {
      role,
      name,
      email,
      company: founder ? field(form, 'company', MAX.other) : null,
      url: founder ? field(form, 'url', MAX.other) : null,
      firm: founder ? null : field(form, 'firm', MAX.other),
      focus: founder ? null : field(form, 'focus', MAX.other),
      source: field(form, 'source', MAX.other),
    },
  };
}

/** Supabase is the system of record. */
async function saveToSupabase(row: Submission, request: NextRequest): Promise<boolean> {
  if (!isAdminConfigured()) {
    console.error('waitlist: Supabase is not configured on this deploy');
    return false;
  }
  const { error } = await createAdminClient()
    .from('waitlist_submissions')
    .insert({
      ...row,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      user_agent: request.headers.get('user-agent')?.slice(0, MAX.other) ?? null,
      referrer: request.headers.get('referer')?.slice(0, MAX.other) ?? null,
    });
  if (error) {
    console.error('waitlist: Supabase insert failed', error.code, error.message);
    return false;
  }
  return true;
}

/**
 * Mirror to the Google Apps Script web app: appends a Sheet row and emails the
 * team. Done here, not in the browser, so the reply is readable and the URL is
 * not shipped in the page.
 */
async function sendToSheets(row: Submission): Promise<boolean> {
  const endpoint = process.env.NEXT_PUBLIC_SHEETS_ENDPOINT;
  if (!endpoint) return false;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(
        Object.entries(row).map(([k, v]) => [k, v ?? '']),
      ).toString(),
      signal: AbortSignal.timeout(SHEETS_TIMEOUT_MS),
    });
    // The script answers 200 with {"ok":true} (after Google's redirect), and
    // never a 500 -- failures come back as {"ok":false}.
    const body = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    if (!res.ok || !body?.ok) {
      console.error('waitlist: Sheets rejected the submission', res.status, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error('waitlist: Sheets request failed', err);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  // Honeypot: real visitors never see this field. Answer as if it worked so a
  // bot learns nothing, but store nothing.
  if (field(form, 'bot-field', 100)) return NextResponse.json({ ok: true });

  const parsed = parse(form);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const [saved, mirrored] = await Promise.all([
    saveToSupabase(parsed.row, request),
    sendToSheets(parsed.row),
  ]);

  // One surviving copy is enough to tell the visitor it worked; both failing
  // is the only case where the lead would be lost.
  if (!saved && !mirrored) {
    return NextResponse.json({ error: 'Could not save your submission.' }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
