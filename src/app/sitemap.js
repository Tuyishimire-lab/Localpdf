export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.uselocalpdf.com';
  
  const routes = [
    '',
    '/tools/compress',
    '/tools/jpg-to-pdf',
    '/tools/merge',
    '/tools/organize',
    '/tools/page-numbers',
    '/tools/pdf-to-jpg',
    '/tools/protect',
    '/tools/rotate',
    '/tools/split',
    '/tools/unlock',
    '/tools/watermark',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: route === '' ? 1.0 : 0.8,
  }));
}
