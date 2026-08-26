import { LIMITS } from './types';
import { htmlToText, wordCount } from './format';

/**
 * The live SEO checklist shown beside the editor.
 *
 * This is deliberately a set of plain, checkable rules rather than a score out
 * of 100 -- the point is to tell the writer the one concrete thing to fix next,
 * which a number never does. Everything here is pure so the editor can re-run
 * it on every keystroke.
 */

export type CheckStatus = 'pass' | 'warn' | 'fail';

export type SeoCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
};

export type SeoSubject = {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  excerpt: string;
  bodyHtml: string;
  coverUrl: string;
  coverAlt: string;
};

/** Case- and punctuation-insensitive "does the haystack contain the phrase". */
function contains(haystack: string, needle: string): boolean {
  if (!needle.trim()) return false;
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return norm(haystack).includes(norm(needle));
}

function headings(html: string): string[] {
  return [...html.matchAll(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) =>
    htmlToText(m[2]),
  );
}

function links(html: string): string[] {
  return [...html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)].map((m) => m[1]);
}

export function runSeoChecks(subject: SeoSubject): SeoCheck[] {
  const {
    title,
    slug,
    metaTitle,
    metaDescription,
    focusKeyword,
    excerpt,
    bodyHtml,
    coverUrl,
    coverAlt,
  } = subject;

  const text = htmlToText(bodyHtml);
  const words = wordCount(text);
  const opening = text.split(/\s+/).slice(0, 100).join(' ');
  const hs = headings(bodyHtml);
  const hrefs = links(bodyHtml);
  const effectiveTitle = metaTitle.trim() || title.trim();
  const keyword = focusKeyword.trim();

  const checks: SeoCheck[] = [];
  const add = (id: string, label: string, status: CheckStatus, detail: string) =>
    checks.push({ id, label, status, detail });

  // --- the keyword itself -------------------------------------------------
  if (!keyword) {
    add(
      'keyword',
      'Focus keyword',
      'fail',
      'Not set. Pick the phrase this post should rank for — every check below depends on it.',
    );
  } else {
    add('keyword', 'Focus keyword', 'pass', `Targeting “${keyword}”.`);

    add(
      'keyword-title',
      'Keyword in the title',
      contains(effectiveTitle, keyword) ? 'pass' : 'fail',
      contains(effectiveTitle, keyword)
        ? 'Found in the SEO title.'
        : 'Missing. The title is the strongest on-page signal there is.',
    );

    add(
      'keyword-slug',
      'Keyword in the URL',
      contains(slug.replace(/-/g, ' '), keyword) ? 'pass' : 'warn',
      contains(slug.replace(/-/g, ' '), keyword)
        ? 'The slug contains the keyword.'
        : 'The slug does not contain the keyword. Change it before publishing — not after.',
    );

    add(
      'keyword-meta',
      'Keyword in the meta description',
      contains(metaDescription, keyword) ? 'pass' : 'warn',
      contains(metaDescription, keyword)
        ? 'Found. Google bolds it in the result.'
        : 'Add it — the match is bolded in search results, which lifts click-through.',
    );

    add(
      'keyword-intro',
      'Keyword in the first 100 words',
      contains(opening, keyword) ? 'pass' : 'warn',
      contains(opening, keyword)
        ? 'The opening states what the post is about.'
        : 'Say the phrase in the opening paragraph, in a sentence that reads naturally.',
    );

    add(
      'keyword-heading',
      'Keyword in a subheading',
      hs.some((h) => contains(h, keyword)) ? 'pass' : 'warn',
      hs.some((h) => contains(h, keyword))
        ? 'At least one H2/H3 uses the keyword.'
        : 'No H2 or H3 mentions it. Work it into one subheading.',
    );
  }

  // --- the search result itself -------------------------------------------
  const titleLen = effectiveTitle.length;
  add(
    'title-length',
    'SEO title length',
    titleLen === 0 ? 'fail' : titleLen > LIMITS.metaTitle ? 'warn' : titleLen < 30 ? 'warn' : 'pass',
    titleLen === 0
      ? 'Empty.'
      : titleLen > LIMITS.metaTitle
        ? `${titleLen} characters — Google truncates past ${LIMITS.metaTitle}.`
        : titleLen < 30
          ? `${titleLen} characters — short enough to look thin. Aim for 50–60.`
          : `${titleLen} characters. Good.`,
  );

  const descLen = metaDescription.trim().length;
  add(
    'description-length',
    'Meta description length',
    descLen === 0
      ? 'fail'
      : descLen > LIMITS.metaDescription || descLen < 70
        ? 'warn'
        : 'pass',
    descLen === 0
      ? 'Empty. Google will invent one from the page, and it is usually worse.'
      : descLen > LIMITS.metaDescription
        ? `${descLen} characters — cut to ${LIMITS.metaDescription} or it gets clipped.`
        : descLen < 70
          ? `${descLen} characters — you are leaving room unused. Aim for 140–160.`
          : `${descLen} characters. Good.`,
  );

  // --- the content --------------------------------------------------------
  add(
    'length',
    'Article length',
    words >= 900 ? 'pass' : words >= 500 ? 'warn' : 'fail',
    words >= 900
      ? `${words} words — enough depth to compete.`
      : words >= 500
        ? `${words} words. Workable, but the pages already ranking are longer.`
        : `${words} words. Too thin to rank for anything contested.`,
  );

  add(
    'structure',
    'Subheadings',
    hs.length >= 3 ? 'pass' : hs.length >= 1 ? 'warn' : 'fail',
    hs.length >= 3
      ? `${hs.length} subheadings — scannable, and eligible for sitelinks.`
      : hs.length >= 1
        ? `Only ${hs.length}. Break the article into more sections.`
        : 'None. Add H2s — they are how Google works out the structure.',
  );

  const internal = hrefs.filter((h) => h.startsWith('/') || h.includes('bfunded.io'));
  const external = hrefs.filter((h) => /^https?:\/\//i.test(h) && !h.includes('bfunded.io'));

  add(
    'internal-links',
    'Internal links',
    internal.length >= 2 ? 'pass' : internal.length === 1 ? 'warn' : 'fail',
    internal.length >= 2
      ? `${internal.length} links to other BFunded pages.`
      : 'Link to at least two other BFunded pages. This is what makes the whole first page yours.',
  );

  add(
    'external-links',
    'Outbound links',
    external.length >= 1 ? 'pass' : 'warn',
    external.length >= 1
      ? `${external.length} outbound link(s) — reads as researched.`
      : 'Cite one credible source. Pages that cite nothing read as thin.',
  );

  // --- media and sharing --------------------------------------------------
  add(
    'cover',
    'Featured image',
    coverUrl ? (coverAlt.trim() ? 'pass' : 'warn') : 'fail',
    coverUrl
      ? coverAlt.trim()
        ? 'Set, with alt text.'
        : 'Set, but the alt text is empty — that is a wasted Google Images signal.'
      : 'None. Every share on LinkedIn and X will fall back to a bare link.',
  );

  add(
    'excerpt',
    'Excerpt',
    excerpt.trim() ? 'pass' : 'warn',
    excerpt.trim()
      ? 'Set — this is what the blog index card shows.'
      : 'Empty. The listing card will fall back to the opening of the article.',
  );

  return checks;
}

export function seoSummary(checks: SeoCheck[]) {
  return {
    pass: checks.filter((c) => c.status === 'pass').length,
    warn: checks.filter((c) => c.status === 'warn').length,
    fail: checks.filter((c) => c.status === 'fail').length,
    total: checks.length,
  };
}
