import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dbError, requireAdmin } from '@/lib/cms/guard';
import { toCategoryRow } from '@/lib/cms/payload';
import { revalidateBlog } from '@/lib/cms/revalidate';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  // post_count drives the "you cannot delete a category still in use" warning
  // in the admin UI, so it is fetched alongside rather than per-row.
  const supabase = createAdminClient();
  const [{ data: categories, error }, { data: posts }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order').order('name'),
    supabase.from('posts').select('category_id'),
  ]);

  if (error) return dbError(error, 'category');

  const counts = new Map<string, number>();
  for (const row of (posts ?? []) as { category_id: string | null }[]) {
    if (row.category_id) counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }

  return NextResponse.json({
    categories: (categories ?? []).map((c) => ({ ...c, post_count: counts.get(c.id) ?? 0 })),
  });
}

export async function POST(request: NextRequest) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const parsed = toCategoryRow(await request.json().catch(() => ({})));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await createAdminClient()
    .from('categories')
    .insert(parsed.row)
    .select('*')
    .single();

  if (error) return dbError(error, 'category');

  await revalidateBlog();
  return NextResponse.json({ category: data }, { status: 201 });
}
