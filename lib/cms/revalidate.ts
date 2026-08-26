import { revalidatePath } from 'next/cache';

/**
 * Purges the cached blog pages after a write.
 *
 * The public blog is rendered with ISR (`revalidate = 60`), so an edit would
 * surface on its own within a minute. This makes it immediate, which is what
 * an editor expects after pressing Save -- and it is what makes "publish, then
 * paste the URL into Search Console" work straight away.
 *
 * Slugs are passed in because a rename has to purge both the new URL and the
 * one that just stopped existing.
 */
export async function revalidateBlog(...slugs: (string | null | undefined)[]) {
  revalidatePath('/blog');
  revalidatePath('/blog/category/[slug]', 'page');
  revalidatePath('/sitemap.xml');
  revalidatePath('/blog/rss.xml');

  for (const slug of new Set(slugs.filter(Boolean) as string[])) {
    revalidatePath(`/blog/${slug}`);
  }
}
