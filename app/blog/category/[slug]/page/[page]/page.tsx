import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { SITE_URL } from '@/lib/site';
import {
  countPublishedPosts,
  getCategories,
  getCategoryBySlug,
  getPublishedPosts,
} from '@/lib/cms/queries';
import { POSTS_PER_PAGE } from '@/lib/cms/types';
import BlogIndex from '../../../../_components/BlogIndex';

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string; page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: 'Category not found' };

  const title = `${category.name} — page ${page}`;
  return {
    title: { absolute: `${title} | BFunded` },
    description: `Older BFunded articles on ${category.name.toLowerCase()}.`,
    alternates: { canonical: `/blog/category/${slug}/page/${page}` },
    openGraph: {
      type: 'website',
      siteName: 'BFunded',
      url: `${SITE_URL}/blog/category/${slug}/page/${page}`,
      title,
    },
  };
}

export default async function CategoryPaginatedPage({ params }: Props) {
  const { slug, page: rawPage } = await params;
  const page = Number(rawPage);

  if (!/^\d+$/.test(rawPage) || page < 1) notFound();
  if (page === 1) redirect(`/blog/category/${slug}`);

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const total = await countPublishedPosts(slug);
  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
  if (page > totalPages) notFound();

  const [posts, categories] = await Promise.all([
    getPublishedPosts({
      limit: POSTS_PER_PAGE,
      offset: (page - 1) * POSTS_PER_PAGE,
      categorySlug: slug,
    }),
    getCategories(),
  ]);

  const description =
    category.description?.trim() || `Every BFunded article on ${category.name.toLowerCase()}.`;

  return (
    <BlogIndex
      eyebrow={`${category.name} · page ${page}`}
      heading={category.name}
      lede={description}
      path={`/blog/category/${slug}/page/${page}`}
      metaDescription={description}
      posts={posts}
      categories={categories}
      activeCategory={slug}
      page={page}
      totalPages={totalPages}
      pageBase={`/blog/category/${slug}`}
      trail={[
        { name: 'Home', url: '/' },
        { name: 'Blog', url: '/blog' },
        { name: category.name, url: `/blog/category/${slug}` },
        { name: `Page ${page}`, url: `/blog/category/${slug}/page/${page}` },
      ]}
    />
  );
}
