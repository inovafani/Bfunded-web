import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { SITE_URL } from '@/lib/site';
import { countPublishedPosts, getCategories, getPublishedPosts } from '@/lib/cms/queries';
import BlogIndex from '../../_components/BlogIndex';
import { POSTS_PER_PAGE } from '@/lib/cms/types';

export const revalidate = 3600;

type Props = { params: Promise<{ page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = Number((await params).page);
  const title = `The BFunded Blog — page ${page}`;

  return {
    title: { absolute: `${title} | BFunded` },
    description:
      'Older articles from the BFunded blog on fundraising, investor outreach and equity crowdfunding.',
    // Paginated pages carry their own canonical (never one pointing at /blog):
    // pointing them all at page one is how the articles on them stop being
    // crawled at all.
    alternates: { canonical: `/blog/page/${page}` },
    robots: { index: true, follow: true },
    openGraph: { type: 'website', siteName: 'BFunded', url: `${SITE_URL}/blog/page/${page}`, title },
  };
}

export default async function BlogPaginatedPage({ params }: Props) {
  const raw = (await params).page;
  const page = Number(raw);

  if (!/^\d+$/.test(raw) || page < 1) notFound();
  // /blog/page/1 and /blog would be duplicates of each other.
  if (page === 1) redirect('/blog');

  const total = await countPublishedPosts();
  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
  if (page > totalPages) notFound();

  const [posts, categories] = await Promise.all([
    getPublishedPosts({ limit: POSTS_PER_PAGE, offset: (page - 1) * POSTS_PER_PAGE }),
    getCategories(),
  ]);

  return (
    <BlogIndex
      eyebrow={`Page ${page}`}
      heading="How early-stage rounds actually get closed"
      lede="Everything BFunded has published on raising, in reverse order."
      path={`/blog/page/${page}`}
      metaDescription="Older articles from the BFunded blog."
      posts={posts}
      categories={categories}
      page={page}
      totalPages={totalPages}
      pageBase="/blog"
      trail={[
        { name: 'Home', url: '/' },
        { name: 'Blog', url: '/blog' },
        { name: `Page ${page}`, url: `/blog/page/${page}` },
      ]}
    />
  );
}
