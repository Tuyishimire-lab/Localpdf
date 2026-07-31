import { test, expect } from '@playwright/test';

/**
 * LocalPDF E2E Smoke Tests
 *
 * These tests verify that key pages load correctly and critical UI elements
 * are present. They are smoke tests — not deep functional tests — because
 * the PDF tools themselves rely on browser APIs (Canvas, WebWorkers) that
 * are best verified through real user interaction.
 *
 * Playwright auto-starts the dev server via playwright.config.ts webServer.
 */

// ── Homepage ────────────────────────────────────────────────────────────────
test.describe('Homepage', () => {
  test('loads and shows the page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LocalPDF/i);
  });

  test('shows the tool grid with at least 10 tools', async ({ page }) => {
    await page.goto('/');
    // The homepage renders a grid of tool cards
    const toolCards = page.locator('[class*="tool-card"], [class*="tool-grid"] a, [class*="tool-grid"] [role="link"]');
    await expect(toolCards.first()).toBeVisible({ timeout: 10_000 });
    const count = await toolCards.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });
});

// ── Tool Pages ──────────────────────────────────────────────────────────────
const tools = [
  { name: 'Compress', path: '/tools/compress' },
  { name: 'Merge', path: '/tools/merge' },
  { name: 'Split', path: '/tools/split' },
  { name: 'Sign', path: '/tools/sign' },
  { name: 'Watermark', path: '/tools/watermark' },
  { name: 'OCR', path: '/tools/ocr' },
  { name: 'Protect', path: '/tools/protect' },
  { name: 'Rotate', path: '/tools/rotate' },
  { name: 'Organize', path: '/tools/organize' },
  { name: 'Repair', path: '/tools/repair' },
];

for (const tool of tools) {
  test(`${tool.name} tool page loads and shows upload area`, async ({ page }) => {
    await page.goto(tool.path);
    // Every tool page should have an h1 heading
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible({ timeout: 10_000 });
    // Every tool page should have a file drop zone or upload trigger
    const uploadArea = page.locator('[class*="upload"], [class*="drop"], input[type="file"]').first();
    await expect(uploadArea).toBeAttached({ timeout: 10_000 });
  });
}

// ── Blog ────────────────────────────────────────────────────────────────────
test.describe('Blog', () => {
  test('blog index page loads and lists articles', async ({ page }) => {
    await page.goto('/blog');
    await expect(page).toHaveTitle(/blog/i);
    // Should show article cards
    const cards = page.locator('[class*="blog-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('individual blog post loads with content', async ({ page }) => {
    await page.goto('/blog/how-to-merge-pdf-files');
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible({ timeout: 10_000 });
    // Article body should have at least some text
    const article = page.locator('article');
    await expect(article).toBeVisible();
    const text = await article.textContent();
    expect(text?.length).toBeGreaterThan(200);
  });

  test('blog post "Back to Articles" link works', async ({ page }) => {
    await page.goto('/blog/how-to-merge-pdf-files');
    const backLink = page.locator('a', { hasText: /all articles/i });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/\/blog$/);
  });
});

// ── Static Pages ────────────────────────────────────────────────────────────
const staticPages = [
  { name: 'About', path: '/about', titleMatch: /about/i },
  { name: 'Contact', path: '/contact', titleMatch: /contact/i },
  { name: 'Privacy', path: '/privacy', titleMatch: /privacy/i },
  { name: 'Terms', path: '/terms', titleMatch: /terms/i },
];

for (const pg of staticPages) {
  test(`${pg.name} page loads with an h1`, async ({ page }) => {
    await page.goto(pg.path);
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible({ timeout: 10_000 });
  });
}

// ── Contact Form ────────────────────────────────────────────────────────────
test.describe('Contact form', () => {
  test('renders all required fields', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#message, textarea[name="message"]')).toBeVisible();
  });

  test('submit button is present', async ({ page }) => {
    await page.goto('/contact');
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
  });
});

// ── 404 Handling ────────────────────────────────────────────────────────────
test('returns a visible error page for nonexistent routes', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist-at-all');
  // Next.js returns 404 for unknown static routes
  expect(response?.status()).toBe(404);
});

// ── Mobile Responsiveness ───────────────────────────────────────────────────
test.describe('Mobile layout', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 size

  test('homepage renders without horizontal scroll on mobile', async ({ page }) => {
    await page.goto('/');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    // Allow a tiny tolerance (1px)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('nav menu is accessible on mobile', async ({ page }) => {
    await page.goto('/');
    // Hamburger button should be visible on mobile
    const hamburger = page.locator('[class*="hamburger"], [aria-label*="menu"], button[class*="mobile"]').first();
    await expect(hamburger).toBeVisible({ timeout: 5_000 });
  });
});
