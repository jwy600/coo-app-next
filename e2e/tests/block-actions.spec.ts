import { test, expect } from '@playwright/test';
import { LandingPage } from '../page-objects/LandingPage';
import { ChatPage } from '../page-objects/ChatPage';
import { ApiMocker, MOCK_RESPONSES } from '../utils/api-mocks';

test.describe('Block Actions', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;
  let apiMocker: ApiMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);
    apiMocker = new ApiMocker(page);

    // Set test mode
    await page.addInitScript(() => {
      (window as any).__TEST_MODE__ = true;
    });

    // Create a thread with initial content
    await landingPage.goto();
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.multiBlock);
    await landingPage.submitFirstPrompt('Explain React');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  test('should show block controls when block is selected', async () => {
    // Select first block
    await chatPage.selectBlock(0);

    // Verify block is selected
    expect(await chatPage.isBlockSelected(0)).toBe(true);

    // Verify block controls are visible
    await expect(chatPage.blockControls).toBeVisible();

    // Verify action buttons are present
    await expect(chatPage.getBlockControl('ELI5')).toBeVisible();
    await expect(chatPage.getBlockControl('Translate')).toBeVisible();
    await expect(chatPage.getBlockControl('Expand')).toBeVisible();
    await expect(chatPage.getBlockControl('Example')).toBeVisible();
  });

  test('should deselect block when Escape is pressed', async () => {
    // Select block
    await chatPage.selectBlock(0);
    expect(await chatPage.isBlockSelected(0)).toBe(true);

    // Press Escape
    await chatPage.deselectAll();

    // Verify block is deselected
    expect(await chatPage.isBlockSelected(0)).toBe(false);

    // Verify block controls are hidden
    await expect(chatPage.blockControls).not.toBeVisible();
  });

  test('should perform ELI5 transformation', async ({ page }) => {
    // Mock all block actions
    await apiMocker.mockAllBlockActions();

    // Select block
    await chatPage.selectBlock(0);

    // Click ELI5 (waits for API response internally)
    await chatPage.clickBlockAction('ELI5');

    // CRITICAL: Block actions put result in composer, NOT as new message
    // Verify ELI5 response appears in composer prompt
    const promptValue = await chatPage.promptInput.textContent();
    expect(promptValue).toContain('LEGO blocks');
  });

  test('should perform Translate transformation', async ({ page }) => {
    // Mock all block actions
    await apiMocker.mockAllBlockActions();

    // Select block
    await chatPage.selectBlock(0);

    // Click Translate (waits for API response internally)
    await chatPage.clickBlockAction('Translate');

    // Verify translated text appears in composer
    const promptValue = await chatPage.promptInput.textContent();
    expect(promptValue).toContain('这是一个测试响应');
  });

  test('should perform Expand transformation', async ({ page }) => {
    // Mock all block actions
    await apiMocker.mockAllBlockActions();

    // Select block
    await chatPage.selectBlock(0);

    // Click Expand (waits for API response internally)
    await chatPage.clickBlockAction('Expand');

    // Verify expanded content appears in composer
    const promptValue = await chatPage.promptInput.textContent();
    expect(promptValue).toContain('fundamental to modern software');
  });

  test('should perform Example transformation', async ({ page }) => {
    // Mock all block actions
    await apiMocker.mockAllBlockActions();

    // Select block
    await chatPage.selectBlock(0);

    // Click Example (waits for API response internally)
    await chatPage.clickBlockAction('Example');

    // Verify example content appears in composer
    const promptValue = await chatPage.promptInput.textContent();
    expect(promptValue).toContain('shopping cart');
  });

  test('should allow selecting different blocks', async () => {
    // Select first block
    await chatPage.selectBlock(0);
    expect(await chatPage.isBlockSelected(0)).toBe(true);
    expect(await chatPage.isBlockSelected(1)).toBe(false);

    // Select second block
    await chatPage.selectBlock(1);
    expect(await chatPage.isBlockSelected(0)).toBe(false);
    expect(await chatPage.isBlockSelected(1)).toBe(true);

    // Select third block
    await chatPage.selectBlock(2);
    expect(await chatPage.isBlockSelected(1)).toBe(false);
    expect(await chatPage.isBlockSelected(2)).toBe(true);
  });

  test('should handle multiple block actions in sequence', async ({ page }) => {
    // Mock all block actions
    await apiMocker.mockAllBlockActions();

    // First action: ELI5
    await chatPage.selectBlock(0);
    await chatPage.clickBlockAction('ELI5');

    // Verify ELI5 result is in composer
    let promptValue = await chatPage.promptInput.textContent();
    expect(promptValue).toContain('LEGO blocks');

    // Second action: Translate (on same block)
    // Note: composer prompt is now populated with ELI5 result
    await chatPage.clickBlockAction('Translate');

    // Verify Translate result replaced the previous content
    promptValue = await chatPage.promptInput.textContent();
    expect(promptValue).toContain('这是一个测试响应');
  });
});
