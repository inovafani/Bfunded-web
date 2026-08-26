import type { Metadata } from 'next';
import RawPage from '@/components/RawPage';
import { loadContent } from '@/lib/content';

const TITLE = 'About BFunded';
const DESCRIPTION =
  'Three founders, 170 fundraising campaigns and one pattern that would not go away. The story of BFunded, and why we score founders instead of pitch decks.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/about' },
  openGraph: {
    type: 'website',
    siteName: 'BFunded',
    url: '/about',
    title: TITLE,
    description: 'We score founders, not pitch decks.',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: 'We score founders, not pitch decks.',
  },
};

export default function AboutPage() {
  const html = loadContent('about');
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700&family=Inter:wght@400;500;600&display=swap"
        precedence="default"
      />
      <RawPage html={html} />
    </>
  );
}
