import { SITE_URL } from '@/lib/site';
import { isoDate, truncate } from './format';
import type { PostCard, PostWithCategory } from './types';

/**
 * schema.org JSON-LD.
 *
 * This is the part Google reads to decide what a page *is*, and it is what
 * earns the extra surface area in a result -- breadcrumbs above the title,
 * expandable FAQ rows, the byline and date. Every graph here describes
 * something that is genuinely visible on the page; markup that does not is a
 * manual action waiting to happen.
 */

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function organizationSchema() {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: 'BFunded',
    url: SITE_URL,
    logo: `${SITE_URL}/assets/home/logo-white.svg`,
    email: 'hello@bfunded.io',
    description:
      'BFunded runs the early-stage raise: a 1M+ investor network, warm-path matching, automated outreach, and the signal to close.',
  };
}

function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_URL,
    name: 'BFunded',
    publisher: { '@id': ORGANIZATION_ID },
  };
}

function breadcrumbSchema(trail: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

/** The full graph for one article page. */
export function articleSchema(post: PostWithCategory) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const image = post.cover_url ?? `${SITE_URL}/og-card.jpg`;

  const trail = [
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    ...(post.category ? [{ name: post.category.name, url: `/blog/category/${post.category.slug}` }] : []),
    { name: post.title, url: `/blog/${post.slug}` },
  ];

  // HowTo needs a step list to be eligible for anything, and the editor has no
  // step builder -- so it degrades to Article rather than emitting a graph
  // Google will reject.
  const type = post.schema_type === 'HowTo' ? 'Article' : 'BlogPosting';

  const graph: Record<string, unknown>[] = [
    organizationSchema(),
    websiteSchema(),
    breadcrumbSchema(trail),
    {
      '@type': type,
      '@id': `${url}#article`,
      isPartOf: { '@id': WEBSITE_ID },
      headline: truncate(post.meta_title ?? post.title, 110),
      name: post.title,
      description: post.meta_description ?? post.excerpt ?? undefined,
      url,
      mainEntityOfPage: url,
      datePublished: isoDate(post.published_at),
      dateModified: isoDate(post.updated_at || post.published_at),
      inLanguage: 'en',
      wordCount: post.body_text ? post.body_text.split(/\s+/).length : undefined,
      timeRequired: `PT${post.reading_minutes}M`,
      keywords: post.tags.length ? post.tags.join(', ') : undefined,
      articleSection: post.category?.name,
      image: { '@type': 'ImageObject', url: image, caption: post.cover_alt ?? undefined },
      author: { '@type': 'Organization', name: post.author, url: SITE_URL },
      publisher: { '@id': ORGANIZATION_ID },
    },
  ];

  if (post.schema_type === 'FAQPage' && post.faq.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: post.faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

/** The graph for /blog and each category archive. */
export function listingSchema({
  title,
  description,
  path,
  posts,
  trail,
}: {
  title: string;
  description: string;
  path: string;
  posts: PostCard[];
  trail: { name: string; url: string }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organizationSchema(),
      websiteSchema(),
      breadcrumbSchema(trail),
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}${path}#page`,
        url: `${SITE_URL}${path}`,
        name: title,
        description,
        isPartOf: { '@id': WEBSITE_ID },
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: posts.map((post, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${SITE_URL}/blog/${post.slug}`,
            name: post.title,
          })),
        },
      },
    ],
  };
}

/**
 * Renders a graph into the page.
 *
 * JSON.stringify already escapes nothing dangerous for a <script> context
 * except `<`, so the sequence that could close the tag early is neutralised
 * explicitly.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
