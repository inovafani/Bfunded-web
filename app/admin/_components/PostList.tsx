'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { formatDate } from '@/lib/cms/format';

export type AdminPostRow = {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  author: string;
  published_at: string | null;
  updated_at: string;
  reading_minutes: number;
  focus_keyword: string | null;
  cover_url: string | null;
  category: { name: string; slug: string } | null;
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
  { id: 'needs-seo', label: 'Needs SEO' },
] as const;

type Filter = (typeof FILTERS)[number]['id'];

export default function PostList({ posts }: { posts: AdminPostRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [pendingDelete, setPendingDelete] = useState<AdminPostRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return posts.filter((post) => {
      if (filter === 'published' && post.status !== 'published') return false;
      if (filter === 'draft' && post.status !== 'draft') return false;
      // "Needs SEO" is the working queue: anything published without a focus
      // keyword is a post nobody decided what it should rank for.
      if (filter === 'needs-seo' && post.focus_keyword) return false;
      if (!needle) return true;
      return (
        post.title.toLowerCase().includes(needle) ||
        post.slug.toLowerCase().includes(needle) ||
        (post.focus_keyword ?? '').toLowerCase().includes(needle)
      );
    });
  }, [posts, query, filter]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    setError(null);

    const response = await fetch(`/api/admin/posts/${pendingDelete.id}`, { method: 'DELETE' });
    setBusyId(null);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Could not delete that article.');
      setPendingDelete(null);
      return;
    }

    setPendingDelete(null);
    router.refresh();
  }

  return (
    <>
      {error ? (
        <div className="bfa-notice" data-tone="error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="bfa-toolbar">
        <div className="bfa-search">
          <input
            className="bfa-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, slug or focus keyword…"
            aria-label="Search articles"
          />
        </div>
        <div className="bfa-chips">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="bfa-chip"
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="bfa-empty">
          <h3>{posts.length === 0 ? 'No articles yet' : 'Nothing matches that'}</h3>
          <p>
            {posts.length === 0
              ? 'Write the first one. Every published article is another result BFunded owns on page one.'
              : 'Try a different search, or clear the filter.'}
          </p>
        </div>
      ) : (
        <div className="bfa-list">
          {visible.map((post) => (
            <article className="bfa-item" key={post.id}>
              {post.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="bfa-item-thumb" src={post.cover_url} alt="" loading="lazy" />
              ) : (
                <div className="bfa-item-thumb bfa-item-thumb-empty" aria-hidden="true">
                  ▤
                </div>
              )}

              <div style={{ minWidth: 0 }}>
                <Link href={`/admin/posts/${post.id}`} className="bfa-item-title">
                  {post.title}
                </Link>
                <div className="bfa-item-meta">
                  <span className="bfa-pill" data-tone={post.status === 'published' ? 'live' : 'draft'}>
                    {post.status === 'published' ? 'Live' : 'Draft'}
                  </span>
                  {post.category ? (
                    <span className="bfa-pill" data-tone="muted">
                      {post.category.name}
                    </span>
                  ) : null}
                  <span>/blog/{post.slug}</span>
                  <span>
                    {post.status === 'published' && post.published_at
                      ? formatDate(post.published_at)
                      : `edited ${formatDate(post.updated_at)}`}
                  </span>
                  <span>{post.reading_minutes} min read</span>
                  {post.focus_keyword ? (
                    <span>🎯 {post.focus_keyword}</span>
                  ) : (
                    <span style={{ color: 'var(--warn)' }}>no focus keyword</span>
                  )}
                </div>
              </div>

              <div className="bfa-item-actions">
                {post.status === 'published' ? (
                  <a
                    className="bfa-btn bfa-btn-ghost bfa-btn-sm"
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                ) : null}
                <Link className="bfa-btn bfa-btn-sm" href={`/admin/posts/${post.id}`}>
                  Edit
                </Link>
                <button
                  type="button"
                  className="bfa-btn bfa-btn-ghost bfa-btn-sm"
                  onClick={() => setPendingDelete(post)}
                  disabled={busyId === post.id}
                  aria-label={`Delete ${post.title}`}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {pendingDelete ? (
        <div
          className="bfa-modal-scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bfa-delete-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPendingDelete(null);
          }}
        >
          <div className="bfa-modal">
            <h3 id="bfa-delete-title">Delete “{pendingDelete.title}”?</h3>
            <p>
              {pendingDelete.status === 'published'
                ? `This is live at /blog/${pendingDelete.slug}. Deleting it will start returning 404 to Google and to anyone who linked to it. There is no undo.`
                : 'This draft will be removed permanently. There is no undo.'}
            </p>
            <div className="bfa-modal-actions">
              <button
                type="button"
                className="bfa-btn bfa-btn-ghost"
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bfa-btn bfa-btn-danger"
                onClick={confirmDelete}
                disabled={busyId === pendingDelete.id}
              >
                {busyId === pendingDelete.id ? 'Deleting…' : 'Delete for good'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
