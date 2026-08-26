import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dbError, requireAdmin } from '@/lib/cms/guard';
import { toPostRow } from '@/lib/cms/payload';
import { revalidateBlog } from '@/lib/cms/revalidate';

export const dynamic = 'force-dynamic';

/** GET /api/admin/posts -- the dashboard list. Drafts included. */
export async function GET(request: NextRequest) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const params = request.nextUrl.searchParams;
  const search = params.get('q')?.trim();
  const status = params.get('status');

  let query = createAdminClient()
    .from('posts')
    .select(
      'id, title, slug, status, author, published_at, updated_at, reading_minutes, focus_keyword, cover_url, category:categories(name, slug)',
    )
    .order('updated_at', { ascending: false })
    .limit(200);

  if (status === 'draft' || status === 'published') query = query.eq('status', status);
  if (search) query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return dbError(error);
  return NextResponse.json({ posts: data ?? [] });
}

/** POST /api/admin/posts -- create. */
export async function POST(request: NextRequest) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const parsed = toPostRow(await request.json().catch(() => ({})));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await createAdminClient()
    .from('posts')
    .insert(parsed.row)
    .select('id, slug')
    .single();

  if (error) return dbError(error);

  await revalidateBlog(data.slug);
  return NextResponse.json({ post: data }, { status: 201 });
}
