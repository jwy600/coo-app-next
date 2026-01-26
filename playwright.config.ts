import { defineConfig, devices } from '@playwright/test';

const isLive = process.env.TEST_MODE === 'live';

/**
 * Playwright configuration for E2E tests.
 *
 * TEST_MODE=live: Uses real OpenAI API, runs sequentially, single browser
 * Default: Uses mocked API, runs in parallel, all browsers
 */
export default defineConfig({
  testDir: isLive ? './e2e/live' : './e2e/mock',

  /* Output directories */
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

  /* Reporter to use */
  reporter: [
    ['html', {
      outputFolder: isLive
        ? '.artifacts/playwright-report-integration'
        : '.artifacts/playwright-report'
    }],
    ['list'],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: isLive
    ? [
        // Only Chromium for live tests to save time/cost
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
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: isLive
      ? {
          // NO test mode - use real Supabase and OpenAI
          NEXT_PUBLIC_TEST_MODE: 'false',
          // Use real API key from environment
          OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        }
      : {
          NEXT_PUBLIC_TEST_MODE: 'true',
          OPENAI_API_KEY: 'test_mock_key',
        },
  },
});
