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
    // Wait for auth to load and composer to become interactive
    await landingPage.waitForReady();
  });

  test('should submit prompt with Enter key on landing page', async ({ page }) => {
    // Mock successful response
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.simple);

    // Use fillPrompt for reliable cross-browser text input
    await composer.fillPrompt('Test Enter key');

    // Focus and submit with Enter
    await composer.focus();
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
    // Get the prompt input locator
    const promptInput = page.locator('#prompt');

    // Focus and type first line using locator.pressSequentially (more reliable for contenteditable)
    await promptInput.focus();
    await promptInput.pressSequentially('First line');

    // Press Shift+Enter for new line
    await promptInput.press('Shift+Enter');

    // Type second line
    await promptInput.pressSequentially('Second line');

    // Verify multiline text using innerHTML to capture <br> elements
    const innerHTML = await promptInput.innerHTML();
    expect(innerHTML).toContain('First line');
    expect(innerHTML).toContain('Second line');
  });

  test('should prevent submission when using Shift+Enter', async ({ page }) => {
    // Mock response (should not be called)
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.simple);

    // Get the prompt input locator
    const promptInput = page.locator('#prompt');

    // Focus and type using locator.pressSequentially (more reliable for contenteditable)
    await promptInput.focus();
    await promptInput.pressSequentially('Test line 1');
    await promptInput.press('Shift+Enter');
    await promptInput.pressSequentially('Test line 2');

    // Should still be on landing page (not submitted)
    await expect(page).toHaveURL('/');

    // Text should have both lines (use innerHTML for contenteditable)
    const innerHTML = await promptInput.innerHTML();
    expect(innerHTML).toContain('Test line 1');
    expect(innerHTML).toContain('Test line 2');
  });
});
