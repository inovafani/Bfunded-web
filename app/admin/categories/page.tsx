import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminConfigured } from '@/lib/supabase/env';
import AdminChrome from '../_components/AdminChrome';
import CategoryManager, { type CategoryRow } from '../_components/CategoryManager';

export const dynamic = 'force-dynamic';

async function loadCategories(): Promise<CategoryRow[]> {
  if (!isAdminConfigured()) return [];

  const supabase = createAdminClient();
  const [{ data: categories }, { data: posts }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order').order('name'),
    supabase.from('posts').select('category_id'),
  ]);

  const counts = new Map<string, number>();
  for (const row of (posts ?? []) as { category_id: string | null }[]) {
    if (row.category_id) counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }

  return ((categories ?? []) as CategoryRow[]).map((category) => ({
    ...category,
    post_count: counts.get(category.id) ?? 0,
  }));
}

export default async function CategoriesPage() {
  const categories = await loadCategories();

  return (
    <AdminChrome current="categories">
      <div className="bfa-page-head">
        <div>
          <p className="bfa-eyebrow">Categories</p>
          <h1 className="bfa-h1">One archive page each</h1>
          <p className="bfa-lede">
            Every category gets its own indexable page at /blog/category/…. Keep them few and
            distinct — five strong archives outrank fifteen thin ones.
          </p>
        </div>
      </div>

      <CategoryManager categories={categories} />
    </AdminChrome>
  );
}
