/**
 * @jest-environment node
 */

import fs from 'node:fs';
import path from 'node:path';
import robots from '../../src/app/robots';
import sitemap from '../../src/app/sitemap';
import { buildPageMetadata, SITE_URL } from '../../src/lib/seo';
import toolContent from '../../src/app/data/toolContent';

const ROOT = path.resolve(__dirname, '../..');

describe('Milestone 6 SEO, metadata & content alignment', () => {
  test('robots() allows / and disallows /api/ without blocking /_next/', () => {
    const config = robots();
    expect(config.rules.allow).toBe('/');
    expect(config.rules.disallow).toEqual(['/api/']);
    expect(config.rules.disallow).not.toContain('/_next/');
    expect(config.sitemap).toMatch(/\/sitemap\.xml$/);
  });

  test('sitemap() excludes /history and includes /recipes, /compare, /security, and all 29 tools', () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.endsWith('/history'))).toBe(false);
    expect(urls.some((u) => u.endsWith('/recipes'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/security'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/compare'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/compare/localpdf-vs-ilovepdf'))).toBe(true);
    const toolUrls = urls.filter((u) => u.includes('/tools/'));
    expect(toolUrls).toHaveLength(29);
  });

  test('indexnow.mjs excludes /history', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts', 'indexnow.mjs'), 'utf8');
    expect(src).not.toContain('/history');
  });

  test('public/og-image.png exists with exact 1200x630 PNG dimensions', () => {
    const ogPath = path.join(ROOT, 'public', 'og-image.png');
    expect(fs.existsSync(ogPath)).toBe(true);
    const buf = fs.readFileSync(ogPath);
    expect(buf.readUInt32BE(16)).toBe(1200);
    expect(buf.readUInt32BE(20)).toBe(630);
  });

  test('buildPageMetadata constructs canonical, 1200x630 OpenGraph, and summary_large_image Twitter tags', () => {
    const meta = buildPageMetadata({
      title: 'Test Page | LocalPDF',
      description: 'Test description',
      path: '/compare',
    });
    expect(meta.alternates.canonical).toBe(`${SITE_URL}/compare`);
    expect(meta.openGraph.url).toBe(`${SITE_URL}/compare`);
    expect(meta.openGraph.images[0]).toMatchObject({
      url: '/og-image.png',
      width: 1200,
      height: 630,
    });
    expect(meta.twitter.card).toBe('summary_large_image');
    expect(meta.twitter.images).toEqual(['/og-image.png']);
  });

  test('toolContent reflects AES-256 QPDF WASM and includes all 8 Milestone 8 tools', () => {
    expect(toolContent.protect.description).toContain('256-bit AES');
    expect(toolContent.protect.description).not.toContain('AES-128');
    expect(toolContent.unlock.description).toContain('QPDF WebAssembly');
    [
      'pdf-to-excel',
      'crop',
      'extract-images',
      'fill-form',
      'metadata',
      'bates-numbering',
      'split-by-size',
      'grayscale',
    ].forEach((slug) => {
      expect(toolContent[slug]).toBeDefined();
      expect(toolContent[slug].title).toBeTruthy();
    });
  });

  test('blog vs-ilovepdf post links to /compare/localpdf-vs-ilovepdf and /security', () => {
    const mdx = fs.readFileSync(
      path.join(ROOT, 'src', 'app', 'blog', 'posts', 'localpdf-vs-ilovepdf-comparison.mdx'),
      'utf8'
    );
    expect(mdx).toContain('/compare/localpdf-vs-ilovepdf');
    expect(mdx).toContain('/security');
  });

  test('public/llms.txt and public/llms-full.txt exist and document all 29 tools, Recipes, and Air-Gapped Mode', () => {
    const llms = fs.readFileSync(path.join(ROOT, 'public', 'llms.txt'), 'utf8');
    const llmsFull = fs.readFileSync(path.join(ROOT, 'public', 'llms-full.txt'), 'utf8');

    expect(llms).toContain('/recipes');
    expect(llms).toContain('Strict Air-Gapped Mode');
    expect(llms).toContain('256-bit AES');
    expect(llmsFull).toContain('256-bit AES');
    expect(llmsFull).toContain('localpdf_airgapped');
    expect(llmsFull).toContain('localpdf_recipes');

    const sitemapToolUrls = sitemap()
      .map((e) => e.url)
      .filter((u) => u.includes('/tools/'));
    for (const url of sitemapToolUrls) {
      expect(llms).toContain(url);
    }
  });

  test('ToolContentSection, blog posts, and /recipes emit rich JSON-LD and internal links', () => {
    const toolContentSectionSrc = fs.readFileSync(
      path.join(ROOT, 'src', 'app', 'components', 'ToolContentSection.js'),
      'utf8'
    );
    expect(toolContentSectionSrc).toContain("'@type': 'SoftwareApplication'");
    expect(toolContentSectionSrc).toContain("'@type': 'BreadcrumbList'");
    expect(toolContentSectionSrc).toContain('Related Client-Side PDF Tools');

    const blogSlugSrc = fs.readFileSync(
      path.join(ROOT, 'src', 'app', 'blog', '[slug]', 'page.js'),
      'utf8'
    );
    expect(blogSlugSrc).toContain('image: `${BASE}/og-image.png`');

    const recipesSrc = fs.readFileSync(
      path.join(ROOT, 'src', 'app', 'recipes', 'page.js'),
      'utf8'
    );
    expect(recipesSrc).toContain("'@type': 'SoftwareApplication'");
    expect(recipesSrc).toContain('https://schema.org/FAQPage');

    const sitemapUrls = sitemap().map((e) => e.url);
    expect(sitemapUrls.some((u) => u.endsWith('/blog/how-to-convert-pdf-to-excel-offline'))).toBe(true);
    expect(sitemapUrls.some((u) => u.endsWith('/blog/how-to-add-bates-numbering-to-pdf-privately'))).toBe(true);
    expect(sitemapUrls.some((u) => u.endsWith('/blog/how-to-remove-metadata-from-pdf'))).toBe(true);
    expect(sitemapUrls.some((u) => u.endsWith('/blog/how-to-automate-pdf-workflows-offline'))).toBe(true);
    expect(sitemapUrls.some((u) => u.endsWith('/blog/how-to-split-large-pdf-by-file-size'))).toBe(true);
  });
});

