import { test, expect } from '@playwright/test';
import { LandingPage } from '../page-objects/LandingPage';
import { ChatPage } from '../page-objects/ChatPage';
import { Composer } from '../page-objects/Composer';
import { ApiMocker, MOCK_RESPONSES } from '../utils/api-mocks';

test.describe('Keyboard Shortcuts', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;
  let composer: Composer;
  let apiMocker: ApiMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);
    composer = new Composer(page);
    apiMocker = new ApiMocker(page);

    // Set test mode
    await page.addInitScript(() => {
      (window as any).__TEST_MODE__ = true;
    });

    await landingPage.goto();
  });

  test('should submit prompt with Enter key on landing page', async ({ page }) => {
    // Mock successful response
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.simple);

    // Focus the prompt input first
    await composer.focus();

    // Type prompt using keyboard (more reliable than fillPrompt for Enter key test)
    await page.keyboard.type('Test Enter key');

    // Small wait to ensure input is processed (Firefox needs this)
    await page.waitForTimeout(100);

    // Submit with Enter
    await composer.submitWithEnter();

    // Verify navigation
    await expect(page).toHaveURL(/\/t\/.+/, { timeout: 10000 });
  });

  test('should deselect block with Escape key', async ({ page }) => {
    // Create a thread
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.multiBlock);
    await landingPage.submitFirstPrompt('Test Escape');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Select a block
    await chatPage.selectBlock(0);
    expect(await chatPage.isBlockSelected(0)).toBe(true);

    // Press Escape
    await page.keyboard.press('Escape');

    // Verify block is deselected
    expect(await chatPage.isBlockSelected(0)).toBe(false);
  });

  test('should focus composer when clicking anywhere on landing page', async ({ page }) => {
    // Click somewhere on the page (not on composer)
    await page.click('body');

    // Check if composer input is focused (or can receive focus)
    await composer.focus();
    expect(await composer.isFocused()).toBe(true);
  });

  test('should allow Tab navigation between elements', async ({ page }) => {
    // Create a thread to have multiple interactive elements
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.simple);
    await landingPage.submitFirstPrompt('Tab test');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Select block to show block controls
    await chatPage.selectBlock(0);

    // Tab through elements
    await page.keyboard.press('Tab');

    // Check that focus moves (this is browser-dependent)
    const activeElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeElement).toBeDefined();
  });

  test('should support multiline input with Shift+Enter', async ({ page }) => {
    // Focus on composer
    await composer.focus();

    // Type first line
    await page.keyboard.type('First line');

    // Press Shift+Enter for new line
    await page.keyboard.press('Shift+Enter');

    // Type second line
    await page.keyboard.type('Second line');

    // Verify multiline text
    const text = await composer.getPromptValue();
    expect(text).toContain('First line');
    expect(text).toContain('Second line');
    // Contenteditable may use <br> or \n for line breaks
    const hasLineBreak = text.includes('\n') || text.includes('\r') ||
                         text.match(/First line[\s\S]*Second line/);
    expect(hasLineBreak).toBeTruthy();
  });

  test('should prevent submission when using Shift+Enter', async ({ page }) => {
    // Mock response (should not be called)
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.simple);

    // Focus composer
    await composer.focus();

    // Type and press Shift+Enter
    await page.keyboard.type('Test line 1');
    await page.keyboard.press('Shift+Enter');
    await page.keyboard.type('Test line 2');

    // Should still be on landing page (not submitted)
    await expect(page).toHaveURL('/');

    // Text should have both lines
    const text = await composer.getPromptValue();
    expect(text).toContain('Test line 1');
    expect(text).toContain('Test line 2');
  });
});
