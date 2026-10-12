/**
 * Canonical origin used for metadataBase, OG image URLs, canonicals and the
 * sitemap.
 *
 * Resolution order:
 *  1. NEXT_PUBLIC_SITE_URL  -- only needed to canonicalise on another domain
 *  2. the production domain -- no www: www.bfunded.io 301s to the apex, so the
 *     apex is the canonical host
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bfunded.io';
