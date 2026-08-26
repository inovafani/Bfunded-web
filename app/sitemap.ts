import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { getCategories, getPublishedIndex } from '@/lib/cms/queries';
import { POSTS_PER_PAGE } from '@/lib/cms/types';

// Re-generated on the same cadence as the blog, and immediately whenever an
// article is saved (the API routes revalidate this path).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // /invest is intentionally excluded: it is noindex on the original too.
  const marketing: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/engine`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ];

  const [posts, categories] = await Promise.all([getPublishedIndex(), getCategories()]);
  const indexable = posts.filter((post) => !post.noindex);

  const blog: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
  ];

  // Paginated index pages, so the older articles on them stay discoverable.
  const pageCount = Math.ceil(indexable.length / POSTS_PER_PAGE);
  for (let page = 2; page <= pageCount; page += 1) {
    blog.push({
      url: `${SITE_URL}/blog/page/${page}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.4,
    });
  }

  const archives: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${SITE_URL}/blog/category/${category.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const articles: MetadataRoute.Sitemap = indexable.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.updated_at || post.published_at || now),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...marketing, ...blog, ...archives, ...articles];
}
