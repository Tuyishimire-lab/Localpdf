import { getAllPosts } from '../lib/blog';

// Force static generation — sitemap is built once at deploy time, served from CDN cache.
// No edge function is invoked per request.
export const dynamic = 'force-static';

const LAST_MODIFIED = new Date('2026-07-30').toISOString();

export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.uselocalpdf.com';

  const toolRoutes = [
    '/tools/compress',
    '/tools/edit',
    '/tools/jpg-to-pdf',
    '/tools/merge',
    '/tools/ocr',
    '/tools/organize',
    '/tools/page-numbers',
    '/tools/pdf-to-jpg',
    '/tools/protect',
    '/tools/rotate',
    '/tools/sign',
    '/tools/split',
    '/tools/unlock',
    '/tools/watermark',
    '/tools/word-to-pdf',
    // New tools
    '/tools/pdf-to-word',
    '/tools/pdf-to-excel',
    '/tools/flatten',
    '/tools/compare',
    '/tools/repair',
  ];

  const staticRoutes = [
    { route: '', priority: 1.0 },
    { route: '/about', priority: 0.5 },
    { route: '/contact', priority: 0.5 },
    { route: '/privacy', priority: 0.4 },
    { route: '/terms', priority: 0.4 },
    { route: '/blog', priority: 0.9 },
    { route: '/history', priority: 0.3 },
    // Comparison pages
    { route: '/compare', priority: 0.7 },
    { route: '/compare/localpdf-vs-ilovepdf', priority: 0.7 },
    { route: '/compare/localpdf-vs-smallpdf', priority: 0.7 },
    { route: '/compare/localpdf-vs-pdf24', priority: 0.7 },
  ];

  // Blog posts
  let blogPosts = [];
  try {
    const posts = getAllPosts();
    blogPosts = posts.map(p => ({ route: `/blog/${p.slug}`, priority: 0.8 }));
  } catch {
    // Blog posts directory may not exist yet
  }

  const toolEntries = toolRoutes.map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: 'monthly',
    priority: 0.85,
  }));

  const staticEntries = staticRoutes.map(({ route, priority }) => ({
    url: `${baseUrl}${route}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority,
  }));

  const blogEntries = blogPosts.map(({ route, priority }) => ({
    url: `${baseUrl}${route}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: 'monthly',
    priority,
  }));

  return [...staticEntries, ...toolEntries, ...blogEntries];
}
