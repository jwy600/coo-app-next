/**
 * E2E Auth Utilities
 * Helper functions for authenticating in Playwright tests
 */

import { Page, expect } from '@playwright/test';

// Test credentials from environment variables
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

/**
 * Login with test user credentials
 * Navigates to login page, fills form, and waits for redirect
 */
export async function login(page: Page): Promise<void> {
  // Go to login page
  await page.goto('/auth/login');

  // Fill in credentials
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill(TEST_PASSWORD);

  // Click sign in button
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to home page (successful login)
  await expect(page).toHaveURL('/');

  // Wait for auth state to settle (sidebar should show "New chat" not "Login")
  await expect(page.getByRole('button', { name: /new chat/i })).toBeVisible();
}

/**
 * Logout the current user
 * Opens settings sheet and clicks logout
 */
export async function logout(page: Page): Promise<void> {
  // Open settings sheet
  await page.getByRole('button', { name: /settings/i }).click();

  // Click sign out button
  await page.getByRole('button', { name: /sign out/i }).click();

  // Wait for redirect to login page
  await expect(page).toHaveURL('/auth/login');
}

/**
 * Check if user is logged in by looking for "New chat" button
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await expect(page.getByRole('button', { name: /new chat/i })).toBeVisible({ timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure user is logged in before test
 * Logs in if not already authenticated
 */
export async function ensureLoggedIn(page: Page): Promise<void> {
  await page.goto('/');

  // Check if we're redirected to login or see login button
  const loggedIn = await isLoggedIn(page);

  if (!loggedIn) {
    await login(page);
  }
}
