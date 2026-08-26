import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SITE_URL } from '@/lib/site';
import { getPostBySlug, getPublishedIndex, getRelatedPosts } from '@/lib/cms/queries';
import { formatDate, truncate, withHeadingAnchors } from '@/lib/cms/format';
import { JsonLd, articleSchema } from '@/lib/cms/schema';
import PostCard from '../_components/PostCard';

export const revalidate = 3600;
// A slug that is not in generateStaticParams yet -- a post published since the
// last build -- is rendered on demand and then cached, rather than 404ing.
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await getPublishedIndex();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPostBySlug((await params).slug);
  if (!post) return { title: 'Article not found' };

  const title = post.meta_title?.trim() || post.title;
  const description =
    post.meta_description?.trim() || post.excerpt?.trim() || truncate(post.body_text, 155);
  const url = `${SITE_URL}/blog/${post.slug}`;
  const image = post.og_url?.trim() || post.cover_url || `${SITE_URL}/og-card.jpg`;

  return {
    title: { absolute: `${title} | BFunded` },
    description,
    authors: [{ name: post.author }],
    keywords: post.tags.length ? post.tags : undefined,
    alternates: { canonical: post.canonical_url?.trim() || `/blog/${post.slug}` },
    robots: post.noindex
      ? { index: false, follow: true }
      : { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    openGraph: {
      type: 'article',
      siteName: 'BFunded',
      url,
      title: post.og_title?.trim() || title,
      description: post.og_description?.trim() || description,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      authors: [post.author],
      section: post.category?.name,
      tags: post.tags,
      images: [{ url: image, width: 1200, height: 630, alt: post.cover_alt ?? post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.og_title?.trim() || title,
      description: post.og_description?.trim() || description,
      images: [image],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const post = await getPostBySlug((await params).slug);
  if (!post) notFound();

  const related = await getRelatedPosts(post);

  // The body is stored as HTML written through the CMS editor, whose schema
  // only produces headings, lists, links, images, quotes and code -- there is
  // no path for a <script> to reach this string. It is rendered directly, the
  // same way the marketing routes render their captured markup.
  const { html, toc } = withHeadingAnchors(post.body_html);

  const showFaq = post.schema_type === 'FAQPage' && post.faq.length > 0;

  return (
    <>
      <JsonLd data={articleSchema(post)} />

      <article className="bfb-wrap">
        <header className="bfb-article-head">
          <nav className="bfb-crumbs" aria-label="Breadcrumb" style={{ marginBottom: 24 }}>
            <a href="/">Home</a>
            <span aria-hidden="true">/</span>
            <a href="/blog">Blog</a>
            {post.category ? (
              <>
                <span aria-hidden="true">/</span>
                <a href={`/blog/category/${post.category.slug}`}>{post.category.name}</a>
              </>
            ) : null}
          </nav>

          {post.category ? (
            <a className="bfb-eyebrow" href={`/blog/category/${post.category.slug}`}>
              {post.category.name}
            </a>
          ) : (
            <p className="bfb-eyebrow">BFunded Journal</p>
          )}

          <h1>{post.title}</h1>

          {post.excerpt ? <p className="standfirst">{post.excerpt}</p> : null}

          <div className="bfb-meta">
            <span>{post.author}</span>
            <time className="bfb-dot" dateTime={post.published_at ?? undefined}>
              {formatDate(post.published_at)}
            </time>
            <span className="bfb-dot">{post.reading_minutes} min read</span>
            {/* Only worth showing when it is a different day -- every save
                bumps updated_at, so a timestamp comparison would label a
                post "updated" seconds after it went live. */}
            {formatDate(post.updated_at) !== formatDate(post.published_at) ? (
              <span className="bfb-dot">Updated {formatDate(post.updated_at)}</span>
            ) : null}
          </div>
        </header>

        {post.cover_url ? (
          <figure className="bfb-hero">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.cover_url}
              alt={post.cover_alt ?? post.title}
              fetchPriority="high"
              width={1200}
              height={675}
            />
            {post.cover_alt ? <figcaption>{post.cover_alt}</figcaption> : null}
          </figure>
        ) : null}

        {toc.length >= 3 ? (
          <nav className="bfb-body" aria-label="On this page" style={{ marginTop: 44 }}>
            <p className="bfb-eyebrow" style={{ marginBottom: 14 }}>
              On this page
            </p>
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              {toc
                .filter((item) => item.level === 2)
                .map((item) => (
                  <li key={item.id} style={{ marginTop: 6 }}>
                    <a href={`#${item.id}`}>{item.text}</a>
                  </li>
                ))}
            </ul>
          </nav>
        ) : null}

        <div className="bfb-body" dangerouslySetInnerHTML={{ __html: html }} />

        {post.tags.length > 0 ? (
          <div className="bfb-tags">
            {post.tags.map((tag) => (
              <span className="bfb-tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {showFaq ? (
          <section className="bfb-faq">
            <h2>Frequently asked</h2>
            {post.faq.map((item, index) => (
              <details key={index} open={index === 0}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </section>
        ) : null}

        <aside className="bfb-cta">
          <h2>Stop tracking the deck. Run the raise.</h2>
          <p>
            BFunded matches your round to a network of over a million investors, works the warm
            paths, and tells you which conversations are actually closing.
          </p>
          <a className="bfb-btn" href="/#waitlist">
            Get early access →
          </a>
        </aside>

        {related.length > 0 ? (
          <section className="bfb-related">
            <h2>Keep reading</h2>
            <div className="bfb-grid">
              {related.map((item) => (
                <PostCard key={item.id} post={item} />
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </>
  );
}
