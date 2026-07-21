export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.uselocalpdf.com';
  
  const routes = [
    '',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
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

  return routes.map((route) => {
    let priority = 0.8;
    if (route === '') {
      priority = 1.0;
    } else if (['/about', '/contact', '/privacy', '/terms'].includes(route)) {
      priority = 0.5;
    }

    return {
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: priority,
    };
  });
}
