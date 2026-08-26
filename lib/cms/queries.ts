import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import type { Category, PostCard, PostWithCategory } from './types';

/**
 * Read-only data access for the public blog.
 *
 * These use a plain anon client with no cookie handling on purpose: touching
 * cookies would opt every blog page out of static rendering, and the public
 * blog is exactly the kind of page that should be served from the CDN. RLS
 * limits this client to published posts, so drafts can never leak here even if
 * a query forgets to filter.
 */

const CARD_COLUMNS =
  'id, title, slug, author, excerpt, cover_url, cover_alt, reading_minutes, published_at, tags, category:categories(name, slug)';

function client() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Supabase types an embedded many-to-one relation as an array. It is a single
 * row here (posts.category_id is a plain FK), so normalise it once rather than
 * making every caller deal with the discrepancy.
 */
function normalise<T extends { category?: unknown }>(row: T) {
  const category = Array.isArray(row.category) ? (row.category[0] ?? null) : (row.category ?? null);
  return { ...row, category } as T & { category: Category | null };
}

async function getCategoryId(slug: string): Promise<string | undefined> {
  const { data } = await client().from('categories').select('id').eq('slug', slug).maybeSingle();
  return (data as { id: string } | null)?.id;
}

export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) return [];
  const { data } = await client()
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  return (data ?? []) as Category[];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  if (!isSupabaseConfigured()) return null;
  const { data } = await client().from('categories').select('*').eq('slug', slug).maybeSingle();
  return (data as Category) ?? null;
}

export async function getPublishedPosts(options?: {
  limit?: number;
  offset?: number;
  categorySlug?: string;
  tag?: string;
  excludeId?: string;
}): Promise<PostCard[]> {
  if (!isSupabaseConfigured()) return [];
  const { limit = 24, offset = 0, categorySlug, tag, excludeId } = options ?? {};

  // Resolve the slug to an id first. Filtering on an embedded resource
  // (`categories.slug`) does not restrict the parent rows in PostgREST unless
  // the join is marked `!inner`, and this is far harder to get subtly wrong.
  const categoryId = categorySlug ? await getCategoryId(categorySlug) : undefined;
  if (categorySlug && !categoryId) return [];

  let query = client()
    .from('posts')
    .select(CARD_COLUMNS)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (categoryId) query = query.eq('category_id', categoryId);
  if (tag) query = query.contains('tags', [tag]);
  if (excludeId) query = query.neq('id', excludeId);

  const { data } = await query;
  return ((data ?? []) as unknown[]).map((row) =>
    normalise(row as PostCard),
  ) as PostCard[];
}

/** Total published posts, for the index pagination footer. */
export async function countPublishedPosts(categorySlug?: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const categoryId = categorySlug ? await getCategoryId(categorySlug) : undefined;
  if (categorySlug && !categoryId) return 0;

  let query = client()
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString());
  if (categoryId) query = query.eq('category_id', categoryId);
  const { count } = await query;
  return count ?? 0;
}

export async function getPostBySlug(slug: string): Promise<PostWithCategory | null> {
  if (!isSupabaseConfigured()) return null;
  const { data } = await client()
    .from('posts')
    .select('*, category:categories(*)')
    .eq('slug', slug)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .maybeSingle();
  return data ? (normalise(data as PostWithCategory) as PostWithCategory) : null;
}

export async function getPostsByIds(ids: string[]): Promise<PostCard[]> {
  if (!isSupabaseConfigured() || ids.length === 0) return [];
  const { data } = await client()
    .from('posts')
    .select(CARD_COLUMNS)
    .in('id', ids)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString());

  const rows = ((data ?? []) as unknown[]).map((row) => normalise(row as PostCard)) as PostCard[];
  // Preserve the order the author picked in the editor.
  return ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as PostCard[];
}

/**
 * Hand-picked related posts, topped up with the newest from the same category.
 * Never returns the post itself.
 */
export async function getRelatedPosts(
  post: PostWithCategory,
  limit = 3,
): Promise<PostCard[]> {
  const picked = await getPostsByIds(post.related_ids.filter((id) => id !== post.id));
  if (picked.length >= limit) return picked.slice(0, limit);

  const fill = await getPublishedPosts({
    limit: limit + picked.length + 1,
    categorySlug: post.category?.slug,
    excludeId: post.id,
  });

  const seen = new Set(picked.map((p) => p.id));
  for (const candidate of fill) {
    if (picked.length >= limit) break;
    if (seen.has(candidate.id) || candidate.id === post.id) continue;
    picked.push(candidate);
    seen.add(candidate.id);
  }
  return picked.slice(0, limit);
}

export type PublishedIndexRow = {
  slug: string;
  published_at: string | null;
  updated_at: string;
  noindex: boolean;
};

/**
 * Every published slug with its dates. Feeds generateStaticParams, the sitemap
 * and the RSS feed. `noindex` rides along so the sitemap can drop those rows --
 * listing a noindex URL in a sitemap is a contradiction Search Console reports.
 */
export async function getPublishedIndex(): Promise<PublishedIndexRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data } = await client()
    .from('posts')
    .select('slug, published_at, updated_at, noindex')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false });
  return (data ?? []) as PublishedIndexRow[];
}

/** Distinct tags across published posts, for the index page's tag rail. */
export async function getPublishedTags(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  const { data } = await client()
    .from('posts')
    .select('tags')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString());
  const all = ((data ?? []) as { tags: string[] }[]).flatMap((r) => r.tags ?? []);
  return [...new Set(all)].sort((a, b) => a.localeCompare(b));
}
