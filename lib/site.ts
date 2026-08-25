/**
 * Canonical origin used for metadataBase, OG image URLs, canonicals and the
 * sitemap.
 *
 * Resolution order:
 *  1. NEXT_PUBLIC_SITE_URL  -- set this once the custom domain is attached
 *  2. URL                   -- injected by Netlify at build time (the site's
 *                              primary URL, e.g. https://bfunded.netlify.app)
 *  3. the production domain as a last resort
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL ?? 'https://www.bfunded.io';
