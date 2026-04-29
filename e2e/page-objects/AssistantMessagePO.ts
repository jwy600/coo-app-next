/**
 * Page Object for assistant messages.
 *
 * Provides methods for:
 * - Finding messages by ID
 * - Getting rendered text content
 * - Selecting text ranges for drag-to-edit
 */

import { Page, Locator, expect } from '@playwright/test';
import { dragSelectRange, selectBackwards, dragSelectAcrossMessages } from '../utils/select';

export class AssistantMessagePO {
  private page: Page;
  private messageId: string;
  private locator: Locator;

  constructor(page: Page, messageId: string) {
    this.page = page;
    this.messageId = messageId;
    this.locator = page.locator(
      `[data-testid="assistant-message"][data-message-id="${messageId}"]`,
    );
  }

  /**
   * Create a PO for the message with the given ID.
   */
  static create(page: Page, messageId: string): AssistantMessagePO {
    return new AssistantMessagePO(page, messageId);
  }

  /**
   * Get the rendered text content of the message (visible text).
   */
  async getRenderedText(): Promise<string> {
    return await this.locator.textContent({ timeout: 5000 }) || '';
  }

  /**
   * Wait for the message to appear.
   */
  async waitFor(timeout: number = 5000): Promise<void> {
    await this.locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for the message to contain specific text.
   */
  async waitForText(text: string, timeout: number = 5000): Promise<void> {
    await this.locator.locator(`:has-text("${text}")`).waitFor({
      state: 'visible',
      timeout,
    });
  }

  /**
   * Drag-select a range within this message and open the editor.
   */
  async dragSelect(startOffset: number, endOffset: number): Promise<void> {
    await dragSelectRange(this.page, this.messageId, startOffset, endOffset);
  }

  /**
   * Drag-select backwards (right to left) within this message.
   */
  async dragSelectBackwards(startOffset: number, endOffset: number): Promise<void> {
    await selectBackwards(this.page, this.messageId, startOffset, endOffset);
  }

  /**
   * Drag-select from this message to another message.
   */
  async dragSelectTo(
    toMessageId: string,
    fromOffset: number,
    toOffset: number,
  ): Promise<void> {
    await dragSelectAcrossMessages(this.page, {
      fromMessageId: this.messageId,
      fromOffset,
      toMessageId,
      toOffset,
    });
  }

  /**
   * Assert that the message is visible.
   */
  async expectVisible(): Promise<void> {
    await expect(this.locator).toBeVisible();
  }

  /**
   * Assert that the message contains this text.
   */
  async expectContainsText(text: string): Promise<void> {
    await expect(this.locator).toContainText(text);
  }

  /**
   * Get the raw markdown text from the message's data attribute (if available).
   * Note: This is the rendered view, not the raw source.
   */
  async getRawMarkdown(): Promise<string | null> {
    // The message contains rendered markdown, which we can't directly extract
    // as markdown source. This method is a placeholder for future use if
    // we add a data attribute with the source.
    return null;
  }
}
