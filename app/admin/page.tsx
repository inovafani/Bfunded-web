import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminConfigured } from '@/lib/supabase/env';
import AdminChrome from './_components/AdminChrome';
import PostList, { type AdminPostRow } from './_components/PostList';

export const dynamic = 'force-dynamic';

async function loadPosts(): Promise<{ posts: AdminPostRow[]; error: string | null }> {
  if (!isAdminConfigured()) {
    return { posts: [], error: 'SUPABASE_SERVICE_ROLE_KEY is not set on this deploy. Add it in Netlify under Site configuration → Environment variables, then redeploy.' };
  }

  const { data, error } = await createAdminClient()
    .from('posts')
    .select(
      'id, title, slug, status, author, published_at, updated_at, reading_minutes, focus_keyword, cover_url, category:categories(name, slug)',
    )
    .order('updated_at', { ascending: false })
    .limit(300);

  if (error) {
    return {
      posts: [],
      error:
        error.code === '42P01'
          ? 'The posts table does not exist yet. Run supabase/schema.sql in the Supabase SQL editor.'
          : error.message,
    };
  }

  // Supabase types the embedded category as an array; it is a single row here.
  const posts = (data ?? []).map((row) => ({
    ...row,
    category: Array.isArray(row.category) ? (row.category[0] ?? null) : (row.category ?? null),
  })) as AdminPostRow[];

  return { posts, error: null };
}

export default async function AdminDashboard() {
  const { posts, error } = await loadPosts();

  const published = posts.filter((p) => p.status === 'published');
  const drafts = posts.filter((p) => p.status === 'draft');
  const unoptimised = posts.filter((p) => !p.focus_keyword);

  return (
    <AdminChrome current="posts">
      <div className="bfa-page-head">
        <div>
          <p className="bfa-eyebrow">Articles</p>
          <h1 className="bfa-h1">Everything BFunded has published</h1>
          <p className="bfa-lede">
            Each article is one more result on page one. Write for a single keyword, link back to
            the pages that convert, and keep publishing.
          </p>
        </div>
        <div className="bfa-page-head-actions">
          <Link className="bfa-btn bfa-btn-primary" href="/admin/posts/new">
            New article
          </Link>
        </div>
      </div>

      {error ? (
        <div className="bfa-notice" data-tone="error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="bfa-stats">
        <div className="bfa-stat">
          <b>{published.length}</b>
          <span>Live on the site</span>
        </div>
        <div className="bfa-stat">
          <b>{drafts.length}</b>
          <span>In draft</span>
        </div>
        <div className="bfa-stat">
          <b>{unoptimised.length}</b>
          <span>No focus keyword</span>
        </div>
        <div className="bfa-stat">
          <b>{published.reduce((total, post) => total + post.reading_minutes, 0)}</b>
          <span>Minutes of content</span>
        </div>
      </div>

      <PostList posts={posts} />
    </AdminChrome>
  );
}
