/**
 * seo.js – Shared canonical, OpenGraph (1200x630), and Twitter summary_large_image metadata builder.
 */

export const SITE_URL = 'https://www.uselocalpdf.com';

export const DEFAULT_OG_IMAGE = {
  url: '/og-image.png',
  width: 1200,
  height: 630,
  alt: 'LocalPDF — Free Client-Side PDF Tools',
};

export function buildPageMetadata({
  title,
  description,
  path = '/',
  ogAlt,
  type = 'website',
  keywords,
  extra = {},
}) {
  const normalizedPath = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  const canonical = `${SITE_URL}${normalizedPath}`;

  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'LocalPDF',
      images: [{ ...DEFAULT_OG_IMAGE, alt: ogAlt || title }],
      locale: 'en_US',
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
    ...extra,
  };
}

