import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'BFunded | The Operating System for the Early-Stage Raise',
    template: '%s | BFunded',
  },
  description:
    'DocSend tracks a deck. A CRM tracks emails. BFunded runs the raise itself: a 1M+ investor network, warm-path matching, automated outreach, and the signal to close.',
  openGraph: { type: 'website', siteName: 'BFunded', url: SITE_URL },
  twitter: { card: 'summary_large_image' },
};

/**
 * Deliberately bare. Each route reproduces one of the original standalone
 * pages verbatim, including its own <style> blocks, fonts, navbar and footer,
 * so the shared shell must not impose a reset, fonts or spacing of its own.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The home page's scripts stamp Webflow's data-wf-* attributes and
    // w-mod-* classes onto <html> before hydration; that is expected, not a bug.
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
