import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// `/contoh/` holds the captured source pages. They stay in public/ (they are the
// reference the routes are built from), so they are reachable -- keep them out of
// search results to avoid indexing duplicate copies of the real pages.
//
// /admin and /api are the CMS. Nothing there should ever be crawled; the
// noindex metadata and the netlify.toml header cover the same ground for
// anything that ignores robots.txt.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/invest', '/__forms.html', '/contoh/', '/admin', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
