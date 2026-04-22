import { test, expect } from '../utils/test-fixtures';
import { LandingPage } from '../page-objects/LandingPage';
import { ChatPage } from '../page-objects/ChatPage';
import { ApiMocker } from '../utils/api-mocks';

/**
 * Mock response with headings and paragraphs for card mode testing
 * Structure:
 * - Heading 1 (## Introduction)
 * - Paragraph 1
 * - Paragraph 2
 * - Heading 2 (## Details)
 * - Paragraph 3
 * - Paragraph 4
 */
const CARD_RESPONSE = {
  text: `## Introduction

This is the first paragraph under the introduction.

This is the second paragraph under the introduction.

## Details

This is the first paragraph under details.

This is the second paragraph under details.`,
};

test.describe('Card Mode - Basic Operations', () => {
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
    await apiMocker.mockChatSuccess(CARD_RESPONSE);
    await landingPage.submitFirstPrompt('Explain something');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  test('should create card on double-click gutter', async ({ page }) => {
    // Double-click first paragraph block's gutter to create a card
    const block = chatPage.getBlock(1);
    const gutterHandle = block.locator('.gutter-handle');

    // Before: no card should exist
    await expect(page.locator('.block-card')).not.toBeVisible();

    // Double-click to create card
    await gutterHandle.dblclick();

    // Card border should appear around the block
    await expect(page.locator('.block-card')).toBeVisible();

    // The block should be inside the card
    const cardContainer = page.locator('.block-card');
    const blocksInCard = cardContainer.locator('.doc-block');
    await expect(blocksInCard).toHaveCount(1);
  });

  test('should toggle card off when double-clicking same block', async ({ page }) => {
    // Create card first
    const block = chatPage.getBlock(1);
    const gutterHandle = block.locator('.gutter-handle');

    await gutterHandle.dblclick();
    await expect(page.locator('.block-card')).toBeVisible();

    // Double-click same block again - should toggle off
    await gutterHandle.dblclick();

    // Card should be removed
    await expect(page.locator('.block-card')).not.toBeVisible();
  });

  test('should show card visual border around carded blocks', async ({ page }) => {
    // Double-click a heading block's gutter (should card the entire heading content)
    const headingBlock = chatPage.getBlock(0);
    const gutterHandle = headingBlock.locator('.gutter-handle');

    await gutterHandle.dblclick();

    // Card border should be visible
    const cardBorder = page.locator('.block-card');
    await expect(cardBorder).toBeVisible();

    // Verify card has proper styling (border, padding)
    await expect(cardBorder).toHaveCSS('border-style', 'solid');

    // For heading, card should contain heading + its content blocks
    // Introduction card: heading + 2 paragraphs = 3 blocks
    const blocksInCard = cardBorder.locator('.doc-block');
    await expect(blocksInCard).toHaveCount(3);
  });

  test('should show card controls on hover', async ({ page }) => {
    // Create card
    const block = chatPage.getBlock(1);
    await block.locator('.gutter-handle').dblclick();

    const cardContainer = page.locator('.block-card');
    await expect(cardContainer).toBeVisible();

    // Card controls should exist (visibility handled by CSS :hover)
    const cardControls = cardContainer.locator('.card-controls');
    await expect(cardControls).toBeAttached();

    // Hover over card
    await cardContainer.hover();

    // Card controls should become visible on hover
    await expect(cardControls).toHaveCSS('opacity', '1');
  });

  test('should create separate cards for different blocks', async ({ page }) => {
    // Create card for first paragraph (block 1)
    const firstBlock = chatPage.getBlock(1);
    await firstBlock.locator('.gutter-handle').dblclick();

    // Create card for second heading (block 3)
    const secondHeading = chatPage.getBlock(3);
    await secondHeading.locator('.gutter-handle').dblclick();

    // Should have two separate cards
    const cards = page.locator('.block-card');
    await expect(cards).toHaveCount(2);
  });

  test('should not create card if block already in a card', async ({ page }) => {
    // Create card for first heading (includes blocks 0, 1, 2)
    const headingBlock = chatPage.getBlock(0);
    await headingBlock.locator('.gutter-handle').dblclick();

    // Try to create card for paragraph inside the card (block 1)
    // This should not create a new card since block 1 is already in a card
    const paragraphBlock = chatPage.getBlock(1);
    await paragraphBlock.locator('.gutter-handle').dblclick();

    // Should still have only one card
    const cards = page.locator('.block-card');
    await expect(cards).toHaveCount(1);
  });
});

test.describe('Card Mode - Card Controls', () => {
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
    await apiMocker.mockChatSuccess(CARD_RESPONSE);
    await landingPage.submitFirstPrompt('Explain something');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  test('should remove card via card controls', async ({ page }) => {
    // Create card
    const block = chatPage.getBlock(1);
    await block.locator('.gutter-handle').dblclick();

    const cardContainer = page.locator('.block-card');
    await expect(cardContainer).toBeVisible();

    // Use dispatchEvent to bypass pointer interception issues in WebKit
    const clearButton = cardContainer.locator('button[aria-label="Remove card"]');
    await clearButton.dispatchEvent('click');

    // Card should be removed
    await expect(page.locator('.block-card')).not.toBeVisible();
  });

  test('should remove card when clicking Clear button in CardControls', async () => {
    // Create a card using page object method
    await chatPage.createCard(1);

    // Verify card exists
    const cardCount = await chatPage.getCardCount();
    expect(cardCount).toBe(1);

    // Click Clear button using page object method
    await chatPage.clickCardClear(0);

    // Card should be removed
    const newCardCount = await chatPage.getCardCount();
    expect(newCardCount).toBe(0);
  });

  test('should open export dialog when clicking Export button', async ({ page }) => {
    // Create a card
    await chatPage.createCard(1);
    await expect(page.locator('.block-card')).toBeVisible();

    // Click Export button
    await chatPage.clickCardExport(0);

    // Export dialog should open
    const isDialogOpen = await chatPage.isExportDialogOpen();
    expect(isDialogOpen).toBe(true);

    // Verify dialog contains expected elements
    const dialog = chatPage.getExportCardDialog();
    await expect(dialog.locator('text=Export Card')).toBeVisible();
    await expect(dialog.locator('input#card-title')).toBeVisible();
    await expect(dialog.locator('button', { hasText: 'Export' })).toBeVisible();
    await expect(dialog.locator('button', { hasText: 'Cancel' })).toBeVisible();
  });

  test('should close export dialog when clicking Cancel', async ({ page }) => {
    // Create a card and open export dialog
    await chatPage.createCard(1);
    await chatPage.clickCardExport(0);

    // Verify dialog is open
    await expect(chatPage.getExportCardDialog()).toBeVisible();

    // Cancel the dialog
    await chatPage.cancelExport();

    // Dialog should be closed
    await expect(chatPage.getExportCardDialog()).not.toBeVisible();

    // Card should still exist
    const cardCount = await chatPage.getCardCount();
    expect(cardCount).toBe(1);
  });

  test('should export card content as markdown', async ({ page }) => {
    // Create a card with heading (includes content blocks)
    await chatPage.createCard(0); // First heading creates card with 3 blocks
    await expect(page.locator('.block-card')).toBeVisible();

    // Intercept the download to verify export functionality
    const downloadPromise = page.waitForEvent('download');

    // Click Export and confirm with a title
    await chatPage.clickCardExport(0);
    await chatPage.confirmExport('Test Card Title');

    // Verify download was triggered
    const download = await downloadPromise;

    // Verify filename format: {title}.md (sanitized)
    const filename = download.suggestedFilename();
    expect(filename).toBe('Test Card Title.md');

    // Dialog should be closed after export
    await expect(chatPage.getExportCardDialog()).not.toBeVisible();
  });
});

test.describe('Card Mode - Persistence and Thread Navigation', () => {
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
  });

  test('should have separate cards per thread', async ({ page }) => {
    // Create first thread with a card
    await apiMocker.mockChatSuccess(CARD_RESPONSE);
    await landingPage.submitFirstPrompt('First thread');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Create a card in the first thread
    await chatPage.createCard(0);
    expect(await chatPage.getCardCount()).toBe(1);

    // Navigate to landing and create a new thread
    await chatPage.goToLanding();
    await apiMocker.mockChatSuccess(CARD_RESPONSE);
    await landingPage.submitFirstPrompt('Second thread');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // New thread should have no cards (cards are per-thread, not global)
    expect(await chatPage.getCardCount()).toBe(0);

    // Create a different card in the second thread
    await chatPage.createCard(1);
    expect(await chatPage.getCardCount()).toBe(1);

    // Note: Full cross-thread persistence testing requires integration tests
    // with real Supabase, as cards are persisted to database (not sessionStorage)
  });

  test('should maintain cards within the same thread session', async ({ page }) => {
    // Create a thread
    await apiMocker.mockChatSuccess(CARD_RESPONSE);
    await landingPage.submitFirstPrompt('Test thread');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Create a card
    await chatPage.createCard(0);
    expect(await chatPage.getCardCount()).toBe(1);

    // Add a follow-up message (simulating continued conversation)
    await apiMocker.mockChatSuccess({ text: 'Follow-up response.' });
    await chatPage.submitPrompt('Follow-up question');
    await chatPage.waitForResponse();

    // Card should still exist after adding new messages
    const cardCount = await chatPage.getCardCount();
    expect(cardCount).toBe(1);
  });

});

test.describe('Card Mode - Export Integration', () => {
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
    await apiMocker.mockChatSuccess(CARD_RESPONSE);
    await landingPage.submitFirstPrompt('Explain something');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  test('should include all blocks in card when exporting heading card', async ({ page }) => {
    // Create a card for the first heading (includes 3 blocks: heading + 2 paragraphs)
    await chatPage.createCard(0);
    const card = page.locator('.block-card');
    await expect(card).toBeVisible();

    // Verify the card contains 3 blocks
    const blocksInCard = card.locator('.doc-block');
    await expect(blocksInCard).toHaveCount(3);

    // Intercept the download to verify content
    const downloadPromise = page.waitForEvent('download');
    await chatPage.clickCardExport(0);
    await chatPage.confirmExport('Introduction Section');

    const download = await downloadPromise;

    // Verify the file was downloaded with correct name
    expect(download.suggestedFilename()).toBe('Introduction Section.md');
  });

  test('should format export as valid markdown with frontmatter', async ({ page }) => {
    // Create a single-block card (paragraph)
    await chatPage.createCard(1);
    await expect(page.locator('.block-card')).toBeVisible();

    // Intercept download and save content
    const downloadPromise = page.waitForEvent('download');
    await chatPage.clickCardExport(0);
    await chatPage.confirmExport('My Test Card');

    const download = await downloadPromise;

    // Read the downloaded content
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const content = Buffer.concat(chunks).toString('utf-8');

    // Verify markdown frontmatter structure
    expect(content).toMatch(/^---\n/);
    expect(content).toContain('title: "My Test Card"');
    expect(content).toMatch(/created: \d{4}-\d{2}-\d{2}\n/);
    expect(content).toMatch(/---\n/);

    // Verify content includes the block text
    expect(content).toContain('first paragraph under the introduction');
  });

  test('should include original question in export frontmatter', async ({ page }) => {
    // Create a card
    await chatPage.createCard(1);

    // Intercept download
    const downloadPromise = page.waitForEvent('download');
    await chatPage.clickCardExport(0);
    await chatPage.confirmExport('Card Export Test');

    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const content = Buffer.concat(chunks).toString('utf-8');

    // Verify original question is included
    expect(content).toContain('original question: "Explain something"');
  });
});

test.describe('Card Mode - Card and Selection Independence', () => {
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
    await apiMocker.mockChatSuccess(CARD_RESPONSE);
    await landingPage.submitFirstPrompt('Explain something');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  test('should allow selecting block inside card without affecting card', async ({ page }) => {
    // Create a card containing block 1
    await chatPage.createCard(1);
    const initialCardCount = await chatPage.getCardCount();
    expect(initialCardCount).toBe(1);

    // Select the block inside the card (single click on gutter)
    await chatPage.selectBlock(1);

    // Block should be selected
    const isSelected = await chatPage.isBlockSelected(1);
    expect(isSelected).toBe(true);

    // Card should still exist (not affected by selection)
    const cardCount = await chatPage.getCardCount();
    expect(cardCount).toBe(1);

    // Block controls should be visible for the selected block
    await expect(chatPage.blockControls).toBeVisible();
  });

  test('should allow selecting block outside card without affecting card', async ({ page }) => {
    // Create a card for the first heading (blocks 0, 1, 2)
    await chatPage.createCard(0);
    const initialCardCount = await chatPage.getCardCount();
    expect(initialCardCount).toBe(1);

    // Select a block outside the card (block 4 is in the second heading's content)
    await chatPage.selectBlock(4);

    // Block should be selected
    const isSelected = await chatPage.isBlockSelected(4);
    expect(isSelected).toBe(true);

    // Card should still exist (not affected by selection)
    const cardCount = await chatPage.getCardCount();
    expect(cardCount).toBe(1);
  });

  test('should clear selection with Escape without affecting cards', async ({ page }) => {
    // Create a card
    await chatPage.createCard(1);
    const initialCardCount = await chatPage.getCardCount();
    expect(initialCardCount).toBe(1);

    // Select a block (could be inside or outside card)
    await chatPage.selectBlock(3); // Block outside the card

    // Verify selection
    const isSelected = await chatPage.isBlockSelected(3);
    expect(isSelected).toBe(true);

    // Press Escape to clear selection
    await chatPage.deselectAll();

    // Selection should be cleared
    const selectedCount = await chatPage.getSelectedBlockCount();
    expect(selectedCount).toBe(0);

    // Card should still exist (Escape only clears selection, not cards)
    const cardCount = await chatPage.getCardCount();
    expect(cardCount).toBe(1);
  });

  test('should allow block actions on blocks inside cards', async ({ page }) => {
    // Create a card containing paragraph block 1
    await chatPage.createCard(1);
    await expect(page.locator('.block-card')).toBeVisible();

    // Select the block inside the card
    await chatPage.selectBlock(1);

    // Block controls should appear
    await expect(chatPage.blockControls).toBeVisible();

    // Mock the block-action API response
    await apiMocker.mockBlockActionSuccess('eli5', {
      text: 'Simplified explanation for a 5 year old.',
    });

    // Click ELI5 action
    await chatPage.clickBlockAction('ELI5');

    // Card should still exist after block action
    const cardCount = await chatPage.getCardCount();
    expect(cardCount).toBe(1);

    // Block should still be in card
    const isInCard = await chatPage.isBlockInCard(1);
    expect(isInCard).toBe(true);
  });

  test('should maintain multiple cards when selecting blocks', async ({ page }) => {
    // Create two separate cards
    await chatPage.createCard(1); // First card with block 1
    await chatPage.createCard(3); // Second card with heading at block 3

    // Should have two cards
    const initialCardCount = await chatPage.getCardCount();
    expect(initialCardCount).toBe(2);

    // Select a block in the first card
    await chatPage.selectBlock(1);
    expect(await chatPage.isBlockSelected(1)).toBe(true);

    // Both cards should still exist
    expect(await chatPage.getCardCount()).toBe(2);

    // Clear selection and select a block in the second card
    await chatPage.deselectAll();
    await chatPage.selectBlock(4);
    expect(await chatPage.isBlockSelected(4)).toBe(true);

    // Both cards should still exist
    expect(await chatPage.getCardCount()).toBe(2);
  });
});
