import type { Metadata } from 'next';
import RawPage from '@/components/RawPage';
import { loadContent } from '@/lib/content';

const TITLE = 'BFunded | A New Kind of Capital Company';
const DESCRIPTION =
  'The future of seed funding. 170 raises, $100M+ funded, and a campus plan that begins at Harvard. By introduction.';

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
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
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

  return (
    <>
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
