import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for LocalPDF E2E smoke tests.
 * Auto-starts the Next.js dev server; reuses an existing server in local dev.
 */
export default defineConfig({
  testDir: './playwright',
  // Retry flaky tests once on CI
  retries: process.env.CI ? 1 : 0,
  // Run tests in parallel
  workers: process.env.CI ? 2 : undefined,
  // Reporter
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:3000',
    // Capture screenshots only on failure
    screenshot: 'only-on-failure',
    // Capture trace on first retry
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Auto-start the dev server. Reuse an already-running one in local dev
  // so you don't need to stop/start it every time you run tests.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // reuse if already running locally
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
