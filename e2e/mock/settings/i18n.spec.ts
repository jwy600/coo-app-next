/**
 * Settings i18n: response language configuration.
 *
 * Verifies that changing responseLanguage in Settings persists
 * and affects the API calls (language hint is injected into the prompt).
 */

import { test, expect } from '../../utils/test-fixtures';
import { resetAllMocks, getMockCalls } from '../../utils/mock-bridge';

test('response language setting affects API calls', async ({
  page,
}) => {
  await resetAllMocks(page);
  await page.goto('/');

  // Open Settings (sidebar > Settings button)
  const settingsButton = page.locator('button:has-text("Settings")');
  await settingsButton.waitFor({ state: 'visible', timeout: 5000 });
  await settingsButton.click();

  // Wait for Settings sheet to open
  const settingsSheet = page.locator('[role="dialog"]');
  await settingsSheet.waitFor({ state: 'visible', timeout: 5000 });

  // Verify the Response Language label and combobox are visible
  const responseLanguageLabel = page.locator('text=Response Language');
  await expect(responseLanguageLabel).toBeVisible();

  // Find the Response Language combobox (first combobox in the dialog)
  const responseLanguageCombo = page.locator('[role="dialog"] [role="combobox"]').first();
  await expect(responseLanguageCombo).toBeVisible();

  // Click to open the dropdown
  await responseLanguageCombo.click();
  await page.waitForTimeout(200);

  // Verify the listbox appears
  const listbox = page.locator('[role="listbox"]').first();
  await expect(listbox).toBeVisible();

  // Find and click the Chinese option
  const chineseOption = page.locator('[role="option"]').filter({ hasText: '中文' }).first();
  await chineseOption.waitFor({ state: 'visible', timeout: 5000 });
  await chineseOption.click();

  // Wait for the selection to close the dropdown
  await page.waitForTimeout(200);

  // Close Settings by pressing Escape
  await page.keyboard.press('Escape');
  await settingsSheet.waitFor({ state: 'hidden', timeout: 5000 });

  // Verify we're back on the main page
  await expect(page.locator('[aria-label="Prompt"]')).toBeVisible();

  // Now submit a chat message via the composer
  const composerInput = page.locator('[aria-label="Prompt"]');
  await composerInput.focus();
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Prompt"]') as HTMLElement;
    el.textContent = 'Hello world';
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
  });
  await page.locator('button:has-text("Send"):not([disabled])').waitFor({ timeout: 5000 });
  await page.locator('button:has-text("Send")').click();

  // Wait for assistant message to appear
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });

  // Inspect mock calls: the instructions should contain the Chinese language hint
  const calls = await getMockCalls(page);
  expect(calls.length).toBeGreaterThan(0);

  // Find the chat call (should be the first one)
  const chatCall = calls.find((c) => c.action === 'chat');
  expect(chatCall).toBeTruthy();
  expect(chatCall?.passage).toContain('Hello world');

  // The language hint should be injected into the instructions.
  // Based on lib/api/chat.ts and lib/config/prompts.ts, the hint format is:
  // <language>Always respond in Chinese.</language>
  expect(chatCall?.instructions).toBeTruthy();
  expect(chatCall?.instructions).toContain('<language>');
  expect(chatCall?.instructions).toContain('Chinese');
});
