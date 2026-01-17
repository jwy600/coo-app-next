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

  constructor(page: Page) {
    this.page = page;
    this.composer = page.locator('form.composer');
    this.promptInput = this.composer.locator('div#prompt, [role="textbox"]');
    this.sendButton = this.composer.locator('button[type="submit"]');
    // Block controls wrapper (div with mt-2 class that contains the action buttons)
    this.blockControls = this.composer.locator('.mt-2').filter({ hasText: /Translate|ELI5|Example|Expand/ });
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
   */
  async selectBlock(index: number): Promise<void> {
    const block = this.getBlock(index);
    const gutterHandle = block.locator('.gutter-handle');
    await gutterHandle.click();
  }

  /**
   * Select a block by ID
   */
  async selectBlockById(blockId: string): Promise<void> {
    const block = this.getBlockById(blockId);
    const gutterHandle = block.locator('.gutter-handle');
    await gutterHandle.click();
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
   */
  getBlockControl(action: string): Locator {
    return this.blockControls.locator(`button`, { hasText: new RegExp(action, 'i') });
  }

  /**
   * Click a block action button
   */
  async clickBlockAction(action: 'ELI5' | 'Translate' | 'Expand' | 'Example' | 'Ask'): Promise<void> {
    const button = this.getBlockControl(action);
    await button.click();
  }

  /**
   * Submit a prompt in chat mode
   */
  async submitPrompt(text: string): Promise<void> {
    // For contenteditable divs, we need to set textContent directly
    await this.promptInput.evaluate((el, value) => {
      el.textContent = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, text);
    await this.sendButton.click();
  }

  /**
   * Type into prompt without submitting
   */
  async typePrompt(text: string): Promise<void> {
    await this.promptInput.evaluate((el, value) => {
      el.textContent = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, text);
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
   * Select text within the composer prompt
   * This automatically triggers chip creation via onMouseUp event
   */
  async selectTextInComposer(text: string): Promise<void> {
    await this.page.evaluate((searchText) => {
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

          range.setStart(currentNode, startOffset);
          range.setEnd(currentNode, Math.min(endOffset, nodeLength));

          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);

          // Trigger mouseup event to automatically create chip
          composer.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          break;
        }
        currentOffset += nodeLength;
      }
    }, text);

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
   * Click undo button for a block
   */
  async clickUndo(blockIndex: number): Promise<void> {
    const block = this.getBlock(blockIndex);
    const undoButton = block.locator('.chip-rewrite'); // Same button, different label
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
}
