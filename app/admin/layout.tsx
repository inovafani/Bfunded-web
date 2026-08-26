import type { Metadata } from 'next';
import './admin.css';

export const metadata: Metadata = {
  title: 'BFunded CMS',
  // The CMS must never be indexed. The X-Robots-Tag in netlify.toml covers the
  // same ground at the edge; this covers it for anything that renders the page.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Shell for every /admin route.
 *
 * The root layout is deliberately bare (each marketing route ships its own
 * stylesheet), so the admin brings its own reset, fonts and palette, all
 * scoped under `.bfa` so nothing escapes into the public pages.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700&family=Inter:wght@400;500;600;700&display=swap"
        precedence="default"
      />
      <div className="bfa">{children}</div>
    </>
  );
}
