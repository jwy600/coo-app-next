/**
 * Phase 7: API key banner and composer disabled state.
 *
 * Verifies:
 * 1. When no API key is set, the banner is visible and composer is disabled.
 * 2. When API key is set, the banner is hidden and composer is enabled.
 */

import { test, expect } from '../utils/test-fixtures';
import { Page } from '@playwright/test';

async function seedWithoutApiKey(page: Page) {
  await page.addInitScript(
    ({ storageKey }) => {
      const payload = {
        state: {
          threads: [],
          activeThreadId: null,
          settings: {
            apiKey: '',
            model: 'gpt-4',
            reasoningEffort: 'none',
            webSearchEnabled: false,
            responseLanguage: 'en',
            translateLanguage: 'Spanish',
            exportDestination: 'local',
            obsidianVaultName: '',
          },
          mode: 'landing',
          isAwaitingResponse: false,
          error: null,
          focus: null,
          composerPrompt: '',
        },
        version: 3,
      };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    },
    { storageKey: 'coo-test-storage' },
  );
}

test('No API key → banner visible, composer disabled', async ({ page }) => {
  await seedWithoutApiKey(page);
  await page.goto('/');

  // Banner should be visible when no API key is set
  const banner = page.locator('text=Add your OpenAI API key in');
  await expect(banner).toBeVisible();

  // Composer input should have contentEditable=false (disabled state)
  const composerInput = page.locator('[aria-label="Prompt"]');
  const isContentEditable = await composerInput.getAttribute('contenteditable');
  expect(isContentEditable).toBe('false');

  // Send button should be disabled
  const sendButton = page.locator('button:has-text("Send")');
  await expect(sendButton).toBeDisabled();
});

test('API key set → banner hidden, composer enabled', async ({ page }) => {
  await page.goto('/');

  // Banner should NOT be visible when API key is set (default seed)
  const banner = page.locator('text=Add your OpenAI API key in');
  await expect(banner).not.toBeVisible();

  // Composer input should have contentEditable=true (enabled)
  const composerInput = page.locator('[aria-label="Prompt"]');
  const isContentEditable = await composerInput.getAttribute('contenteditable');
  expect(isContentEditable).toBe('true');

  // Type something to enable Send button
  await composerInput.focus();
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Prompt"]') as HTMLElement;
    el.textContent = 'Hello';
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
  });

  // Send button should become enabled after typing
  const sendButton = page.locator('button:has-text("Send"):not([disabled])');
  await expect(sendButton).toBeVisible();
});
