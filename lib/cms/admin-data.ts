import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminConfigured } from '@/lib/supabase/env';
import { SITE_URL } from '@/lib/site';
import type { Category, Post } from './types';
import type { RelatedOption } from '@/app/admin/_components/PostEditor';

/** Everything the editor screen needs besides the post itself. */
export async function loadEditorContext(): Promise<{
  categories: Category[];
  relatedOptions: RelatedOption[];
  tagSuggestions: string[];
  siteUrl: string;
}> {
  const empty = { categories: [], relatedOptions: [], tagSuggestions: [], siteUrl: SITE_URL };
  if (!isAdminConfigured()) return empty;

  const supabase = createAdminClient();
  const [categories, posts] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order').order('name'),
    supabase
      .from('posts')
      .select('id, title, slug, status, tags')
      .order('updated_at', { ascending: false })
      .limit(150),
  ]);

  if (categories.error || posts.error) return empty;

  const rows = (posts.data ?? []) as (RelatedOption & { tags: string[] })[];

  return {
    categories: (categories.data ?? []) as Category[],
    relatedOptions: rows.map(({ id, title, slug, status }) => ({ id, title, slug, status })),
    // Suggesting tags that already exist keeps the taxonomy from fragmenting
    // into "pre-seed", "preseed" and "Pre Seed".
    tagSuggestions: [...new Set(rows.flatMap((row) => row.tags ?? []))].sort((a, b) =>
      a.localeCompare(b),
    ),
    siteUrl: SITE_URL,
  };
}

export async function loadPost(id: string): Promise<Post | null> {
  if (!isAdminConfigured()) return null;
  const { data } = await createAdminClient().from('posts').select('*').eq('id', id).maybeSingle();
  return (data as Post) ?? null;
}
