/**
 * Playwright Auth Setup
 *
 * Runs once before all test projects that depend on it.
 * Handles two scenarios:
 *
 * 1. CI / test-mode server: NEXT_PUBLIC_TEST_MODE=true is baked into the build,
 *    so useAuth() returns a fake user immediately. No login needed.
 *
 * 2. Local dev server reuse: The running dev server was started without
 *    NEXT_PUBLIC_TEST_MODE, so real Supabase auth is active.
 *    We log in with hardcoded test credentials to get a real session.
 *
 * In both cases, auth state (cookies + storage) is saved to a JSON file
 * and shared with every test project via Playwright's storageState.
 */

import { test as setup, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '../.artifacts/auth-state.json');

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'testpassword123';

setup('authenticate', async ({ page }) => {
  // Navigate to home and check if auth is already satisfied (test mode)
  await page.goto('/');

  // The submit button is disabled when not authenticated.
  // Wait briefly — in test mode this resolves instantly.
  const submitButton = page.locator('button[type="submit"]');
  const isReady = await submitButton
    .isEnabled({ timeout: 3000 })
    .catch(() => false);

  if (!isReady) {
    // Dev server doesn't have test mode — log in with real credentials
    await page.goto('/auth/login');

    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for redirect to home after successful login
    await expect(page).toHaveURL('/', { timeout: 10000 });
  }

  // Verify the app is usable (submit button enabled = authenticated)
  await expect(submitButton).toBeEnabled({ timeout: 5000 });

  // Save auth state for reuse by all test projects
  await page.context().storageState({ path: authFile });
});
