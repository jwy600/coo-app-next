import type { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Chat/Thread Page
 *
 * Encapsulates interactions with the thread page including:
 * - Block selection and manipulation
 * - Message viewing
 * - Composer interactions
 * - Text selection and highlighting
 */
export class ChatPage {
  readonly page: Page;
  readonly composer: Locator;
  readonly promptInput: Locator;
  readonly sendButton: Locator;
  readonly blockControls: Locator;
  readonly messages: Locator;
  readonly userMessages: Locator;
  readonly assistantMessages: Locator;
  readonly blocks: Locator;

  readonly modeToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.composer = page.locator('form.composer');
    this.promptInput = this.composer.locator('div#prompt, [role="textbox"]');
    this.sendButton = this.composer.locator('button[type="submit"]');
    // Block controls wrapper (div that contains the action badges)
    // Note: BlockControls uses Badge components which render as <div> elements, not buttons
    this.blockControls = this.composer.locator('div').filter({ hasText: /Translate|ELI5|Example|Expand/ }).first();
    this.modeToggle = this.composer.locator('div').filter({ has: page.locator('button', { hasText: 'Ask' }) }).filter({ has: page.locator('button', { hasText: 'Edit' }) }).first();
    this.messages = page.locator('.user-message, .assistant-message');
    this.userMessages = page.locator('.user-message');
    this.assistantMessages = page.locator('.assistant-message');
    this.blocks = page.locator('.doc-block');
  }

  /**
   * Navigate to a specific thread by ID
   */
  async goto(threadId: string): Promise<void> {
    await this.page.goto(`/t/${threadId}`);
  }

  /**
   * Get all blocks in the thread
   */
  getBlocks(): Locator {
    return this.blocks;
  }

  /**
   * Get a specific block by index (0-based)
   */
  getBlock(index: number): Locator {
    return this.blocks.nth(index);
  }

  /**
   * Get block by ID
   */
  getBlockById(blockId: string): Locator {
    return this.page.locator(`[data-block-id="${blockId}"]`);
  }

  /**
   * Select a block by clicking its gutter handle
   * Note: Gutter click has a 200ms delay to distinguish from double-click
   */
  async selectBlock(index: number): Promise<void> {
    const block = this.getBlock(index);
    const gutterHandle = block.locator('.gutter-handle');
    await gutterHandle.click();
    // Wait for the click delay (200ms) plus a small buffer for state update
    await this.page.waitForTimeout(250);
  }

  /**
   * Select a block by ID
   * Note: Gutter click has a 200ms delay to distinguish from double-click
   */
  async selectBlockById(blockId: string): Promise<void> {
    const block = this.getBlockById(blockId);
    const gutterHandle = block.locator('.gutter-handle');
    await gutterHandle.click();
    // Wait for the click delay (200ms) plus a small buffer for state update
    await this.page.waitForTimeout(250);
  }

  /**
   * Check if a block is selected
   */
  async isBlockSelected(index: number): Promise<boolean> {
    const block = this.getBlock(index);
    const className = await block.getAttribute('class');
    return className?.includes('is-selected') || false;
  }

  /**
   * Deselect all blocks (press Escape)
   */
  async deselectAll(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  /**
   * Get block controls (ELI5, Translate, etc.)
   * Note: These are Badge components rendered as divs, not buttons
   */
  getBlockControl(action: string): Locator {
    // Badge components render as divs with cursor-pointer class
    return this.blockControls.locator(`div`, { hasText: new RegExp(`^${action}$`, 'i') });
  }

  /**
   * Click a block action button and wait for API response
   */
  async clickBlockAction(action: 'ELI5' | 'Translate' | 'Expand' | 'Example' | 'Ask'): Promise<void> {
    const button = this.getBlockControl(action);

    // Wait for API response to complete before continuing (any status code)
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes('/api/block-action'),
      { timeout: 10000 }
    );

    await button.click();
    await responsePromise;

    // Give React a moment to update the DOM
    await this.page.waitForTimeout(200);
  }

  /**
   * Submit a prompt in chat mode
   */
  async submitPrompt(text: string): Promise<void> {
    // Use pressSequentially for cross-browser compatibility (especially WebKit)
    await this.promptInput.click();
    await this.promptInput.pressSequentially(text, { delay: 5 });
    await this.sendButton.click();
  }

  /**
   * Type into prompt without submitting
   * For short text, uses pressSequentially for cross-browser compatibility
   * For long text (>100 chars), uses direct DOM manipulation for speed
   */
  async typePrompt(text: string): Promise<void> {
    await this.promptInput.click();

    // For long text, use direct DOM manipulation (faster for tests)
    if (text.length > 100) {
      await this.promptInput.evaluate((el, value) => {
        // Clear existing content
        el.textContent = '';
        // Set new content
        el.textContent = value;
        // Dispatch InputEvent (more compatible than Event)
        el.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: value,
        }));
      }, text);
    } else {
      // For short text, use pressSequentially for WebKit compatibility
      await this.promptInput.pressSequentially(text, { delay: 5 });
    }
  }

  /**
   * Fill prompt (alias for typePrompt)
   */
  async fillPrompt(text: string): Promise<void> {
    await this.typePrompt(text);
  }

  /**
   * Get current prompt value
   */
  async getPromptValue(): Promise<string> {
    return await this.promptInput.evaluate((el) => el.textContent || '');
  }

  /**
   * Get all user messages
   */
  getUserMessages(): Locator {
    return this.userMessages;
  }

  /**
   * Get all assistant messages
   */
  getAssistantMessages(): Locator {
    return this.assistantMessages;
  }

  /**
   * Get message count
   */
  async getMessageCount(): Promise<number> {
    return await this.messages.count();
  }

  /**
   * Get block count
   */
  async getBlockCount(): Promise<number> {
    return await this.blocks.count();
  }

  /**
   * Wait for AI response to complete
   */
  async waitForResponse(timeout: number = 10000): Promise<void> {
    // Wait for send button to be re-enabled (indicates response is complete)
    await this.page.waitForFunction(
      () => {
        const button = document.querySelector('button[type="submit"]');
        return button && !(button as HTMLButtonElement).disabled;
      },
      { timeout }
    );
  }

  /**
   * Select text within the composer prompt using real mouse drag
   * This triggers chip creation via the mousedown/mouseup drag detection
   */
  async selectTextInComposer(text: string): Promise<void> {
    // Get the position info for the text we want to select
    const positions = await this.page.evaluate((searchText) => {
      const composer = document.querySelector('div#prompt');
      if (!composer) throw new Error('Composer prompt input not found');

      const textContent = composer.textContent || '';
      const startIndex = textContent.indexOf(searchText);
      if (startIndex === -1) {
        throw new Error(`Text "${searchText}" not found in composer. Content: "${textContent}"`);
      }

      // Find the text node containing the search text
      const walker = document.createTreeWalker(composer, NodeFilter.SHOW_TEXT);
      let currentNode: Node | null;
      let currentOffset = 0;

      while ((currentNode = walker.nextNode())) {
        const nodeLength = currentNode.textContent?.length || 0;
        if (currentOffset + nodeLength > startIndex) {
          // This is the node containing the start of our search text
          const range = document.createRange();
          const startOffset = startIndex - currentOffset;
          const endOffset = startOffset + searchText.length;

          // Get start position
          range.setStart(currentNode, startOffset);
          range.setEnd(currentNode, startOffset);
          const startRect = range.getBoundingClientRect();

          // Get end position
          range.setStart(currentNode, Math.min(endOffset, nodeLength));
          range.setEnd(currentNode, Math.min(endOffset, nodeLength));
          const endRect = range.getBoundingClientRect();

          return {
            startX: startRect.left,
            startY: startRect.top + startRect.height / 2,
            endX: endRect.left,
            endY: endRect.top + endRect.height / 2,
          };
        }
        currentOffset += nodeLength;
      }
      throw new Error('Could not find text position');
    }, text);

    // Perform actual mouse drag to select text
    await this.page.mouse.move(positions.startX, positions.startY);
    await this.page.mouse.down();
    await this.page.mouse.move(positions.endX, positions.endY);
    await this.page.mouse.up();

    // Wait a bit for the chip to be created
    await this.page.waitForTimeout(100);
  }

  /**
   * Get selection chips within a block
   */
  getSelectionChips(blockIndex: number): Locator {
    const block = this.getBlock(blockIndex);
    return block.locator('.chip');
  }

  /**
   * Click rewrite button for a block
   */
  async clickRewrite(blockIndex: number): Promise<void> {
    const block = this.getBlock(blockIndex);
    const rewriteButton = block.locator('.chip-rewrite');

    // Wait for API response to complete before continuing
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes('/api/block-action') && response.status() === 200,
      { timeout: 10000 }
    );

    await rewriteButton.click();
    await responsePromise;

    // Give React a moment to update the DOM
    await this.page.waitForTimeout(200);
  }

  /**
   * Click undo button for a block (separate button from Rewrite)
   */
  async clickUndo(blockIndex: number): Promise<void> {
    const block = this.getBlock(blockIndex);
    const undoButton = block.locator('.chip-undo');
    await undoButton.click();

    // Give React a moment to update the DOM (undo is synchronous, no API call)
    await this.page.waitForTimeout(100);
  }

  /**
   * Get block text content (excluding chips and other UI elements)
   */
  async getBlockText(index: number): Promise<string> {
    const block = this.getBlock(index);
    // Get only the paragraph/content, not the chips or buttons
    const content = block.locator('.doc-content p, .doc-content code, .doc-content li');
    const count = await content.count();
    if (count === 0) {
      // Fallback to getting all text from doc-content
      return await block.locator('.doc-content').innerText();
    }
    // Get text from all paragraphs/code blocks and join them
    const texts = await content.allInnerTexts();
    return texts.join('\n').trim();
  }

  /**
   * Check if block controls are visible
   */
  async areBlockControlsVisible(): Promise<boolean> {
    return await this.blockControls.isVisible();
  }

  /**
   * Navigate to landing page
   */
  async goToLanding(): Promise<void> {
    await this.page.goto('/');
  }

  /**
   * Wait for block count to reach expected number
   */
  async waitForBlockCount(count: number, timeout: number = 5000): Promise<void> {
    await this.page.waitForFunction(
      (expectedCount) => {
        const blocks = document.querySelectorAll('.doc-block');
        return blocks.length === expectedCount;
      },
      count,
      { timeout }
    );
  }

  /**
   * Get the count of selected blocks
   */
  async getSelectedBlockCount(): Promise<number> {
    return await this.page.locator('.doc-block.is-selected').count();
  }

  /**
   * Check if block is visually muted (not selected and not in a card)
   */
  async isBlockMuted(index: number): Promise<boolean> {
    const block = this.getBlock(index);
    const className = await block.getAttribute('class');
    return className?.includes('is-muted') || false;
  }

  // ==================== Card Mode Methods ====================

  /**
   * Create a card by double-clicking a block's gutter
   */
  async createCard(blockIndex: number): Promise<void> {
    const block = this.getBlock(blockIndex);
    const gutterHandle = block.locator('.gutter-handle');
    await gutterHandle.dblclick();
    // Wait for card to appear in DOM
    await this.page.locator('.block-card').first().waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Check if a block is inside a card
   */
  async isBlockInCard(blockIndex: number): Promise<boolean> {
    const block = this.getBlock(blockIndex);
    // Check if the block's ancestor is a .block-card
    const cardContainer = block.locator('xpath=ancestor::div[contains(@class, "block-card")]');
    const count = await cardContainer.count();
    return count > 0;
  }

  /**
   * Get all card containers on the page
   */
  getCards(): Locator {
    return this.page.locator('.block-card');
  }

  /**
   * Get count of cards on the page
   */
  async getCardCount(): Promise<number> {
    return await this.getCards().count();
  }

  /**
   * Get card controls for a specific card (by index)
   */
  getCardControls(cardIndex: number = 0): Locator {
    return this.getCards().nth(cardIndex).locator('.card-controls');
  }

  /**
   * Click the Clear button on a card to remove it
   * Uses dispatchEvent for cross-browser compatibility when element is overlapped
   */
  async clickCardClear(cardIndex: number = 0): Promise<void> {
    const card = this.getCards().nth(cardIndex);
    // Ensure card is visible before trying to click
    await card.waitFor({ state: 'visible' });
    const clearButton = card.locator('button[aria-label="Remove card"]');
    // Use dispatchEvent to bypass pointer event interception issues in WebKit
    await clearButton.dispatchEvent('click');
    // Wait for card removal state change
    await this.page.waitForTimeout(200);
  }

  /**
   * Click the Export button on a card to open export dialog
   * Uses dispatchEvent for cross-browser compatibility when element is overlapped
   */
  async clickCardExport(cardIndex: number = 0): Promise<void> {
    const card = this.getCards().nth(cardIndex);
    // Ensure card is visible before trying to click
    await card.waitFor({ state: 'visible' });
    const exportButton = card.locator('button[aria-label="Export card"]');
    // Use dispatchEvent to bypass pointer event interception issues in WebKit
    await exportButton.dispatchEvent('click');
    // Wait for dialog to open
    await this.page.waitForTimeout(200);
  }

  /**
   * Get the export card dialog
   */
  getExportCardDialog(): Locator {
    return this.page.locator('[role="dialog"]');
  }

  /**
   * Check if export card dialog is open
   */
  async isExportDialogOpen(): Promise<boolean> {
    const dialog = this.getExportCardDialog();
    const isVisible = await dialog.isVisible();
    if (!isVisible) return false;
    // Verify it's the export dialog by checking title
    const title = dialog.locator('text=Export Card');
    return await title.isVisible();
  }

  /**
   * Fill the card title in export dialog and confirm
   */
  async confirmExport(title: string): Promise<void> {
    const dialog = this.getExportCardDialog();
    const input = dialog.locator('input#card-title');
    await input.fill(title);
    const confirmButton = dialog.locator('button', { hasText: 'Export' });
    await confirmButton.click();
    // Wait for dialog to close
    await this.page.waitForTimeout(100);
  }

  /**
   * Cancel export dialog
   */
  async cancelExport(): Promise<void> {
    const dialog = this.getExportCardDialog();
    const cancelButton = dialog.locator('button', { hasText: 'Cancel' });
    await cancelButton.click();
    // Wait for dialog to close
    await this.page.waitForTimeout(100);
  }

  // ==================== Direct Edit Mode Methods ====================

  /**
   * Check if Ask/Edit toggle is visible
   */
  async isModeToggleVisible(): Promise<boolean> {
    return await this.modeToggle.isVisible();
  }

  /**
   * Click Ask mode in toggle
   */
  async clickAskMode(): Promise<void> {
    const askButton = this.modeToggle.locator('button', { hasText: 'Ask' });
    await askButton.click();
    await this.page.waitForTimeout(100);
  }

  /**
   * Click Edit mode in toggle
   */
  async clickEditMode(): Promise<void> {
    const editButton = this.modeToggle.locator('button', { hasText: 'Edit' });
    await editButton.click();
    await this.page.waitForTimeout(100);
  }

  /**
   * Check if currently in Edit mode (Edit button is active)
   */
  async isInEditMode(): Promise<boolean> {
    const editButton = this.modeToggle.locator('button', { hasText: 'Edit' });
    const className = await editButton.getAttribute('class');
    // Active button has bg-background class
    return className?.includes('bg-background') || false;
  }

  /**
   * Check if currently in Ask mode (Ask button is active)
   */
  async isInAskMode(): Promise<boolean> {
    const askButton = this.modeToggle.locator('button', { hasText: 'Ask' });
    const className = await askButton.getAttribute('class');
    return className?.includes('bg-background') || false;
  }

  /**
   * Get submit button text (Send vs Replace)
   */
  async getSubmitButtonText(): Promise<string> {
    return await this.sendButton.innerText();
  }

  /**
   * Click Replace button (alias for sendButton.click in edit mode)
   */
  async clickReplace(): Promise<void> {
    await this.sendButton.click();
    await this.page.waitForTimeout(100);
  }

  /**
   * Clear the prompt input
   */
  async clearPrompt(): Promise<void> {
    await this.promptInput.evaluate((el) => {
      el.textContent = '';
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    });
  }

  /**
   * Select all text in composer and press a key
   */
  async selectAllAndPress(key: string): Promise<void> {
    await this.promptInput.click();
    // Select all with Cmd/Ctrl+A
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await this.page.keyboard.press(`${modifier}+a`);
    await this.page.keyboard.press(key);
    await this.page.waitForTimeout(100);
  }

  /**
   * Get the undo button for a block (standalone, not in selection chips)
   */
  getUndoButton(blockIndex: number): Locator {
    const block = this.getBlock(blockIndex);
    return block.locator('.chip-undo');
  }
}
