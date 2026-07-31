// Statically generated at build time — no edge function invoked per request
export const dynamic = 'force-static';

export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.uselocalpdf.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/_next/', '/static/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
