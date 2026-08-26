import './blog.css';

/**
 * Shell for the public blog.
 *
 * The nav and footer are rebuilt here rather than pulled from the captured
 * marketing HTML: those pages hard-code section anchors that only exist on
 * themselves. The markup and tokens match /about closely enough that moving
 * between them reads as one site.
 */
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700&family=Inter:wght@400;500;600&display=swap"
        precedence="default"
      />
      <link rel="alternate" type="application/rss+xml" title="BFunded blog" href="/blog/rss.xml" />

      <div className="bfb">
        <nav className="bfb-nav">
          <div className="bfb-nav-in">
            <a href="/" aria-label="BFunded home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/home/logo-white.svg" alt="BFunded" />
            </a>
            <div className="bfb-nav-r">
              <a href="/" className="l">
                Home
              </a>
              <a href="/engine" className="l">
                Engine
              </a>
              <a href="/about" className="l">
                About
              </a>
              <a href="/blog" className="l" aria-current="page">
                Blog
              </a>
              <a href="mailto:hello@bfunded.io" className="bfb-nav-cta">
                Get In Touch
              </a>
            </div>
          </div>
        </nav>

        {children}

        <footer className="bfb-footer">
          <div className="bfb-wrap">
            <p className="disc">
              BFunded is software and data only. We are not a broker-dealer, we never custody funds,
              and we take no transaction-based compensation. Nothing on this page is an offer to
              sell or a solicitation to buy securities.
            </p>
            <div className="bfb-footer-in">
              <span>© {new Date().getFullYear()} BFunded</span>
              <a href="/blog">Blog</a>
              <a href="/about">About</a>
              <a href="/engine">Engine</a>
              <a href="/blog/rss.xml">RSS</a>
              <a href="mailto:hello@bfunded.io">hello@bfunded.io</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
