/**
 * Page Object for the focus editor (in-place markdown editor).
 *
 * Provides high-level methods for interacting with the editor:
 * - Reading buffer content
 * - Typing and updating buffer
 * - Clicking action chips
 * - Asking questions
 * - Reverting / rewriting
 * - Closing the editor
 */

import { Page, expect } from '@playwright/test';

export class FocusEditorPO {
  constructor(private page: Page) {}

  /**
   * Check if the editor is currently visible.
   */
  async isOpen(): Promise<boolean> {
    return await this.page
      .locator('[data-testid="focus-editor"]')
      .isVisible()
      .catch(() => false);
  }

  /**
   * Get the current buffer content (raw markdown).
   */
  async buffer(): Promise<string> {
    return await this.page
      .locator('[data-testid="focus-editor-textarea"]')
      .inputValue();
  }

  /**
   * Replace the entire buffer with new text.
   */
  async setBuffer(text: string): Promise<void> {
    const textarea = this.page.locator('[data-testid="focus-editor-textarea"]');
    await textarea.clear();
    await textarea.fill(text);
  }

  /**
   * Type text into the buffer (appends to current content).
   */
  async typeBuffer(text: string): Promise<void> {
    await this.page
      .locator('[data-testid="focus-editor-textarea"]')
      .type(text);
  }

  /**
   * Click an action chip by name.
   * @param action "translate" | "eli5" | "summarize" | "revert" | "rewrite"
   */
  async clickAction(
    action: 'translate' | 'eli5' | 'summarize' | 'revert' | 'rewrite',
  ): Promise<void> {
    await this.page
      .locator(`[data-testid="focus-action-${action}"]`)
      .click();
  }

  /**
   * Type a question into the ask input and submit it (hit Enter).
   */
  async ask(question: string): Promise<void> {
    const input = this.page.locator('[data-testid="focus-ask-input"]');
    await input.fill(question);
    await input.press('Enter');
  }

  /**
   * Click the Revert button.
   */
  async revert(): Promise<void> {
    await this.clickAction('revert');
  }

  /**
   * Click the Rewrite button.
   */
  async rewrite(): Promise<void> {
    await this.clickAction('rewrite');
  }

  /**
   * Close the editor by clicking outside of it.
   */
  async closeByClickingOutside(): Promise<void> {
    await this.page.mouse.click(20, 20);
    await this.page
      .locator('[data-testid="focus-editor"]')
      .waitFor({ state: 'hidden' });
  }

  /**
   * Wait for the editor to open (and be fully visible).
   */
  async waitForOpen(timeout: number = 5000): Promise<void> {
    await this.page
      .locator('[data-testid="focus-editor"]')
      .waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for the editor to close.
   */
  async waitForClose(timeout: number = 5000): Promise<void> {
    await this.page
      .locator('[data-testid="focus-editor"]')
      .waitFor({ state: 'hidden', timeout });
  }

  /**
   * Assert that the buffer contains exactly this text.
   */
  async expectBufferEquals(text: string): Promise<void> {
    const current = await this.buffer();
    expect(current).toBe(text);
  }

  /**
   * Assert that the buffer contains this substring.
   */
  async expectBufferContains(substring: string): Promise<void> {
    const current = await this.buffer();
    expect(current).toContain(substring);
  }

  /**
   * Assert that an action chip is disabled.
   */
  async expectActionDisabled(
    action: 'translate' | 'eli5' | 'summarize',
  ): Promise<void> {
    const chip = this.page.locator(`[data-testid="focus-action-${action}"]`);
    await expect(chip).toHaveClass(/opacity-50/);
  }

  /**
   * Assert that an action chip is enabled.
   */
  async expectActionEnabled(
    action: 'translate' | 'eli5' | 'summarize',
  ): Promise<void> {
    const chip = this.page.locator(`[data-testid="focus-action-${action}"]`);
    await expect(chip).not.toHaveClass(/opacity-50/);
  }
}
