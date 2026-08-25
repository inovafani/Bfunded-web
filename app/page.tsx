import type { Metadata } from 'next';
import RawPage from '@/components/RawPage';
import html from './_content/home.json';

const TITLE = 'BFunded | The Operating System for the Early-Stage Raise';
const DESCRIPTION =
  'DocSend tracks a deck. A CRM tracks emails. BFunded runs the raise itself: a 1M+ investor network, warm-path matching, automated outreach, and the signal to close.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'BFunded',
    url: '/',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
  icons: {
    icon: 'https://cdn.prod.website-files.com/68906c2eb26f26166bc996df/68b7dedd84d39c8594c2e97d_bfufavicon.svg',
    apple:
      'https://cdn.prod.website-files.com/68906c2eb26f26166bc996df/68a1b6241a82e0deeae4cfae_webclip.png',
  },
};

export default function HomePage() {
  return (
    <>
      {/* Same stylesheet order as the original head: Webflow's sheet, then
          Font Awesome. The page's own <style> blocks ride along in the markup
          and therefore still win the cascade. */}
      <link rel="preconnect" href="https://cdn.prod.website-files.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href="/css/webflow-shared.css" precedence="default" />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        precedence="default"
      />
      <RawPage html={html} bodyClass="body-24" />
    </>
  );
}
