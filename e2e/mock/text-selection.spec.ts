import { test, expect } from '../utils/test-fixtures';
import { LandingPage } from '../page-objects/LandingPage';
import { ChatPage } from '../page-objects/ChatPage';
import { ApiMocker, MOCK_RESPONSES } from '../utils/api-mocks';

test.describe('Text Selection & Rewrite', () => {
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

    await landingPage.goto();
  });

  test('should create selection chip when text is selected in composer', async ({ page }) => {
    // Create a thread
    await apiMocker.mockChatSuccess({
      text: 'React is a JavaScript library for building user interfaces.',
    });
    await landingPage.submitFirstPrompt('Explain React');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Select block and run ELI5 (puts result in composer)
    await apiMocker.mockAllBlockActions();
    await chatPage.selectBlock(0);
    await chatPage.clickBlockAction('ELI5');
    await chatPage.waitForResponse();

    // Verify text is in composer
    const composerText = await chatPage.getPromptValue();
    expect(composerText.length).toBeGreaterThan(0);

    // Select text in composer (chip created automatically)
    await chatPage.selectTextInComposer('LEGO blocks');

    // Verify selection chip appears below the block
    const selectionChips = chatPage.getSelectionChips(0);
    await expect(selectionChips).toHaveCount(1);
    await expect(selectionChips.first()).toContainText('LEGO blocks');
  });

  test('should allow multiple selections within composer', async ({ page }) => {
    // Create thread
    await apiMocker.mockChatSuccess({
      text: 'React is a JavaScript library for building user interfaces.',
    });
    await landingPage.submitFirstPrompt('Explain React');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Select block and run Expand (puts result in composer)
    await apiMocker.mockAllBlockActions();
    await chatPage.selectBlock(0);
    await chatPage.clickBlockAction('Expand');
    await chatPage.waitForResponse();

    // Select first phrase in composer
    await chatPage.selectTextInComposer('component-based');

    // Verify first chip
    let selectionChips = chatPage.getSelectionChips(0);
    await expect(selectionChips).toHaveCount(1);

    // Select second phrase in composer
    await chatPage.selectTextInComposer('declarative');

    // Verify both chips appear
    selectionChips = chatPage.getSelectionChips(0);
    await expect(selectionChips).toHaveCount(2);
    await expect(selectionChips.nth(0)).toContainText('component-based');
    await expect(selectionChips.nth(1)).toContainText('declarative');
  });

  test('should rewrite block when Rewrite button is clicked', async ({ page }) => {
    // Create thread
    await apiMocker.mockChatSuccess({
      text: 'React is a JavaScript library.',
    });
    await landingPage.submitFirstPrompt('Explain React');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Get original block text
    const originalText = await chatPage.getBlockText(0);

    // Select block and run ELI5
    await apiMocker.mockAllBlockActions();
    await chatPage.selectBlock(0);
    await chatPage.clickBlockAction('ELI5');
    await chatPage.waitForResponse();

    // Select text in composer to create chip
    await chatPage.selectTextInComposer('LEGO blocks');

    // Verify chip exists
    const selectionChips = chatPage.getSelectionChips(0);
    await expect(selectionChips).toHaveCount(1);

    // Mock rewrite action
    await apiMocker.mockAllBlockActions();

    // Click Rewrite button (waits for API response internally)
    await chatPage.clickRewrite(0);

    // Verify block text has changed
    const newText = await chatPage.getBlockText(0);
    expect(newText).not.toBe(originalText);
  });

  test('should show Undo button after rewrite', async ({ page }) => {
    // Create thread
    await apiMocker.mockChatSuccess({
      text: 'React is a JavaScript library.',
    });
    await landingPage.submitFirstPrompt('Explain React');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Select block, run action, create selection
    await apiMocker.mockAllBlockActions();
    await chatPage.selectBlock(0);
    await chatPage.clickBlockAction('ELI5');
    await chatPage.waitForResponse();
    await chatPage.selectTextInComposer('LEGO');

    // Rewrite (waits for API response internally)
    await chatPage.clickRewrite(0);

    // Verify Undo button is visible
    const block = chatPage.getBlock(0);
    const undoButton = block.locator('button', { hasText: /undo/i });
    await expect(undoButton).toBeVisible();
  });

  test('should restore original text when Undo is clicked', async ({ page }) => {
    // Create thread
    await apiMocker.mockChatSuccess({
      text: 'React is a JavaScript library.',
    });
    await landingPage.submitFirstPrompt('Explain React');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Capture original text
    await chatPage.selectBlock(0);
    const originalText = await chatPage.getBlockText(0);

    // Run action, create selection, rewrite
    await apiMocker.mockAllBlockActions();
    await chatPage.clickBlockAction('ELI5');
    await chatPage.waitForResponse();
    await chatPage.selectTextInComposer('LEGO');
    await chatPage.clickRewrite(0);

    // Verify text changed
    const rewrittenText = await chatPage.getBlockText(0);
    expect(rewrittenText).not.toBe(originalText);

    // Click Undo
    await chatPage.clickUndo(0);

    // Verify original text is restored
    const restoredText = await chatPage.getBlockText(0);
    expect(restoredText).toBe(originalText);
  });

  test('should allow chained rewrites after undo', async ({ page }) => {
    // Create thread
    await apiMocker.mockChatSuccess({
      text: 'React is a JavaScript library.',
    });
    await landingPage.submitFirstPrompt('Explain React');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Get original text
    await chatPage.selectBlock(0);
    const originalText = await chatPage.getBlockText(0);

    // First rewrite
    await apiMocker.mockAllBlockActions();
    await chatPage.clickBlockAction('ELI5');
    await chatPage.waitForResponse();
    await chatPage.selectTextInComposer('LEGO');
    await chatPage.clickRewrite(0);

    const firstRewrite = await chatPage.getBlockText(0);
    expect(firstRewrite).not.toBe(originalText);

    // Undo - should restore original
    await chatPage.clickUndo(0);
    expect(await chatPage.getBlockText(0)).toBe(originalText);

    // Second rewrite - should work (new API call)
    // Do another ELI5 and select "LEGO" again
    await chatPage.clickBlockAction('ELI5');
    await chatPage.waitForResponse();
    await chatPage.selectTextInComposer('LEGO');
    await chatPage.clickRewrite(0);

    const secondRewrite = await chatPage.getBlockText(0);
    expect(secondRewrite).not.toBe(originalText);
  });

  test('should clear selections when deselecting block', async ({ page }) => {
    // Create thread
    await apiMocker.mockChatSuccess({
      text: 'React is a JavaScript library.',
    });
    await landingPage.submitFirstPrompt('Explain React');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Select block, run action, create selections
    await apiMocker.mockAllBlockActions();
    await chatPage.selectBlock(0);
    await chatPage.clickBlockAction('ELI5');
    await chatPage.waitForResponse();
    await chatPage.selectTextInComposer('LEGO');
    await chatPage.selectTextInComposer('blocks');

    // Verify selections exist
    let selectionChips = chatPage.getSelectionChips(0);
    await expect(selectionChips).toHaveCount(2);

    // Deselect block (press Escape)
    await page.keyboard.press('Escape');

    // Reselect block
    await chatPage.selectBlock(0);

    // Verify selections are cleared
    selectionChips = chatPage.getSelectionChips(0);
    await expect(selectionChips).toHaveCount(0);
  });

  test('should handle manual text input in composer', async ({ page }) => {
    // Create thread
    await apiMocker.mockChatSuccess({
      text: 'React is a JavaScript library.',
    });
    await landingPage.submitFirstPrompt('Explain React');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Select block
    await chatPage.selectBlock(0);

    // Manually type text in composer
    await chatPage.fillPrompt('Focus on component architecture and virtual DOM');

    // Select text to create chip
    await chatPage.selectTextInComposer('component architecture');

    // Verify chip appears
    const selectionChips = chatPage.getSelectionChips(0);
    await expect(selectionChips).toHaveCount(1);
    await expect(selectionChips.first()).toContainText('component architecture');
  });
});
