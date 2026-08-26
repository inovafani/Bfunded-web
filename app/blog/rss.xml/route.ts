import { SITE_URL } from '@/lib/site';
import { getPublishedPosts } from '@/lib/cms/queries';
import { escapeHtml } from '@/lib/cms/format';

export const revalidate = 3600;

/**
 * RSS 2.0 feed.
 *
 * Feeds still matter for distribution: newsletter tools, Feedly, and several
 * of the aggregators that syndicate startup-finance writing all consume one,
 * and each syndication is another link back.
 */
export async function GET() {
  const posts = await getPublishedPosts({ limit: 40 });

  const items = posts
    .map((post) => {
      const url = `${SITE_URL}/blog/${post.slug}`;
      return `    <item>
      <title>${escapeHtml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${post.published_at ? new Date(post.published_at).toUTCString() : ''}</pubDate>
      <dc:creator>${escapeHtml(post.author)}</dc:creator>${
        post.category ? `\n      <category>${escapeHtml(post.category.name)}</category>` : ''
      }
      <description>${escapeHtml(post.excerpt ?? '')}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>BFunded Blog</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>Practical writing on raising an early-stage round.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
