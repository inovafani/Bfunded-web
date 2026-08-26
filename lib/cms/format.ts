/**
 * Pure helpers shared by the editor (in the browser) and the API routes (on
 * the server), so nothing in here may touch the DOM or Node built-ins.
 */

/** URL-safe slug. Keeps a-z0-9 and single hyphens; strips accents. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

const BLOCK_TAG = /<\/(p|div|h[1-6]|li|blockquote|tr|figcaption)>/gi;

/**
 * Readable plain text from the editor's HTML. Used for the stored `body_text`
 * (word count, excerpt fallback, SEO checks), never for rendering.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(BLOCK_TAG, '$& ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function wordCount(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

/** 225 wpm, the usual figure for online prose. Always at least 1. */
export function readingMinutes(text: string): number {
  return Math.max(1, Math.round(wordCount(text) / 225));
}

/** First ~N characters at a word boundary, for the excerpt fallback. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** "26 August 2026" — matches the tone of the marketing pages. */
export function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** "2026-08-26" for <time datetime> and schema.org dates. */
export function isoDate(iso: string | null): string {
  return iso ? new Date(iso).toISOString() : '';
}

/** Escapes text destined for an HTML attribute or JSON-LD string. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Adds stable `id` anchors to the article's H2/H3 elements and returns the
 * table of contents built from them.
 *
 * Worth doing for two reasons: readers can link to a section, and Google uses
 * anchored headings to build the "jump to" sitelinks that appear under a
 * result. The regex is safe here because the HTML is not arbitrary -- it comes
 * from the editor's schema, which only ever emits simple heading elements.
 */
export function withHeadingAnchors(html: string): {
  html: string;
  toc: { id: string; text: string; level: 2 | 3 }[];
} {
  const toc: { id: string; text: string; level: 2 | 3 }[] = [];
  const used = new Set<string>();

  const out = html.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (match, levelRaw: string, attrs: string, inner: string) => {
      const text = htmlToText(inner);
      if (!text) return match;

      // Respect an id the heading already carries, so the anchor in the
      // contents list and the one in the markup can never disagree.
      const existing = /\bid=["']([^"']+)["']/.exec(attrs)?.[1];

      let id = existing ?? (slugify(text) || `section-${toc.length + 1}`);
      if (!existing) {
        // Two sections can legitimately share a heading; ids cannot.
        let suffix = 2;
        while (used.has(id)) id = `${slugify(text)}-${suffix++}`;
      }
      used.add(id);

      toc.push({ id, text, level: Number(levelRaw) as 2 | 3 });

      if (existing) return match;
      return `<h${levelRaw}${attrs} id="${id}">${inner}</h${levelRaw}>`;
    },
  );

  return { html: out, toc };
}
