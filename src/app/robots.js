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
