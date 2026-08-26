'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LIMITS, SCHEMA_TYPES, type Category, type FaqItem, type Post, type SchemaType } from '@/lib/cms/types';
import { formatDate, slugify } from '@/lib/cms/format';
import CoverImageField from './CoverImageField';
import FaqBuilder from './FaqBuilder';
import RichTextEditor from './RichTextEditor';
import SeoPanel from './SeoPanel';
import TagInput from './TagInput';

export type RelatedOption = { id: string; title: string; slug: string; status: string };

type FormState = {
  title: string;
  slug: string;
  author: string;
  category_id: string;
  tags: string[];
  body_html: string;
  excerpt: string;
  cover_url: string;
  cover_alt: string;
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  canonical_url: string;
  schema_type: SchemaType;
  faq: FaqItem[];
  noindex: boolean;
  og_title: string;
  og_description: string;
  og_url: string;
  related_ids: string[];
  status: 'draft' | 'published';
  published_at: string;
};

function blankForm(): FormState {
  return {
    title: '',
    slug: '',
    author: 'BFunded',
    category_id: '',
    tags: [],
    body_html: '',
    excerpt: '',
    cover_url: '',
    cover_alt: '',
    meta_title: '',
    meta_description: '',
    focus_keyword: '',
    canonical_url: '',
    schema_type: 'Article',
    faq: [],
    noindex: false,
    og_title: '',
    og_description: '',
    og_url: '',
    related_ids: [],
    status: 'draft',
    published_at: '',
  };
}

function fromPost(post: Post): FormState {
  return {
    title: post.title,
    slug: post.slug,
    author: post.author,
    category_id: post.category_id ?? '',
    tags: post.tags ?? [],
    body_html: post.body_html ?? '',
    excerpt: post.excerpt ?? '',
    cover_url: post.cover_url ?? '',
    cover_alt: post.cover_alt ?? '',
    meta_title: post.meta_title ?? '',
    meta_description: post.meta_description ?? '',
    focus_keyword: post.focus_keyword ?? '',
    canonical_url: post.canonical_url ?? '',
    schema_type: post.schema_type,
    faq: post.faq ?? [],
    noindex: post.noindex,
    og_title: post.og_title ?? '',
    og_description: post.og_description ?? '',
    og_url: post.og_url ?? '',
    related_ids: post.related_ids ?? [],
    status: post.status,
    published_at: post.published_at ?? '',
  };
}

/** ISO -> the value a <input type="datetime-local"> expects, in local time. */
function toLocalInput(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function CharCount({ value, limit }: { value: string; limit: number }) {
  return (
    <span className="bfa-count" data-over={value.length > limit}>
      {value.length}/{limit}
    </span>
  );
}

export default function PostEditor({
  post,
  categories,
  relatedOptions,
  tagSuggestions,
  siteUrl,
}: {
  post: Post | null;
  categories: Category[];
  relatedOptions: RelatedOption[];
  tagSuggestions: string[];
  siteUrl: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => (post ? fromPost(post) : blankForm()));
  const [postId, setPostId] = useState<string | null>(post?.id ?? null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(post?.updated_at ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // A hand-edited slug is never overwritten again. Existing posts count as
  // edited from the start: their URL is already indexed and must not drift.
  const slugLocked = useRef(Boolean(post));

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }, []);

  // Nothing autosaves, so leaving with unsaved edits has to be interrupted.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const upload = useCallback(async (file: File): Promise<string> => {
    const body = new FormData();
    body.append('file', file);
    const response = await fetch('/api/admin/media', { method: 'POST', body });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? 'Upload failed.');
    return payload.url as string;
  }, []);

  async function save(nextStatus?: 'draft' | 'published') {
    const status = nextStatus ?? form.status;

    if (!form.title.trim()) {
      setError('Give the article a title before saving.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      status,
      slug: form.slug.trim() || slugify(form.title),
      category_id: form.category_id || null,
      published_at: form.published_at || null,
    };

    const response = await fetch(
      postId ? `/api/admin/posts/${postId}` : '/api/admin/posts',
      {
        method: postId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    const body = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      setError(body.error ?? 'Could not save. Try again.');
      return;
    }

    const saved = body.post as { id: string; slug: string };
    setForm((current) => ({
      ...current,
      status,
      slug: saved.slug,
      // Publishing stamps the date server-side; mirror it so the field and the
      // Google preview stop showing an empty publish date.
      published_at:
        current.published_at ||
        (status === 'published' ? new Date().toISOString() : current.published_at),
    }));
    setDirty(false);
    setSavedAt(new Date().toISOString());

    if (!postId) {
      setPostId(saved.id);
      // replace, not push: the "new" URL should not sit in the back history.
      router.replace(`/admin/posts/${saved.id}`);
    }
    router.refresh();
  }

  async function remove() {
    if (!postId) return;
    setSaving(true);
    const response = await fetch(`/api/admin/posts/${postId}`, { method: 'DELETE' });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Could not delete that article.');
      setSaving(false);
      setConfirmDelete(false);
      return;
    }
    setDirty(false);
    router.replace('/admin');
    router.refresh();
  }

  const seoSubject = useMemo(
    () => ({
      title: form.title,
      slug: form.slug,
      metaTitle: form.meta_title,
      metaDescription: form.meta_description,
      focusKeyword: form.focus_keyword,
      excerpt: form.excerpt,
      bodyHtml: form.body_html,
      coverUrl: form.cover_url,
      coverAlt: form.cover_alt,
    }),
    [form],
  );

  const otherPosts = relatedOptions.filter((option) => option.id !== postId);

  return (
    <>
      <div className="bfa-page-head">
        <div>
          <p className="bfa-eyebrow">{postId ? 'Edit article' : 'New article'}</p>
          <h1 className="bfa-h1">{form.title.trim() || 'Untitled article'}</h1>
          <p className="bfa-lede">
            {form.status === 'published' ? (
              <>
                Live at{' '}
                <a href={`/blog/${form.slug}`} target="_blank" rel="noreferrer">
                  /blog/{form.slug}
                </a>
                . Edits go out the moment you save.
              </>
            ) : (
              'Draft — not visible to anyone, and not crawlable, until you publish it.'
            )}
          </p>
        </div>
        <div className="bfa-page-head-actions">
          <Link className="bfa-btn bfa-btn-ghost" href="/admin">
            ← All articles
          </Link>
        </div>
      </div>

      {error ? (
        <div className="bfa-notice" data-tone="error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="bfa-editor">
        <div>
          {/* ---------------------------------------------------------- article */}
          <section className="bfa-panel">
            <h2 className="bfa-panel-title">Article</h2>

            <div className="bfa-field">
              <label className="bfa-label" htmlFor="title">
                Title <span className="bfa-req">*</span>
              </label>
              <input
                id="title"
                className="bfa-input"
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((current) => ({
                    ...current,
                    title,
                    slug: slugLocked.current ? current.slug : slugify(title),
                  }));
                  setDirty(true);
                }}
                placeholder="e.g. How to Raise a Pre-Seed Round in 2026: The Founder's Guide"
              />
              <p className="bfa-hint">
                Lead with the phrase people actually search. The number and the year earn clicks.
              </p>
            </div>

            <div className="bfa-field">
              <label className="bfa-label" htmlFor="slug">
                URL slug <span className="bfa-req">*</span>
              </label>
              <input
                id="slug"
                className="bfa-input"
                value={form.slug}
                onChange={(e) => {
                  slugLocked.current = true;
                  set('slug', e.target.value);
                }}
                onBlur={(e) => set('slug', slugify(e.target.value))}
                placeholder="how-to-raise-a-pre-seed-round"
              />
              <p className="bfa-hint">
                <code>
                  {siteUrl}/blog/{form.slug || '…'}
                </code>
                {post ? ' — changing this on a live article breaks every existing link to it.' : ''}
              </p>
            </div>

            <div className="bfa-row">
              <div className="bfa-field">
                <label className="bfa-label" htmlFor="author">
                  Author
                </label>
                <input
                  id="author"
                  className="bfa-input"
                  value={form.author}
                  onChange={(e) => set('author', e.target.value)}
                  placeholder="BFunded"
                />
              </div>

              <div className="bfa-field">
                <label className="bfa-label" htmlFor="category">
                  Category
                </label>
                <select
                  id="category"
                  className="bfa-select"
                  value={form.category_id}
                  onChange={(e) => set('category_id', e.target.value)}
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <p className="bfa-hint">
                  Each category has its own indexable archive at /blog/category/…
                </p>
              </div>
            </div>

            <div className="bfa-field">
              <label className="bfa-label">
                Tags <em>keyword labels, shown on the article</em>
              </label>
              <TagInput
                value={form.tags}
                onChange={(tags) => set('tags', tags)}
                suggestions={tagSuggestions}
              />
            </div>
          </section>

          {/* ---------------------------------------------------------- content */}
          <section className="bfa-panel">
            <h2 className="bfa-panel-title">Content</h2>

            <div className="bfa-field">
              <label className="bfa-label">Article body</label>
              <RichTextEditor
                value={form.body_html}
                onChange={(html) => set('body_html', html)}
                onUpload={upload}
              />
            </div>

            <div className="bfa-field">
              <label className="bfa-label" htmlFor="excerpt">
                Excerpt <em>the card on /blog, not the Google snippet</em>
                <CharCount value={form.excerpt} limit={LIMITS.excerpt} />
              </label>
              <textarea
                id="excerpt"
                className="bfa-textarea"
                value={form.excerpt}
                onChange={(e) => set('excerpt', e.target.value)}
                placeholder="One or two sentences that make someone want to open it."
              />
              <p className="bfa-hint">Left empty, the opening of the article is used instead.</p>
            </div>
          </section>

          {/* ---------------------------------------------------- featured image */}
          <section className="bfa-panel">
            <h2 className="bfa-panel-title">Featured image</h2>

            <div className="bfa-field">
              <CoverImageField
                url={form.cover_url}
                onChange={(url) => set('cover_url', url)}
                onUpload={upload}
              />
            </div>

            <div className="bfa-field">
              <label className="bfa-label" htmlFor="cover_alt">
                Alt text <em>what Google Images reads</em>
              </label>
              <input
                id="cover_alt"
                className="bfa-input"
                value={form.cover_alt}
                onChange={(e) => set('cover_alt', e.target.value)}
                placeholder="e.g. Founder reviewing a pre-seed cap table on a laptop"
              />
              <p className="bfa-hint">
                Describe the image honestly, and work the focus keyword in only if it fits.
              </p>
            </div>
          </section>

          {/* -------------------------------------------------- search appearance */}
          <section className="bfa-panel">
            <h2 className="bfa-panel-title">Search appearance</h2>

            <div className="bfa-field">
              <label className="bfa-label" htmlFor="focus_keyword">
                Focus keyword <em>the one phrase this post should win</em>
              </label>
              <input
                id="focus_keyword"
                className="bfa-input"
                value={form.focus_keyword}
                onChange={(e) => set('focus_keyword', e.target.value)}
                placeholder="e.g. how to raise a pre-seed round"
              />
              <p className="bfa-hint">
                One phrase per article. Two articles targeting the same phrase compete with each
                other instead of with everyone else.
              </p>
            </div>

            <div className="bfa-field">
              <label className="bfa-label" htmlFor="meta_title">
                SEO title
                <CharCount value={form.meta_title} limit={LIMITS.metaTitle} />
              </label>
              <input
                id="meta_title"
                className="bfa-input"
                value={form.meta_title}
                onChange={(e) => set('meta_title', e.target.value)}
                placeholder={form.title || 'Falls back to the article title'}
              />
              <p className="bfa-hint">
                Shown in the search result and the browser tab. “ | BFunded” is appended
                automatically.
              </p>
            </div>

            <div className="bfa-field">
              <label className="bfa-label" htmlFor="meta_description">
                Meta description
                <CharCount value={form.meta_description} limit={LIMITS.metaDescription} />
              </label>
              <textarea
                id="meta_description"
                className="bfa-textarea"
                value={form.meta_description}
                onChange={(e) => set('meta_description', e.target.value)}
                placeholder="The sentence under the title in Google. Say what the reader gets, and use the keyword once."
              />
            </div>

            <div className="bfa-field">
              <label className="bfa-label" htmlFor="canonical_url">
                Canonical URL <em>leave blank unless this was published elsewhere first</em>
              </label>
              <input
                id="canonical_url"
                className="bfa-input"
                value={form.canonical_url}
                onChange={(e) => set('canonical_url', e.target.value)}
                placeholder={`${siteUrl}/blog/${form.slug || '…'}`}
              />
            </div>

            <div className="bfa-field">
              <label className="bfa-label">Structured data</label>
              <div className="bfa-chips">
                {SCHEMA_TYPES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="bfa-chip"
                    aria-pressed={form.schema_type === option.value}
                    onClick={() => set('schema_type', option.value)}
                    title={option.hint}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="bfa-hint">
                {SCHEMA_TYPES.find((o) => o.value === form.schema_type)?.hint}. Every article also
                emits BreadcrumbList and Organization markup.
              </p>
            </div>

            {form.schema_type === 'FAQPage' ? (
              <div className="bfa-field">
                <label className="bfa-label">
                  FAQ pairs <em>rendered on the page and sent to Google</em>
                </label>
                <FaqBuilder items={form.faq} onChange={(faq) => set('faq', faq)} />
              </div>
            ) : null}

            <div className="bfa-field">
              <label className="bfa-toggle">
                <input
                  type="checkbox"
                  checked={form.noindex}
                  onChange={(e) => set('noindex', e.target.checked)}
                />
                <span className="bfa-toggle-track" />
                <span className="bfa-toggle-label">
                  <b>Hide from search engines</b>
                  <br />
                  <span>
                    Adds noindex and drops it from the sitemap. For landing pages and thin
                    announcements only.
                  </span>
                </span>
              </label>
            </div>
          </section>

          {/* ----------------------------------------------------- social sharing */}
          <section className="bfa-panel">
            <h2 className="bfa-panel-title">Social sharing</h2>
            <p className="bfa-hint" style={{ marginTop: -10, marginBottom: 20 }}>
              How the link looks on LinkedIn, X, Slack and WhatsApp. Left blank, each falls back to
              the SEO title, meta description and featured image.
            </p>

            <div className="bfa-field">
              <label className="bfa-label" htmlFor="og_title">
                Share title
                <CharCount value={form.og_title} limit={LIMITS.ogTitle} />
              </label>
              <input
                id="og_title"
                className="bfa-input"
                value={form.og_title}
                onChange={(e) => set('og_title', e.target.value)}
                placeholder="Falls back to the SEO title"
              />
            </div>

            <div className="bfa-field">
              <label className="bfa-label" htmlFor="og_description">
                Share description
                <CharCount value={form.og_description} limit={LIMITS.ogDescription} />
              </label>
              <textarea
                id="og_description"
                className="bfa-textarea"
                value={form.og_description}
                onChange={(e) => set('og_description', e.target.value)}
                placeholder="Falls back to the meta description"
              />
            </div>

            <div className="bfa-field">
              <label className="bfa-label" htmlFor="og_url">
                Share image URL
              </label>
              <input
                id="og_url"
                className="bfa-input"
                value={form.og_url}
                onChange={(e) => set('og_url', e.target.value)}
                placeholder="Falls back to the featured image"
              />
            </div>
          </section>

          {/* --------------------------------------------------- internal linking */}
          <section className="bfa-panel">
            <h2 className="bfa-panel-title">Related articles</h2>
            <p className="bfa-hint" style={{ marginTop: -10, marginBottom: 18 }}>
              Shown at the end of the article. Pick up to six; anything you leave unfilled is topped
              up automatically with the newest posts in the same category.
            </p>

            {otherPosts.length === 0 ? (
              <p className="bfa-hint">Nothing else has been written yet.</p>
            ) : (
              <div className="bfa-chips">
                {otherPosts.map((option) => {
                  const on = form.related_ids.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className="bfa-chip"
                      aria-pressed={on}
                      onClick={() =>
                        set(
                          'related_ids',
                          on
                            ? form.related_ids.filter((id) => id !== option.id)
                            : form.related_ids.length >= 6
                              ? form.related_ids
                              : [...form.related_ids, option.id],
                        )
                      }
                    >
                      {option.title}
                      {option.status === 'draft' ? ' (draft)' : ''}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ------------------------------------------------------------ publish */}
          <section className="bfa-panel">
            <h2 className="bfa-panel-title">Publishing</h2>

            <div className="bfa-field">
              <label className="bfa-toggle">
                <input
                  type="checkbox"
                  checked={form.status === 'published'}
                  onChange={(e) => set('status', e.target.checked ? 'published' : 'draft')}
                />
                <span className="bfa-toggle-track" />
                <span className="bfa-toggle-label">
                  <b>{form.status === 'published' ? 'Published' : 'Draft'}</b>
                  <br />
                  <span>
                    {form.status === 'published'
                      ? 'Visible on /blog, in the sitemap and to Google.'
                      : 'Hidden from everyone until you switch this on and save.'}
                  </span>
                </span>
              </label>
            </div>

            <div className="bfa-field">
              <label className="bfa-label" htmlFor="published_at">
                Publish date <em>set a future date to schedule it</em>
              </label>
              <input
                id="published_at"
                className="bfa-input"
                type="datetime-local"
                value={toLocalInput(form.published_at)}
                onChange={(e) =>
                  set(
                    'published_at',
                    e.target.value ? new Date(e.target.value).toISOString() : '',
                  )
                }
              />
              <p className="bfa-hint">
                Sent to Google as <code>datePublished</code>. A date in the future keeps the article
                off the blog until it arrives. Leave blank and publishing stamps it now.
              </p>
            </div>

            {post ? (
              <p className="bfa-hint">
                Created {formatDate(post.created_at)} · last edited{' '}
                {formatDate(savedAt ?? post.updated_at)} — the edit date is sent as{' '}
                <code>dateModified</code>.
              </p>
            ) : null}
          </section>
        </div>

        <aside className="bfa-side">
          <SeoPanel subject={seoSubject} siteUrl={siteUrl} />
        </aside>
      </div>

      {/* --------------------------------------------------------------- savebar */}
      <div className="bfa-savebar">
        <span className="bfa-savebar-status">
          {saving
            ? 'Saving…'
            : dirty
              ? 'Unsaved changes'
              : savedAt
                ? `Saved · ${new Date(savedAt).toLocaleTimeString()}`
                : 'Not saved yet'}
        </span>

        {postId ? (
          <button
            type="button"
            className="bfa-btn bfa-btn-ghost"
            onClick={() => setConfirmDelete(true)}
            disabled={saving}
          >
            Delete
          </button>
        ) : null}

        {form.status === 'published' ? (
          <button
            type="button"
            className="bfa-btn"
            onClick={() => save('draft')}
            disabled={saving}
          >
            Unpublish
          </button>
        ) : (
          <button
            type="button"
            className="bfa-btn"
            onClick={() => save('draft')}
            disabled={saving}
          >
            Save draft
          </button>
        )}

        <button
          type="button"
          className="bfa-btn bfa-btn-primary"
          onClick={() => save('published')}
          disabled={saving}
        >
          {saving ? <span className="bfa-spin" /> : null}
          {form.status === 'published' ? 'Save changes' : 'Publish'}
        </button>
      </div>

      {confirmDelete ? (
        <div
          className="bfa-modal-scrim"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDelete(false);
          }}
        >
          <div className="bfa-modal">
            <h3>Delete this article?</h3>
            <p>
              {form.status === 'published'
                ? `It is live at /blog/${form.slug}. Deleting it starts returning 404 to Google and to anyone who linked to it.`
                : 'This draft will be removed permanently.'}{' '}
              There is no undo.
            </p>
            <div className="bfa-modal-actions">
              <button
                type="button"
                className="bfa-btn bfa-btn-ghost"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
              <button type="button" className="bfa-btn bfa-btn-danger" onClick={remove} disabled={saving}>
                Delete for good
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
