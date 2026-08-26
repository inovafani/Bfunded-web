import { htmlToText, readingMinutes, slugify, truncate } from './format';
import type { FaqItem, PostStatus, SchemaType } from './types';

/**
 * Turns whatever the editor posted into a row the database will accept.
 *
 * The client already validates as you type, but this is the boundary that
 * actually matters -- it runs with the service-role key, so nothing past this
 * point gets a second look. Anything unrecognised is dropped rather than
 * passed through.
 */

const SCHEMA_TYPES: SchemaType[] = ['Article', 'FAQPage', 'HowTo'];
const STATUSES: PostStatus[] = ['draft', 'published'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Raw = Record<string, unknown>;

/** Discriminated so callers narrow on `ok` rather than on a missing field. */
export type Parsed =
  | { ok: true; row: Record<string, unknown> }
  | { ok: false; error: string };

const str = (v: unknown, max = 5000): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

/** Optional text column: '' becomes NULL so `is null` checks stay meaningful. */
const nullable = (v: unknown, max = 5000): string | null => str(v, max) || null;

const bool = (v: unknown): boolean => v === true || v === 'true';

function stringArray(v: unknown, max: number, itemMax = 60): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of v) {
    const value = str(item, itemMax);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

function faqArray(v: unknown): FaqItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      const row = (item ?? {}) as Raw;
      return { question: str(row.question, 300), answer: str(row.answer, 2000) };
    })
    .filter((item) => item.question && item.answer)
    .slice(0, 30);
}

function uuidArray(v: unknown, max = 6): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is string => typeof x === 'string' && UUID.test(x)))].slice(
    0,
    max,
  );
}

export function toPostRow(input: unknown): Parsed {
  const body = (input ?? {}) as Raw;

  const title = str(body.title, 200);
  if (!title) return { ok: false, error: 'A title is required.' };

  // The editor keeps the slug in sync with the title, but a hand-edited slug
  // can still arrive empty or as pure punctuation -- fall back to the title.
  const slug = slugify(str(body.slug, 200)) || slugify(title);
  if (!slug) {
    return {
      ok: false,
      error: 'Could not build a URL slug from that title. Add some letters or numbers.',
    };
  }

  const bodyHtml = typeof body.body_html === 'string' ? body.body_html.slice(0, 400_000) : '';
  const bodyText = htmlToText(bodyHtml);

  const status: PostStatus = STATUSES.includes(body.status as PostStatus)
    ? (body.status as PostStatus)
    : 'draft';

  const schemaType: SchemaType = SCHEMA_TYPES.includes(body.schema_type as SchemaType)
    ? (body.schema_type as SchemaType)
    : 'Article';

  // Publishing stamps the date once and never moves it: dateModified tracks
  // edits, dateFirstPublished must not. An explicit value (backdating, or
  // scheduling ahead) wins.
  let publishedAt: string | null = null;
  const explicit = str(body.published_at, 40);
  if (explicit && !Number.isNaN(Date.parse(explicit))) {
    publishedAt = new Date(explicit).toISOString();
  } else if (status === 'published') {
    publishedAt = new Date().toISOString();
  }

  return {
    ok: true,
    row: {
      title,
      slug,
      author: str(body.author, 120) || 'BFunded',
      category_id: UUID.test(str(body.category_id, 40)) ? str(body.category_id, 40) : null,
      tags: stringArray(body.tags, 20),

      body_html: bodyHtml,
      body_text: bodyText,
      excerpt: nullable(body.excerpt, 500) ?? (bodyText ? truncate(bodyText, 200) : null),
      reading_minutes: readingMinutes(bodyText),

      cover_url: nullable(body.cover_url, 1000),
      cover_alt: nullable(body.cover_alt, 300),

      meta_title: nullable(body.meta_title, 200),
      meta_description: nullable(body.meta_description, 400),
      focus_keyword: nullable(body.focus_keyword, 120),
      canonical_url: nullable(body.canonical_url, 1000),
      schema_type: schemaType,
      // Kept regardless of schema_type, so toggling to Article and back does
      // not silently discard the author's Q&A pairs.
      faq: faqArray(body.faq),
      noindex: bool(body.noindex),

      og_title: nullable(body.og_title, 200),
      og_description: nullable(body.og_description, 400),
      og_url: nullable(body.og_url, 1000),

      related_ids: uuidArray(body.related_ids),

      status,
      published_at: publishedAt,
    },
  };
}

export function toCategoryRow(input: unknown): Parsed {
  const body = (input ?? {}) as Raw;
  const name = str(body.name, 80);
  if (!name) return { ok: false, error: 'A category name is required.' };
  const slug = slugify(str(body.slug, 80)) || slugify(name);
  if (!slug) return { ok: false, error: 'Could not build a URL slug from that name.' };

  return {
    ok: true,
    row: {
      name,
      slug,
      description: nullable(body.description, 300),
      meta_description: nullable(body.meta_description, 400),
      sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
    },
  };
}
