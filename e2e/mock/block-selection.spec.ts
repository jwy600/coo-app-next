import { test, expect } from '@playwright/test';
import { LandingPage } from '../page-objects/LandingPage';
import { ChatPage } from '../page-objects/ChatPage';
import { ApiMocker } from '../utils/api-mocks';

/**
 * Mock response with headings and paragraphs for block selection testing
 * Structure:
 * - Heading 1 (## Introduction)
 * - Paragraph 1
 * - Paragraph 2
 * - Heading 2 (## Details)
 * - Paragraph 3
 * - Paragraph 4
 */
const BLOCK_RESPONSE = {
  text: `## Introduction

This is the first paragraph under the introduction.

This is the second paragraph under the introduction.

## Details

This is the first paragraph under details.

This is the second paragraph under details.`,
};

test.describe('Block Selection - Basic Behavior', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;
  let apiMocker: ApiMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);
    apiMocker = new ApiMocker(page);

    await page.addInitScript(() => {
      (window as any).__TEST_MODE__ = true;
    });

    await landingPage.goto();
    await apiMocker.mockChatSuccess(BLOCK_RESPONSE);
    await landingPage.submitFirstPrompt('Explain something');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  test('should select single block on gutter click', async ({ page }) => {
    // Click first paragraph block (block 1)
    await chatPage.selectBlock(1);

    // Verify block is selected
    expect(await chatPage.isBlockSelected(1)).toBe(true);
    expect(await chatPage.isBlockSelected(2)).toBe(false);

    // Click second paragraph - should REPLACE selection (single-select mode)
    await chatPage.selectBlock(2);
    expect(await chatPage.isBlockSelected(2)).toBe(true);
    expect(await chatPage.isBlockSelected(1)).toBe(false);
  });

  test('should toggle block selection when clicking again', async ({ page }) => {
    // Select paragraph block
    await chatPage.selectBlock(1);
    expect(await chatPage.isBlockSelected(1)).toBe(true);

    // Click again to deselect
    await chatPage.selectBlock(1);
    expect(await chatPage.isBlockSelected(1)).toBe(false);
  });

  test('should deselect all blocks with Escape key', async ({ page }) => {
    // Select a block
    await chatPage.selectBlock(1);
    expect(await chatPage.isBlockSelected(1)).toBe(true);

    // Press Escape
    await page.keyboard.press('Escape');

    // Should be deselected
    expect(await chatPage.isBlockSelected(1)).toBe(false);
  });
});

test.describe('Composer States - Block Selection Impact', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;
  let apiMocker: ApiMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);
    apiMocker = new ApiMocker(page);

    await page.addInitScript(() => {
      (window as any).__TEST_MODE__ = true;
    });

    await landingPage.goto();
    await apiMocker.mockChatSuccess(BLOCK_RESPONSE);
    await landingPage.submitFirstPrompt('Explain something');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  test('should show enabled composer with no block controls when no selection', async () => {
    // No blocks selected - verify composer state
    await expect(chatPage.composer).toBeVisible();
    await expect(chatPage.sendButton).toBeEnabled();

    // Block controls should NOT be visible
    await expect(chatPage.blockControls).not.toBeVisible();
  });

  test('should show enabled composer with block controls when single block selected', async () => {
    // Select single block
    await chatPage.selectBlock(1);
    expect(await chatPage.isBlockSelected(1)).toBe(true);

    // Composer should be enabled
    await expect(chatPage.composer).toBeVisible();
    await expect(chatPage.sendButton).toBeEnabled();

    // Block controls should be visible
    await expect(chatPage.blockControls).toBeVisible();
  });
});

test.describe('Click Outside Deselection', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;
  let apiMocker: ApiMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);
    apiMocker = new ApiMocker(page);

    await page.addInitScript(() => {
      (window as any).__TEST_MODE__ = true;
    });

    await landingPage.goto();
    await apiMocker.mockChatSuccess(BLOCK_RESPONSE);
    await landingPage.submitFirstPrompt('Explain something');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  test('should deselect blocks when clicking outside blocks and composer', async ({ page }) => {
    // Select a block
    await chatPage.selectBlock(1);
    expect(await chatPage.isBlockSelected(1)).toBe(true);

    // Click on empty space (the message list container)
    await page.locator('.flex-1.overflow-y-auto').click({ position: { x: 10, y: 10 } });

    // Block should be deselected
    expect(await chatPage.isBlockSelected(1)).toBe(false);
  });

  test('should NOT deselect when clicking inside composer', async ({ page }) => {
    // Select a block
    await chatPage.selectBlock(1);
    expect(await chatPage.isBlockSelected(1)).toBe(true);

    // Click inside composer
    await chatPage.promptInput.click();

    // Block should still be selected
    expect(await chatPage.isBlockSelected(1)).toBe(true);
  });

  test('should NOT deselect when clicking inside a doc-block', async ({ page }) => {
    // Select first paragraph block (not heading, no delay needed)
    await chatPage.selectBlock(1);
    expect(await chatPage.isBlockSelected(1)).toBe(true);

    // Click on content of another block (not gutter)
    const thirdBlock = chatPage.getBlock(2);
    await thirdBlock.locator('.doc-content').click();

    // First block should still be selected (clicking content doesn't deselect)
    // Note: This tests that we don't accidentally deselect when interacting with blocks
    expect(await chatPage.isBlockSelected(1)).toBe(true);
  });
});
