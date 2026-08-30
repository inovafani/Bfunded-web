import type { Metadata } from 'next';
import RawPage from '@/components/RawPage';
import { loadContent } from '@/lib/content';
import { SITE_URL } from '@/lib/site';

const TITLE = 'BFunded | Fundraising Infrastructure for Startups';
const DESCRIPTION =
  'BFunded helps startups raise capital with investor targeting, automated outreach, high-converting raise pages and end-to-end fundraising infrastructure.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'BFunded',
    url: '/',
    title: 'BFunded',
    description: 'A new kind of capital company.',
    // The hero video's own poster frame, self-hosted rather than linked from
    // Webflow's CDN: that URL is percent-encoded (%2F, %20), which some social
    // crawlers mishandle. 1280x720 -- above every platform's minimum, though
    // slightly taller than the 1.91:1 they crop to.
    images: [
      {
        url: '/video/hero-poster.jpg',
        width: 1280,
        height: 720,
        type: 'image/jpeg',
        alt: 'BFunded',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/video/hero-poster.jpg'],
  },
  icons: {
    icon: 'https://cdn.prod.website-files.com/68906c2eb26f26166bc996df/68b7dedd84d39c8594c2e97d_bfufavicon.svg',
    apple:
      'https://cdn.prod.website-files.com/68906c2eb26f26166bc996df/68a1b6241a82e0deeae4cfae_webclip.png',
  },
};

export default function HomePage() {
  const html = loadContent('home');
  // Optional Google Apps Script endpoint. The waitlist form reads this meta tag
  // and mirrors each submission to a Google Sheet (which also emails the team).
  // Unset = the form still works; it just skips the mirror.
  const sheetsEndpoint = process.env.NEXT_PUBLIC_SHEETS_ENDPOINT;

  // Google reads the site name shown under search results from WebSite
  // structured data on the homepage. Without it, it falls back to whatever it
  // inferred before -- which is why results were still labelled "Webflow".
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: 'BFunded',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'BFunded',
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/video/hero-poster.jpg`,
        description: DESCRIPTION,
        sameAs: [
          'https://www.linkedin.com/company/bfunded/',
          'https://www.instagram.com/bfunded.io/',
          'https://x.com/BfundedOfficial',
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {sheetsEndpoint ? (
        <meta name="bf-sheets-endpoint" content={sheetsEndpoint} />
      ) : null}
      {/* The redesign is self-contained: its own <style> block ships inside the
          markup, so the only thing needed here is the font it was drawn with.
          Webflow's stylesheet and Font Awesome are gone with the old design. */}
      <link rel="icon" href="https://cdn.prod.website-files.com/68906c2eb26f26166bc996df/68b7dedd84d39c8594c2e97d_bfufavicon.svg" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700&family=Manrope:wght@200;300;400;500;600&display=swap"
        precedence="default"
      />
      <RawPage html={html} />
    </>
  );
}
