import type { Metadata } from 'next';
import RawPage from '@/components/RawPage';
import html from '../_content/invest.json';

const TITLE = 'Invest in BFunded: The Future of Seed Funding';
const DESCRIPTION =
  'Free due-diligence finds the top 1% of founders. Access by introduction.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: 'Invest in BFunded - access by introduction.',
  // Unlisted on the original too -- this is a private investor page.
  robots: { index: false, follow: false },
  alternates: { canonical: '/invest' },
  openGraph: {
    type: 'website',
    siteName: 'BFunded',
    url: '/invest',
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: '/og-card.jpg',
        width: 1200,
        height: 630,
        type: 'image/jpeg',
        alt: 'A founder on a summit at dawn, captioned $100M+ closed by hand.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-card.jpg'],
  },
};

export default function InvestPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Hanken+Grotesk:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap"
        precedence="default"
      />
      <RawPage html={html} />
    </>
  );
}
