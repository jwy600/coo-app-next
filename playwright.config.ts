import { defineConfig, devices } from '@playwright/test';

const isLive = process.env.TEST_MODE === 'live';

/**
 * Playwright configuration for E2E tests.
 *
 * TEST_MODE=live: Uses real OpenAI API, runs sequentially, single browser
 * Default: Uses mocked api.openai.com responses, runs in parallel, all browsers
 *
 * Auth is gone — the app is browser-only with no login. Tests seed
 * `settings.apiKey` into localStorage via a shared fixture (see
 * e2e/utils/test-fixtures.ts) so the composer enables immediately.
 */
export default defineConfig({
  testDir: isLive ? './e2e/live' : './e2e/mock',

  outputDir: isLive
    ? '.artifacts/test-results-integration'
    : '.artifacts/test-results',

  /* Run tests in parallel for mock, sequential for live (avoid rate limits) */
  fullyParallel: !isLive,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only, never for live tests (expensive) */
  retries: isLive ? 0 : (process.env.CI ? 2 : 0),

  /* Sequential for live tests, configurable for mock */
  workers: isLive ? 1 : (process.env.CI ? 1 : undefined),

  /* Higher timeout for live tests (real API calls) */
  timeout: isLive ? 60 * 1000 : 30 * 1000,

  reporter: [
    ['html', {
      outputFolder: isLive
        ? '.artifacts/playwright-report-integration'
        : '.artifacts/playwright-report'
    }],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: isLive
    ? [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
      ]
    : [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
      ],

  /* Run your local dev server before starting the tests */
  /* CI uses `npm start` (production server) since the app is pre-built; local uses `npm run dev` */
  webServer: {
    command: process.env.CI ? 'npm start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: isLive
      ? {
          NEXT_PUBLIC_TEST_MODE: 'false',
        }
      : {
          NEXT_PUBLIC_TEST_MODE: 'true',
        },
  },
});
