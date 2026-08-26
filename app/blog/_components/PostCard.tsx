import { formatDate } from '@/lib/cms/format';
import type { PostCard as PostCardType } from '@/lib/cms/types';

/**
 * One article in a grid. `feature` renders the newest post as a two-column
 * band at the top of the index.
 */
export default function PostCard({
  post,
  feature = false,
  headingLevel = 'h3',
}: {
  post: PostCardType;
  feature?: boolean;
  headingLevel?: 'h2' | 'h3';
}) {
  const Heading = headingLevel;

  const media = post.cover_url ? (
    <div className="bfb-card-media">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={post.cover_url}
        alt={post.cover_alt ?? ''}
        loading={feature ? 'eager' : 'lazy'}
        // The feature image is the LCP element on /blog; everything else waits.
        fetchPriority={feature ? 'high' : 'auto'}
      />
    </div>
  ) : null;

  const text = (
    <div>
      {post.category ? <span className="bfb-cat">{post.category.name}</span> : null}
      <Heading>{post.title}</Heading>
      {post.excerpt ? <p>{post.excerpt}</p> : null}
      <div className="bfb-meta">
        <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
        <span className="bfb-dot">{post.reading_minutes} min read</span>
      </div>
    </div>
  );

  return (
    <a className={feature ? 'bfb-card bfb-feature' : 'bfb-card'} href={`/blog/${post.slug}`}>
      {media}
      {text}
    </a>
  );
}
