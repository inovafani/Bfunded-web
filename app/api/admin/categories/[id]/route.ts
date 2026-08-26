import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dbError, requireAdmin } from '@/lib/cms/guard';
import { toCategoryRow } from '@/lib/cms/payload';
import { revalidateBlog } from '@/lib/cms/revalidate';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const { id } = await params;
  const parsed = toCategoryRow(await request.json().catch(() => ({})));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await createAdminClient()
    .from('categories')
    .update(parsed.row)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return dbError(error, 'category');

  await revalidateBlog();
  return NextResponse.json({ category: data });
}

/**
 * Deleting a category does not delete its posts -- the FK is ON DELETE SET
 * NULL, so they become uncategorised. The UI warns when the count is non-zero.
 */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { deny } = await requireAdmin();
  if (deny) return deny;

  const { id } = await params;
  const { error } = await createAdminClient().from('categories').delete().eq('id', id);
  if (error) return dbError(error, 'category');

  await revalidateBlog();
  return NextResponse.json({ ok: true });
}
