import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// `/contoh/` holds the captured source pages. They stay in public/ (they are the
// reference the routes are built from), so they are reachable -- keep them out of
// search results to avoid indexing duplicate copies of the real pages.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/invest', '/__forms.html', '/contoh/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
