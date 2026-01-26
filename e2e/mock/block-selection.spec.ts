import { test, expect } from '@playwright/test';
import { LandingPage } from '../page-objects/LandingPage';
import { ChatPage } from '../page-objects/ChatPage';
import { ApiMocker } from '../utils/api-mocks';

/**
 * Mock response with headings and paragraphs for section mode testing
 * Structure:
 * - Heading 1 (## Introduction)
 * - Paragraph 1
 * - Paragraph 2
 * - Heading 2 (## Details)
 * - Paragraph 3
 * - Paragraph 4
 */
const SECTION_RESPONSE = {
  text: `## Introduction

This is the first paragraph under the introduction.

This is the second paragraph under the introduction.

## Details

This is the first paragraph under details.

This is the second paragraph under details.`,
};

/**
 * Mock response with multiple top-level headings for multi-heading tests
 */
const MULTI_HEADING_RESPONSE = {
  text: `## Section A

Content for section A.

## Section B

Content for section B.

## Section C

Content for section C.`,
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
    await apiMocker.mockChatSuccess(SECTION_RESPONSE);
    await landingPage.submitFirstPrompt('Explain something');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  test('should select single block on gutter click', async ({ page }) => {
    // Click first block gutter (paragraph, not heading - block 1)
    await chatPage.selectBlock(1);

    // Verify block is selected
    expect(await chatPage.isBlockSelected(1)).toBe(true);
    expect(await chatPage.isBlockSelected(2)).toBe(false);
  });

  test('should allow multi-select outside section mode', async ({ page }) => {
    // Select first paragraph (block 1)
    await chatPage.selectBlock(1);
    expect(await chatPage.isBlockSelected(1)).toBe(true);

    // Select second paragraph (multi-select)
    await chatPage.selectBlock(2);

    // Both should be selected
    expect(await chatPage.isBlockSelected(1)).toBe(true);
    expect(await chatPage.isBlockSelected(2)).toBe(true);
  });

  test('should deselect block when clicking again', async ({ page }) => {
    // Select paragraph block
    await chatPage.selectBlock(1);
    expect(await chatPage.isBlockSelected(1)).toBe(true);

    // Click again to deselect
    await chatPage.selectBlock(1);
    expect(await chatPage.isBlockSelected(1)).toBe(false);
  });

  test('should deselect all blocks with Escape key', async ({ page }) => {
    // Select multiple paragraph blocks
    await chatPage.selectBlock(1);
    await chatPage.selectBlock(2);
    expect(await chatPage.isBlockSelected(1)).toBe(true);
    expect(await chatPage.isBlockSelected(2)).toBe(true);

    // Press Escape
    await page.keyboard.press('Escape');

    // All should be deselected
    expect(await chatPage.isBlockSelected(1)).toBe(false);
    expect(await chatPage.isBlockSelected(2)).toBe(false);
  });
});

test.describe('Section Mode - Entry and Exit', () => {
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
    await apiMocker.mockChatSuccess(SECTION_RESPONSE);
    await landingPage.submitFirstPrompt('Explain something');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  test('should enter section mode on heading gutter double-click', async ({ page }) => {
    // Find heading block (first block is ## Introduction)
    const headingBlock = chatPage.getBlock(0);
    const gutterHandle = headingBlock.locator('.gutter-handle');

    // Double-click gutter
    await gutterHandle.dblclick();

    // Verify section border appears
    const sectionBorder = page.locator('.block-section');
    await expect(sectionBorder).toBeVisible();
  });

  test('should select heading on single-click (block mode, not section mode)', async ({ page }) => {
    // Single-click heading gutter (with delay for heading click debounce)
    await chatPage.selectBlock(0);
    await page.waitForTimeout(250);

    // Heading should be selected
    expect(await chatPage.isBlockSelected(0)).toBe(true);

    // Section border should NOT appear
    const sectionBorder = page.locator('.block-section');
    await expect(sectionBorder).not.toBeVisible();
  });

  test('should exit section mode when double-clicking same heading again', async ({ page }) => {
    const headingBlock = chatPage.getBlock(0);
    const gutterHandle = headingBlock.locator('.gutter-handle');

    // Enter section mode
    await gutterHandle.dblclick();
    await expect(page.locator('.block-section')).toBeVisible();

    // Double-click again to exit
    await gutterHandle.dblclick();
    await expect(page.locator('.block-section')).not.toBeVisible();
  });

  test('should exit section mode on Escape key', async ({ page }) => {
    const headingBlock = chatPage.getBlock(0);
    const gutterHandle = headingBlock.locator('.gutter-handle');

    // Enter section mode
    await gutterHandle.dblclick();
    await expect(page.locator('.block-section')).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Section mode should exit
    await expect(page.locator('.block-section')).not.toBeVisible();
  });
});

test.describe('Section Mode - Selection Behavior Inside Section', () => {
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
    await apiMocker.mockChatSuccess(SECTION_RESPONSE);
    await landingPage.submitFirstPrompt('Explain something');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Enter section mode on first heading
    const headingBlock = chatPage.getBlock(0);
    await headingBlock.locator('.gutter-handle').dblclick();
    await expect(page.locator('.block-section')).toBeVisible();
  });

  test('should single-select paragraph inside section (replaces selection)', async () => {
    // Blocks inside section: 0 (heading), 1 (para1), 2 (para2)
    // Click paragraph 1
    await chatPage.selectBlock(1);
    expect(await chatPage.isBlockSelected(1)).toBe(true);

    // Click paragraph 2 - should REPLACE selection, not add
    await chatPage.selectBlock(2);
    expect(await chatPage.isBlockSelected(2)).toBe(true);
    expect(await chatPage.isBlockSelected(1)).toBe(false); // Replaced, not multi-select
  });

  test('should deselect and return to section mode when clicking same paragraph again', async ({ page }) => {
    // Select paragraph 1
    await chatPage.selectBlock(1);
    expect(await chatPage.isBlockSelected(1)).toBe(true);

    // Click same paragraph again - should deselect
    await chatPage.selectBlock(1);
    expect(await chatPage.isBlockSelected(1)).toBe(false);

    // Should still be in section mode
    await expect(page.locator('.block-section')).toBeVisible();
  });

  test('should exit section mode when clicking heading inside section', async ({ page }) => {
    // Click the heading (block 0) that started the section
    await chatPage.selectBlock(0);

    // Should exit section mode and select heading directly
    await expect(page.locator('.block-section')).not.toBeVisible();
    expect(await chatPage.isBlockSelected(0)).toBe(true);
  });
});

test.describe('Section Mode - Selection Behavior Outside Section', () => {
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
    await apiMocker.mockChatSuccess(SECTION_RESPONSE);
    await landingPage.submitFirstPrompt('Explain something');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Enter section mode on first heading (Introduction)
    // This section contains blocks 0, 1, 2
    // Blocks 3 (## Details), 4, 5 are outside
    const headingBlock = chatPage.getBlock(0);
    await headingBlock.locator('.gutter-handle').dblclick();
    await expect(page.locator('.block-section')).toBeVisible();
  });

  test('should allow multi-select outside section', async () => {
    // Click paragraph outside section (block 4)
    await chatPage.selectBlock(4);
    expect(await chatPage.isBlockSelected(4)).toBe(true);

    // Click another paragraph outside section (block 5)
    await chatPage.selectBlock(5);

    // Both should be selected (multi-select allowed)
    expect(await chatPage.isBlockSelected(4)).toBe(true);
    expect(await chatPage.isBlockSelected(5)).toBe(true);
  });

  test('should toggle selection when clicking outside blocks', async () => {
    // Select block outside section
    await chatPage.selectBlock(4);
    expect(await chatPage.isBlockSelected(4)).toBe(true);

    // Click again to deselect
    await chatPage.selectBlock(4);
    expect(await chatPage.isBlockSelected(4)).toBe(false);
  });
});

test.describe('Section Mode - Selection Clearing', () => {
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
    await apiMocker.mockChatSuccess(SECTION_RESPONSE);
    await landingPage.submitFirstPrompt('Explain something');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  test('should clear selections when toggling between blocks inside section', async ({ page }) => {
    // Enter section mode
    const headingBlock = chatPage.getBlock(0);
    await headingBlock.locator('.gutter-handle').dblclick();

    // Mock block actions for ELI5
    await apiMocker.mockAllBlockActions();

    // Select first paragraph and add selection chips
    await chatPage.selectBlock(1);
    await chatPage.clickBlockAction('ELI5');
    await chatPage.selectTextInComposer('LEGO');

    // Verify chip exists
    let chips = chatPage.getSelectionChips(1);
    await expect(chips).toHaveCount(1);

    // Switch to second paragraph inside section
    await chatPage.selectBlock(2);

    // Previous block's selections should be cleared
    chips = chatPage.getSelectionChips(1);
    await expect(chips).toHaveCount(0);
  });

  test('should clear selections when deselecting block in section mode', async ({ page }) => {
    // Enter section mode
    const headingBlock = chatPage.getBlock(0);
    await headingBlock.locator('.gutter-handle').dblclick();

    // Mock block actions
    await apiMocker.mockAllBlockActions();

    // Select paragraph and add selections
    await chatPage.selectBlock(1);
    await chatPage.clickBlockAction('ELI5');
    await chatPage.selectTextInComposer('LEGO');

    let chips = chatPage.getSelectionChips(1);
    await expect(chips).toHaveCount(1);

    // Click same block to deselect (return to section mode)
    await chatPage.selectBlock(1);

    // Selections should be cleared
    chips = chatPage.getSelectionChips(1);
    await expect(chips).toHaveCount(0);
  });
});

test.describe('Heading Selection - Mutual Exclusivity', () => {
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
    await apiMocker.mockChatSuccess(MULTI_HEADING_RESPONSE);
    await landingPage.submitFirstPrompt('Show sections');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  test('should allow multi-select of headings in block mode (single-click)', async ({ page }) => {
    // Select first heading (block mode)
    // Note: Heading clicks have a 200ms delay to distinguish from double-click
    await chatPage.selectBlock(0); // ## Section A
    await page.waitForTimeout(250); // Wait for click delay
    expect(await chatPage.isBlockSelected(0)).toBe(true);

    // Single-click second heading - should ADD to selection (multi-select allowed)
    await chatPage.selectBlock(2); // ## Section B
    await page.waitForTimeout(250);
    expect(await chatPage.isBlockSelected(0)).toBe(true);
    expect(await chatPage.isBlockSelected(2)).toBe(true);
  });

  test('should allow double-click to enter section mode from block mode', async ({ page }) => {
    // Select first heading (block mode via single-click)
    await chatPage.selectBlock(0);
    await page.waitForTimeout(250); // Wait for click delay
    expect(await chatPage.isBlockSelected(0)).toBe(true);

    // Double-click second heading - should enter section mode
    const heading2 = chatPage.getBlock(2);
    await heading2.locator('.gutter-handle').dblclick();

    // Section mode should be active for second heading
    const sectionBorder = page.locator('.block-section');
    await expect(sectionBorder).toBeVisible();
    const sectionContent = sectionBorder.locator('.doc-content');
    await expect(sectionContent.first()).toContainText('Section B');

    // First heading should no longer be selected
    expect(await chatPage.isBlockSelected(0)).toBe(false);
  });

  test('should keep section mode and add heading to selection when clicking different heading', async ({ page }) => {
    // Enter section mode on first heading (double-click)
    const heading1 = chatPage.getBlock(0);
    await heading1.locator('.gutter-handle').dblclick();
    await expect(page.locator('.block-section')).toBeVisible();

    // Single-click second heading - should KEEP section mode and SELECT the heading
    await chatPage.selectBlock(2); // ## Section B
    await page.waitForTimeout(250); // Wait for click delay

    // Section mode should STILL be active
    await expect(page.locator('.block-section')).toBeVisible();

    // Second heading should also be selected (outside selection)
    expect(await chatPage.isBlockSelected(2)).toBe(true);
  });

  test('should exit section mode when clicking the section own heading', async ({ page }) => {
    // Enter section mode on first heading (double-click)
    const heading1 = chatPage.getBlock(0);
    await heading1.locator('.gutter-handle').dblclick();
    await expect(page.locator('.block-section')).toBeVisible();

    // Single-click the SAME heading (the one that started section mode)
    await chatPage.selectBlock(0);
    await page.waitForTimeout(250);

    // Section mode should exit
    await expect(page.locator('.block-section')).not.toBeVisible();

    // Heading should be in block mode (selected)
    expect(await chatPage.isBlockSelected(0)).toBe(true);
  });

  test('should ignore double-click on different heading while in section mode', async ({ page }) => {
    // Enter section mode on first heading
    const heading1 = chatPage.getBlock(0);
    await heading1.locator('.gutter-handle').dblclick();

    const sectionBorder = page.locator('.block-section');
    await expect(sectionBorder).toBeVisible();

    // Verify first section content is bordered
    const sectionContent = sectionBorder.locator('.doc-content');
    await expect(sectionContent.first()).toContainText('Section A');

    // Double-click second heading - should be IGNORED (can't have two section modes)
    const heading2 = chatPage.getBlock(2);
    await heading2.locator('.gutter-handle').dblclick();

    // Should still be in section mode for FIRST heading (unchanged)
    await expect(sectionBorder).toBeVisible();
    await expect(sectionContent.first()).toContainText('Section A');

    // Second heading should NOT be selected
    expect(await chatPage.isBlockSelected(2)).toBe(false);
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
    await apiMocker.mockChatSuccess(SECTION_RESPONSE);
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

  test('should disable composer when multi-select (2+ blocks)', async () => {
    // Select multiple blocks
    await chatPage.selectBlock(1);
    await chatPage.selectBlock(2);

    // Verify multi-select
    expect(await chatPage.isBlockSelected(1)).toBe(true);
    expect(await chatPage.isBlockSelected(2)).toBe(true);

    // Composer should be disabled
    await expect(chatPage.sendButton).toBeDisabled();
  });

  test('should show enabled composer with block controls in section mode', async ({ page }) => {
    // Enter section mode
    const headingBlock = chatPage.getBlock(0);
    await headingBlock.locator('.gutter-handle').dblclick();
    await expect(page.locator('.block-section')).toBeVisible();

    // Composer should be enabled
    await expect(chatPage.composer).toBeVisible();
    await expect(chatPage.sendButton).toBeEnabled();

    // Block controls should be visible (for section-level actions)
    await expect(chatPage.blockControls).toBeVisible();
  });

  test('should disable composer when section mode + outside selection', async ({ page }) => {
    // Enter section mode (blocks 0, 1, 2 are in section)
    const headingBlock = chatPage.getBlock(0);
    await headingBlock.locator('.gutter-handle').dblclick();
    await expect(page.locator('.block-section')).toBeVisible();

    // Initially composer should be enabled
    await expect(chatPage.sendButton).toBeEnabled();

    // Select block outside section (block 4)
    await chatPage.selectBlock(4);

    // Composer should now be disabled
    await expect(chatPage.sendButton).toBeDisabled();
  });

  test('should re-enable composer when deselecting outside block', async ({ page }) => {
    // Enter section mode
    const headingBlock = chatPage.getBlock(0);
    await headingBlock.locator('.gutter-handle').dblclick();

    // Select outside block - composer disabled
    await chatPage.selectBlock(4);
    await expect(chatPage.sendButton).toBeDisabled();

    // Deselect outside block
    await chatPage.selectBlock(4);

    // Composer should be re-enabled
    await expect(chatPage.sendButton).toBeEnabled();
  });
});

test.describe('Section Mode - Block Controls Integration', () => {
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
    await apiMocker.mockChatSuccess(SECTION_RESPONSE);
    await landingPage.submitFirstPrompt('Explain something');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  test('should perform block action on selected block within section', async ({ page }) => {
    // Enter section mode
    const headingBlock = chatPage.getBlock(0);
    await headingBlock.locator('.gutter-handle').dblclick();

    // Mock block actions
    await apiMocker.mockAllBlockActions();

    // Select paragraph within section
    await chatPage.selectBlock(1);

    // Perform ELI5 action
    await chatPage.clickBlockAction('ELI5');

    // Verify response appears in composer
    const promptValue = await chatPage.getPromptValue();
    expect(promptValue).toContain('LEGO blocks');
  });

  test('should allow selection chips on block within section', async ({ page }) => {
    // Enter section mode
    const headingBlock = chatPage.getBlock(0);
    await headingBlock.locator('.gutter-handle').dblclick();

    // Mock block actions
    await apiMocker.mockAllBlockActions();

    // Select paragraph and run action
    await chatPage.selectBlock(1);
    await chatPage.clickBlockAction('ELI5');

    // Create selection chip
    await chatPage.selectTextInComposer('LEGO');

    // Verify chip appears on selected block
    const chips = chatPage.getSelectionChips(1);
    await expect(chips).toHaveCount(1);
    await expect(chips.first()).toContainText('LEGO');
  });

  test('should allow rewrite within section mode', async ({ page }) => {
    // Enter section mode
    const headingBlock = chatPage.getBlock(0);
    await headingBlock.locator('.gutter-handle').dblclick();

    // Mock block actions
    await apiMocker.mockAllBlockActions();

    // Select paragraph, run action, create selection
    await chatPage.selectBlock(1);
    const originalText = await chatPage.getBlockText(1);
    await chatPage.clickBlockAction('ELI5');
    await chatPage.selectTextInComposer('LEGO');

    // Click rewrite
    await chatPage.clickRewrite(1);

    // Verify text changed
    const newText = await chatPage.getBlockText(1);
    expect(newText).not.toBe(originalText);
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
    await apiMocker.mockChatSuccess(SECTION_RESPONSE);
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

  test('should exit section mode when clicking outside', async ({ page }) => {
    // Enter section mode
    const headingBlock = chatPage.getBlock(0);
    await headingBlock.locator('.gutter-handle').dblclick();
    await expect(page.locator('.block-section')).toBeVisible();

    // Click outside
    await page.locator('.flex-1.overflow-y-auto').click({ position: { x: 10, y: 10 } });

    // Section mode should exit
    await expect(page.locator('.block-section')).not.toBeVisible();
  });
});
