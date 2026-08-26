import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SITE_URL } from '@/lib/site';
import {
  countPublishedPosts,
  getCategories,
  getCategoryBySlug,
  getPublishedPosts,
} from '@/lib/cms/queries';
import { POSTS_PER_PAGE } from '@/lib/cms/types';
import BlogIndex from '../../_components/BlogIndex';

export const revalidate = 3600;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategoryBySlug((await params).slug);
  if (!category) return { title: 'Category not found' };

  const title = `${category.name} — BFunded Blog`;
  const description =
    category.meta_description?.trim() ||
    category.description?.trim() ||
    `Every BFunded article on ${category.name.toLowerCase()}.`;

  return {
    title: { absolute: `${title} | BFunded` },
    description,
    alternates: { canonical: `/blog/category/${category.slug}` },
    openGraph: {
      type: 'website',
      siteName: 'BFunded',
      url: `${SITE_URL}/blog/category/${category.slug}`,
      title,
      description,
      images: [`${SITE_URL}/og-card.jpg`],
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [posts, categories, total] = await Promise.all([
    getPublishedPosts({ limit: POSTS_PER_PAGE, categorySlug: slug }),
    getCategories(),
    countPublishedPosts(slug),
  ]);

  const description =
    category.description?.trim() ||
    category.meta_description?.trim() ||
    `Every BFunded article on ${category.name.toLowerCase()}.`;

  return (
    <BlogIndex
      eyebrow="Category"
      heading={category.name}
      lede={description}
      path={`/blog/category/${category.slug}`}
      metaDescription={description}
      posts={posts}
      categories={categories}
      activeCategory={category.slug}
      page={1}
      totalPages={Math.max(1, Math.ceil(total / POSTS_PER_PAGE))}
      pageBase={`/blog/category/${category.slug}`}
      trail={[
        { name: 'Home', url: '/' },
        { name: 'Blog', url: '/blog' },
        { name: category.name, url: `/blog/category/${category.slug}` },
      ]}
    />
  );
}
