import type { Metadata } from 'next';
import RawPage from '@/components/RawPage';
import html from '../_content/engine.json';

const TITLE = 'The BFunded Engine';
const DESCRIPTION =
  'Upload a deck and a website. Get scored in minutes, get a raise page, and reach investors who have backed your sector before. Your score decides how far it reaches.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/engine' },
  openGraph: {
    type: 'website',
    siteName: 'BFunded',
    url: '/engine',
    title: TITLE,
    description: 'Seed and pre-seed fundraising infrastructure.',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: 'Seed and pre-seed fundraising infrastructure.',
  },
};

export default function EnginePage() {
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
