/**
 * Homepage – Server Component
 *
 * This page is intentionally NOT 'use client'. By keeping it as a server
 * component, both the SoftwareApplication JSON-LD schema and the
 * HomeEditorialSection (Why LocalPDF, How It Works, FAQ) are present in
 * the initial HTML response that Googlebot receives on first crawl.
 *
 * Interactive behaviour (drag-drop, tool grid, modals) lives in HomePageClient.
 */

// Statically generated at build time — zero edge function invocations per visit.
export const dynamic = 'force-static';

import HomePageClient from './components/HomePageClient';
import HomeEditorialSection from './components/HomeEditorialSection';

export const metadata = {
  title: 'LocalPDF | Free Online PDF Tools – 100% Private, Client-Side',
  description: 'Merge, split, compress, convert, sign, OCR, watermark, and protect PDFs entirely in your browser. No file uploads, no account needed, completely free.',
  alternates: {
    canonical: 'https://www.uselocalpdf.com',
  },
  openGraph: {
    title: 'LocalPDF | Free Online PDF Tools – 100% Private, Client-Side',
    description: 'Merge, split, compress, convert, sign, OCR, watermark, and protect PDFs entirely in your browser. No file uploads, no account needed, completely free.',
    url: 'https://www.uselocalpdf.com',
    siteName: 'LocalPDF',
    images: [
      {
        url: 'https://www.uselocalpdf.com/logo.png',
        width: 800,
        height: 800,
        alt: 'LocalPDF – Free Client-Side PDF Tools',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'LocalPDF | Free Online PDF Tools – 100% Private, Client-Side',
    description: 'Merge, split, compress, convert, sign, OCR, watermark, and protect PDFs entirely in your browser. No file uploads, no account needed.',
    images: ['https://www.uselocalpdf.com/logo.png'],
  },
};

export default function Home() {
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': 'LocalPDF',
    'operatingSystem': 'All',
    'applicationCategory': 'UtilitiesApplication',
    'description': 'Free and secure client-side PDF tools operating 100% in your browser. No files uploaded to servers.',
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'USD',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <HomePageClient />
      <HomeEditorialSection />
    </>
  );
}
