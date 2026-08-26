import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { countPublishedPosts, getCategories, getPublishedPosts } from '@/lib/cms/queries';
import { POSTS_PER_PAGE } from '@/lib/cms/types';
import BlogIndex from './_components/BlogIndex';

// ISR: the CDN serves this until a save calls revalidatePath, and re-checks
// hourly regardless so a scheduled post appears without anyone touching it.
export const revalidate = 3600;

const TITLE = 'The BFunded Blog: Fundraising, Investors and the Early-Stage Raise';
const DESCRIPTION =
  'Practical writing on raising an early-stage round — investor outreach, equity crowdfunding, cap tables and what actually separates founders who close from founders who stall.';

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | BFunded` },
  description: DESCRIPTION,
  alternates: { canonical: '/blog', types: { 'application/rss+xml': '/blog/rss.xml' } },
  openGraph: {
    type: 'website',
    siteName: 'BFunded',
    url: `${SITE_URL}/blog`,
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/og-card.jpg`],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

export default async function BlogIndexPage() {
  const [posts, categories, total] = await Promise.all([
    getPublishedPosts({ limit: POSTS_PER_PAGE }),
    getCategories(),
    countPublishedPosts(),
  ]);

  return (
    <BlogIndex
      eyebrow="BFunded Journal"
      heading="How early-stage rounds actually get closed"
      lede={DESCRIPTION}
      path="/blog"
      metaDescription={DESCRIPTION}
      posts={posts}
      categories={categories}
      page={1}
      totalPages={Math.max(1, Math.ceil(total / POSTS_PER_PAGE))}
      pageBase="/blog"
      trail={[
        { name: 'Home', url: '/' },
        { name: 'Blog', url: '/blog' },
      ]}
    />
  );
}
