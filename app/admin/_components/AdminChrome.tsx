import Link from 'next/link';
import { getAdminUser } from '@/lib/supabase/server';
import SignOutButton from './SignOutButton';

/**
 * Header + page frame shared by every signed-in admin screen.
 *
 * It is a component rather than a nested layout because /admin/login lives
 * under the same segment and must render without any of this chrome.
 */
export default async function AdminChrome({
  current,
  children,
}: {
  current: 'posts' | 'categories';
  children: React.ReactNode;
}) {
  const user = await getAdminUser();

  return (
    <>
      <header className="bfa-top">
        <div className="bfa-top-in">
          <Link href="/admin" className="bfa-brand">
            BFunded <span>CMS</span>
          </Link>

          <nav className="bfa-nav">
            <Link href="/admin" aria-current={current === 'posts' ? 'page' : undefined}>
              Articles
            </Link>
            <Link
              href="/admin/categories"
              aria-current={current === 'categories' ? 'page' : undefined}
            >
              Categories
            </Link>
          </nav>

          <div className="bfa-top-right">
            <a href="/blog" target="_blank" rel="noreferrer">
              View blog ↗
            </a>
            {user?.email ? <span>{user.email}</span> : null}
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="bfa-main">{children}</main>
    </>
  );
}
