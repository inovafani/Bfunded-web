import { JsonLd, listingSchema } from '@/lib/cms/schema';
import type { Category, PostCard as PostCardType } from '@/lib/cms/types';
import PostCard from './PostCard';

/**
 * The listing body, shared by /blog, /blog/page/N and every category archive
 * so the three never drift apart.
 */
export default function BlogIndex({
  eyebrow,
  heading,
  lede,
  path,
  metaDescription,
  posts,
  categories,
  activeCategory,
  page,
  totalPages,
  pageBase,
  trail,
}: {
  eyebrow: string;
  heading: string;
  lede: string;
  path: string;
  metaDescription: string;
  posts: PostCardType[];
  categories: Category[];
  activeCategory?: string;
  page: number;
  totalPages: number;
  /** '/blog' or '/blog/category/<slug>' -- pagination hangs off this. */
  pageBase: string;
  trail: { name: string; url: string }[];
}) {
  // Only the first page of the main index gets a feature band; on page two a
  // hero-sized card would just be the 13th newest post pretending to matter.
  const featured = page === 1 && !activeCategory ? posts[0] : undefined;
  const rest = featured ? posts.slice(1) : posts;

  return (
    <>
      <JsonLd
        data={listingSchema({
          title: heading,
          description: metaDescription,
          path,
          posts,
          trail,
        })}
      />

      <header className="bfb-head">
        <div className="bfb-wrap">
          {trail.length > 2 ? (
            <nav className="bfb-crumbs" aria-label="Breadcrumb" style={{ marginBottom: 22 }}>
              {trail.slice(0, -1).map((crumb) => (
                <span key={crumb.url}>
                  <a href={crumb.url}>{crumb.name}</a> <span aria-hidden="true">/</span>
                </span>
              ))}
              <span>{trail[trail.length - 1].name}</span>
            </nav>
          ) : null}

          <p className="bfb-eyebrow">{eyebrow}</p>
          <h1>{heading}</h1>
          <p className="lede">{lede}</p>

          {categories.length > 0 ? (
            <nav className="bfb-rail" aria-label="Article categories">
              <a href="/blog" aria-current={activeCategory ? undefined : 'page'}>
                All
              </a>
              {categories.map((category) => (
                <a
                  key={category.id}
                  href={`/blog/category/${category.slug}`}
                  aria-current={activeCategory === category.slug ? 'page' : undefined}
                >
                  {category.name}
                </a>
              ))}
            </nav>
          ) : null}
        </div>
      </header>

      <section className="bfb-section">
        <div className="bfb-wrap">
          {posts.length === 0 ? (
            <div className="bfb-empty">
              <h2>Nothing here yet</h2>
              <p>The first articles are being written. Check back shortly.</p>
            </div>
          ) : (
            <>
              {featured ? <PostCard post={featured} feature headingLevel="h2" /> : null}

              {rest.length > 0 ? (
                <div className="bfb-grid">
                  {rest.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : null}

              {totalPages > 1 ? (
                <nav className="bfb-pager" aria-label="Pagination">
                  {page > 1 ? (
                    <a href={page === 2 ? pageBase : `${pageBase}/page/${page - 1}`} rel="prev">
                      ← Newer
                    </a>
                  ) : (
                    <span>← Newer</span>
                  )}
                  <span aria-current="page" style={{ opacity: 1 }}>
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages ? (
                    <a href={`${pageBase}/page/${page + 1}`} rel="next">
                      Older →
                    </a>
                  ) : (
                    <span>Older →</span>
                  )}
                </nav>
              ) : null}
            </>
          )}
        </div>
      </section>
    </>
  );
}
