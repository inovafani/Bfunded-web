'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { slugify } from '@/lib/cms/format';
import type { Category } from '@/lib/cms/types';

export type CategoryRow = Category & { post_count: number };

const BLANK = { name: '', slug: '', description: '', meta_description: '', sort_order: 0 };

export default function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState({ ...BLANK });
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = editing
    ? {
        name: editing.name,
        slug: editing.slug,
        description: editing.description ?? '',
        meta_description: editing.meta_description ?? '',
        sort_order: editing.sort_order,
      }
    : draft;

  function patch(next: Partial<typeof BLANK>) {
    if (editing) setEditing({ ...editing, ...next } as CategoryRow);
    else setDraft({ ...draft, ...next });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const response = await fetch(
      editing ? `/api/admin/categories/${editing.id}` : '/api/admin/categories',
      {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, slug: slugify(form.slug || form.name) }),
      },
    );

    setBusy(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Could not save that category.');
      return;
    }

    setDraft({ ...BLANK });
    setEditing(null);
    router.refresh();
  }

  async function remove(category: CategoryRow) {
    const warning =
      category.post_count > 0
        ? `${category.post_count} article(s) use “${category.name}”. They will stay published but become uncategorised, and /blog/category/${category.slug} will start returning 404. Continue?`
        : `Delete “${category.name}”?`;
    if (!window.confirm(warning)) return;

    setBusy(true);
    const response = await fetch(`/api/admin/categories/${category.id}`, { method: 'DELETE' });
    setBusy(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Could not delete that category.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="bfa-editor">
      <div>
        {error ? (
          <div className="bfa-notice" data-tone="error" role="alert">
            {error}
          </div>
        ) : null}

        {categories.length === 0 ? (
          <div className="bfa-empty">
            <h3>No categories yet</h3>
            <p>Add the first one on the right.</p>
          </div>
        ) : (
          <div className="bfa-list">
            {categories.map((category) => (
              <div className="bfa-item" key={category.id} style={{ gridTemplateColumns: '1fr auto' }}>
                <div style={{ minWidth: 0 }}>
                  <span className="bfa-item-title">{category.name}</span>
                  <div className="bfa-item-meta">
                    <span>/blog/category/{category.slug}</span>
                    <span className="bfa-pill" data-tone={category.post_count ? 'live' : 'muted'}>
                      {category.post_count} article{category.post_count === 1 ? '' : 's'}
                    </span>
                    {category.description ? <span>{category.description}</span> : null}
                  </div>
                </div>
                <div className="bfa-item-actions">
                  <a
                    className="bfa-btn bfa-btn-ghost bfa-btn-sm"
                    href={`/blog/category/${category.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                  <button
                    type="button"
                    className="bfa-btn bfa-btn-sm"
                    onClick={() => {
                      setEditing(category);
                      setError(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="bfa-btn bfa-btn-ghost bfa-btn-sm"
                    onClick={() => remove(category)}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <aside className="bfa-side">
        <form className="bfa-panel" onSubmit={submit}>
          <h2 className="bfa-panel-title">{editing ? 'Edit category' : 'New category'}</h2>

          <div className="bfa-field">
            <label className="bfa-label" htmlFor="cat-name">
              Name <span className="bfa-req">*</span>
            </label>
            <input
              id="cat-name"
              className="bfa-input"
              value={form.name}
              required
              onChange={(e) => {
                const name = e.target.value;
                // Only auto-fill the slug while creating: an existing archive
                // URL is already indexed and should not move on a rename.
                patch(editing ? { name } : { name, slug: slugify(name) });
              }}
              placeholder="Fundraising"
            />
          </div>

          <div className="bfa-field">
            <label className="bfa-label" htmlFor="cat-slug">
              URL slug <span className="bfa-req">*</span>
            </label>
            <input
              id="cat-slug"
              className="bfa-input"
              value={form.slug}
              onChange={(e) => patch({ slug: e.target.value })}
              onBlur={(e) => patch({ slug: slugify(e.target.value) })}
              placeholder="fundraising"
            />
            <p className="bfa-hint">
              <code>/blog/category/{form.slug || '…'}</code>
            </p>
          </div>

          <div className="bfa-field">
            <label className="bfa-label" htmlFor="cat-description">
              Description <em>shown at the top of the archive</em>
            </label>
            <textarea
              id="cat-description"
              className="bfa-textarea"
              style={{ minHeight: 72 }}
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Running an early-stage raise end to end."
            />
          </div>

          <div className="bfa-field">
            <label className="bfa-label" htmlFor="cat-meta">
              Meta description <em>the archive&rsquo;s Google snippet</em>
            </label>
            <textarea
              id="cat-meta"
              className="bfa-textarea"
              style={{ minHeight: 72 }}
              value={form.meta_description}
              onChange={(e) => patch({ meta_description: e.target.value })}
              placeholder="Every BFunded guide on running an early-stage raise, in one place."
            />
          </div>

          <div className="bfa-field">
            <label className="bfa-label" htmlFor="cat-order">
              Sort order
            </label>
            <input
              id="cat-order"
              className="bfa-input"
              type="number"
              value={form.sort_order}
              onChange={(e) => patch({ sort_order: Number(e.target.value) })}
            />
            <p className="bfa-hint">Lowest first, in the blog&rsquo;s category rail.</p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="bfa-btn bfa-btn-primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Add category'}
            </button>
            {editing ? (
              <button
                type="button"
                className="bfa-btn bfa-btn-ghost"
                onClick={() => {
                  setEditing(null);
                  setError(null);
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </aside>
    </div>
  );
}
