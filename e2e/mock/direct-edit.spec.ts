import { test, expect } from '../utils/test-fixtures';
import { LandingPage } from '../page-objects/LandingPage';
import { ChatPage } from '../page-objects/ChatPage';
import { ApiMocker } from '../utils/api-mocks';

/**
 * Tests for Direct Block Editing feature
 * - Ask/Edit toggle visibility and mode switching
 * - Edit mode composer population
 * - Replace button and direct block updates
 * - Undo after direct edit
 * - Strikethrough on select-all + delete
 */

const SIMPLE_RESPONSE = {
  text: 'React is a JavaScript library for building user interfaces.',
};

test.describe('Direct Edit - Toggle Visibility', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;
  let apiMocker: ApiMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);
    apiMocker = new ApiMocker(page);

    await landingPage.goto();
    await apiMocker.mockChatSuccess(SIMPLE_RESPONSE);
    await landingPage.submitFirstPrompt('Explain React');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  test('should show Ask/Edit toggle when block is selected', async () => {
    // Initially no toggle visible
    expect(await chatPage.isModeToggleVisible()).toBe(false);

    // Select a block
    await chatPage.selectBlock(0);

    // Toggle should appear
    expect(await chatPage.isModeToggleVisible()).toBe(true);
  });

  test('should hide toggle when block is deselected', async () => {
    // Select block
    await chatPage.selectBlock(0);
    expect(await chatPage.isModeToggleVisible()).toBe(true);

    // Deselect with Escape
    await chatPage.deselectAll();

    // Toggle should disappear
    expect(await chatPage.isModeToggleVisible()).toBe(false);
  });

  test('should default to Ask mode when block is selected', async () => {
    await chatPage.selectBlock(0);

    expect(await chatPage.isInAskMode()).toBe(true);
    expect(await chatPage.isInEditMode()).toBe(false);
  });
});

test.describe('Direct Edit - Mode Switching', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;
  let apiMocker: ApiMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);
    apiMocker = new ApiMocker(page);

    await landingPage.goto();
    await apiMocker.mockChatSuccess(SIMPLE_RESPONSE);
    await landingPage.submitFirstPrompt('Explain React');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  test('should switch to Edit mode and populate composer with block text', async () => {
    // Get original block text
    const blockText = await chatPage.getBlockText(0);

    // Select block and switch to Edit mode
    await chatPage.selectBlock(0);
    await chatPage.clickEditMode();

    // Verify Edit mode is active
    expect(await chatPage.isInEditMode()).toBe(true);

    // Verify composer is populated with block text
    const composerText = await chatPage.getPromptValue();
    expect(composerText).toBe(blockText);
  });

  test('should clear composer when switching back to Ask mode', async () => {
    await chatPage.selectBlock(0);
    await chatPage.clickEditMode();

    // Verify composer has text
    const textInEdit = await chatPage.getPromptValue();
    expect(textInEdit.length).toBeGreaterThan(0);

    // Switch back to Ask mode
    await chatPage.clickAskMode();

    // Verify composer is cleared
    const textInAsk = await chatPage.getPromptValue();
    expect(textInAsk).toBe('');
  });

  test('should show Replace button in Edit mode', async () => {
    await chatPage.selectBlock(0);

    // In Ask mode, button says "Send"
    let buttonText = await chatPage.getSubmitButtonText();
    expect(buttonText).toContain('Send');

    // Switch to Edit mode
    await chatPage.clickEditMode();

    // Button should say "Replace"
    buttonText = await chatPage.getSubmitButtonText();
    expect(buttonText).toContain('Replace');
  });

  test('should hide block controls in Edit mode', async () => {
    await chatPage.selectBlock(0);

    // In Ask mode, block controls visible
    await expect(chatPage.blockControls).toBeVisible();

    // Switch to Edit mode
    await chatPage.clickEditMode();

    // Block controls should be hidden
    await expect(chatPage.blockControls).not.toBeVisible();
  });
});

test.describe('Direct Edit - Block Replacement', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;
  let apiMocker: ApiMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);
    apiMocker = new ApiMocker(page);

    await landingPage.goto();
    await apiMocker.mockChatSuccess(SIMPLE_RESPONSE);
    await landingPage.submitFirstPrompt('Explain React');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  test('should replace block content when clicking Replace', async ({ page }) => {
    const originalText = await chatPage.getBlockText(0);

    // Select block, switch to Edit mode
    await chatPage.selectBlock(0);
    await chatPage.clickEditMode();

    // Clear and type new text
    await chatPage.clearPrompt();
    await chatPage.typePrompt('This is the new block content.');

    // Click Replace
    await chatPage.clickReplace();

    // Verify block text changed
    const newText = await chatPage.getBlockText(0);
    expect(newText).toBe('This is the new block content.');
    expect(newText).not.toBe(originalText);
  });

  test('should keep block selected after Replace', async () => {
    await chatPage.selectBlock(0);
    await chatPage.clickEditMode();

    // Modify and replace
    await chatPage.clearPrompt();
    await chatPage.typePrompt('Modified content');
    await chatPage.clickReplace();

    // Block should still be selected
    expect(await chatPage.isBlockSelected(0)).toBe(true);
  });

  test('should show Undo button after Replace (without selections)', async () => {
    await chatPage.selectBlock(0);
    await chatPage.clickEditMode();

    // Modify and replace
    await chatPage.clearPrompt();
    await chatPage.typePrompt('Modified content');
    await chatPage.clickReplace();

    // Undo button should be visible
    const undoButton = chatPage.getUndoButton(0);
    await expect(undoButton).toBeVisible();
  });

  test('should restore original text when Undo is clicked', async () => {
    const originalText = await chatPage.getBlockText(0);

    await chatPage.selectBlock(0);
    await chatPage.clickEditMode();

    // Modify and replace
    await chatPage.clearPrompt();
    await chatPage.typePrompt('Modified content');
    await chatPage.clickReplace();

    // Verify text changed
    expect(await chatPage.getBlockText(0)).toBe('Modified content');

    // Click Undo
    await chatPage.clickUndo(0);

    // Verify original text restored
    expect(await chatPage.getBlockText(0)).toBe(originalText);
  });
});

test.describe('Direct Edit - Strikethrough', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;
  let apiMocker: ApiMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);
    apiMocker = new ApiMocker(page);

    await landingPage.goto();
    await apiMocker.mockChatSuccess(SIMPLE_RESPONSE);
    await landingPage.submitFirstPrompt('Explain React');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  test('should wrap text in strikethrough when select-all + backspace in Edit mode', async ({ page }) => {
    await chatPage.selectBlock(0);
    await chatPage.clickEditMode();

    const originalText = await chatPage.getPromptValue();

    // Select all and press backspace
    await chatPage.selectAllAndPress('Backspace');

    // Verify the composer renders a <del> element (visual strikethrough)
    const delEl = chatPage.promptInput.locator('del');
    await expect(delEl).toBeVisible();
    await expect(delEl).toHaveText(originalText);
  });

  test('should render strikethrough in block after Replace', async ({ page }) => {
    await chatPage.selectBlock(0);
    await chatPage.clickEditMode();

    // Select all and press backspace (creates strikethrough)
    await chatPage.selectAllAndPress('Backspace');

    // Click Replace
    await chatPage.clickReplace();

    // Verify block contains <del> element (strikethrough)
    const block = chatPage.getBlock(0);
    const delElement = block.locator('del');
    await expect(delElement).toBeVisible();
  });
});

test.describe('Direct Edit - Edge Cases', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;
  let apiMocker: ApiMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);
    apiMocker = new ApiMocker(page);

    await landingPage.goto();
    await apiMocker.mockChatSuccess(SIMPLE_RESPONSE);
    await landingPage.submitFirstPrompt('Explain React');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  test('should reset to Ask mode when switching to a different block', async ({ page }) => {
    // Need multiple blocks for this test
    await apiMocker.mockChatSuccess({
      text: `## First Block

This is the second block.`,
    });
    await chatPage.submitPrompt('Give me more');
    await chatPage.waitForResponse();

    // Select first new block and switch to Edit mode
    await chatPage.selectBlock(1);
    await chatPage.clickEditMode();
    expect(await chatPage.isInEditMode()).toBe(true);

    // Select a different block
    await chatPage.selectBlock(2);

    // Should reset to Ask mode
    expect(await chatPage.isInAskMode()).toBe(true);
  });

  test('should not replace when composer is empty', async () => {
    const originalText = await chatPage.getBlockText(0);

    await chatPage.selectBlock(0);
    await chatPage.clickEditMode();

    // Clear the prompt completely
    await chatPage.clearPrompt();

    // Click Replace (should do nothing)
    await chatPage.clickReplace();

    // Block text should be unchanged
    expect(await chatPage.getBlockText(0)).toBe(originalText);
  });
});
