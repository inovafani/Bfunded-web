import type { Metadata } from 'next';
import RawPage from '@/components/RawPage';
import html from '../_content/about.json';

export const metadata: Metadata = {
  title: { absolute: 'About BFunded' },
  description:
    'BFunded scores early-stage founders with automated due diligence and connects the ones who pass to investors who understand their sector.',
  alternates: { canonical: '/about' },
  openGraph: {
    type: 'website',
    siteName: 'BFunded',
    url: '/about',
    title: 'About BFunded',
    description: 'We score founders, not pitch decks.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About BFunded',
    description: 'We score founders, not pitch decks.',
  },
};

export default function AboutPage() {
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
