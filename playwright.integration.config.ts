import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for integration tests with REAL OpenAI API calls.
 *
 * Key differences from regular config:
 * - Tests run sequentially (workers: 1) to avoid rate limits
 * - No test mode (NEXT_PUBLIC_TEST_MODE: false) - uses real Supabase
 * - Uses real OPENAI_API_KEY from environment
 * - Higher timeout (60s) for real API calls
 * - Separate test directory and output directories
 */
export default defineConfig({
  testDir: './e2e/tests-integration',

  /* Run tests sequentially to avoid rate limits */
  fullyParallel: false,

  /* Don't run on CI by default (requires real API keys) */
  forbidOnly: !!process.env.CI,

  /* No retries for integration tests (real API calls are expensive) */
  retries: 0,

  /* Always run sequentially (1 worker) */
  workers: 1,

  /* 60 second timeout for real API calls */
  timeout: 60 * 1000,

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report-integration' }],
    ['list'],
  ],

  /* Output directory for test artifacts */
  outputDir: 'test-results-integration',

  /* Shared settings */
  use: {
    /* Base URL */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects - only Chromium for integration tests to save time */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run local dev server with REAL API configuration */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      // NO test mode - use real Supabase and OpenAI
      NEXT_PUBLIC_TEST_MODE: 'false',
      // Use real API key from environment (will fail if not set)
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    },
  },
});
