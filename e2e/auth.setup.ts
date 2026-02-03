/**
 * Playwright Auth Setup
 * Logs in once and saves auth state for reuse in live tests
 */

import { test as setup, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '../.artifacts/auth-state.json');

setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || 'test@example.com';
  const password = process.env.TEST_USER_PASSWORD || 'testpassword123';

  // Go to login page
  await page.goto('/auth/login');

  // Fill in credentials
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);

  // Click sign in button
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for successful login - should redirect to home
  await expect(page).toHaveURL('/');

  // Wait for auth state to settle
  await expect(page.getByRole('button', { name: /new chat/i })).toBeVisible();

  // Save auth state for reuse
  await page.context().storageState({ path: authFile });
});
