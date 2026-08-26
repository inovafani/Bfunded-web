import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dbError, requireAdmin } from '@/lib/cms/guard';
import { toPostRow } from '@/lib/cms/payload';
import { revalidateBlog } from '@/lib/cms/revalidate';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET one post, drafts included -- this is what the editor loads. */
export async function GET(_request: NextRequest, { params }: Ctx) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const { id } = await params;
  const { data, error } = await createAdminClient()
    .from('posts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return dbError(error);
  if (!data) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
  return NextResponse.json({ post: data });
}

/** PUT -- save the editor form over the existing row. */
export async function PUT(request: NextRequest, { params }: Ctx) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const { id } = await params;
  const parsed = toPostRow(await request.json().catch(() => ({})));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const supabase = createAdminClient();

  // The slug may have changed; the old URL needs purging from the cache too,
  // otherwise the CDN keeps serving a page that no longer exists.
  const { data: previous } = await supabase.from('posts').select('slug').eq('id', id).maybeSingle();

  const { data, error } = await supabase
    .from('posts')
    .update(parsed.row)
    .eq('id', id)
    .select('id, slug')
    .single();

  if (error) return dbError(error);

  await revalidateBlog(data.slug, previous?.slug);
  return NextResponse.json({ post: data });
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const { id } = await params;
  const supabase = createAdminClient();
  const { data: previous } = await supabase.from('posts').select('slug').eq('id', id).maybeSingle();

  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) return dbError(error);

  await revalidateBlog(previous?.slug);
  return NextResponse.json({ ok: true });
}
