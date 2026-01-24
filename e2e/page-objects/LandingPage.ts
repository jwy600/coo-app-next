import type { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Landing Page
 *
 * Encapsulates interactions with the landing page including:
 * - Composer input and submission
 * - Thread list navigation
 * - Initial prompt submission
 */
export class LandingPage {
  readonly page: Page;
  readonly composer: Locator;
  readonly promptInput: Locator;
  readonly sendButton: Locator;
  readonly threadList: Locator;
  readonly threadItems: Locator;

  constructor(page: Page) {
    this.page = page;
    this.composer = page.locator('form.composer');
    this.promptInput = this.composer.locator('div#prompt, [role="textbox"]');
    this.sendButton = this.composer.locator('button[type="submit"]');
    this.threadList = page.locator('.thread-list, [data-testid="thread-list"]');
    this.threadItems = page.locator('.thread-item, [role="link"]').filter({ hasText: /.+/ });
  }

  /**
   * Navigate to landing page
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  /**
   * Submit a prompt from the landing page
   * This creates a new thread and navigates to the thread page
   */
  async submitFirstPrompt(text: string): Promise<void> {
    // Use pressSequentially for cross-browser compatibility (especially WebKit)
    await this.promptInput.click();
    await this.promptInput.pressSequentially(text, { delay: 5 });
    await this.sendButton.click();
  }

  /**
   * Type into the prompt input without submitting
   * For short text, uses pressSequentially for cross-browser compatibility
   * For long text (>100 chars), uses direct DOM manipulation for speed
   */
  async typePrompt(text: string): Promise<void> {
    await this.promptInput.click();

    // For long text, use direct DOM manipulation (faster for tests)
    if (text.length > 100) {
      await this.promptInput.evaluate((el, value) => {
        el.textContent = '';
        el.textContent = value;
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
   * Click send button
   */
  async clickSend(): Promise<void> {
    await this.sendButton.click();
  }

  /**
   * Get all thread items from the thread list
   */
  async getThreads(): Promise<Locator> {
    return this.threadItems;
  }

  /**
   * Click on a thread by index (0-based)
   */
  async clickThread(index: number): Promise<void> {
    await this.threadItems.nth(index).click();
  }

  /**
   * Click on a thread by title
   */
  async clickThreadByTitle(title: string): Promise<void> {
    await this.page.locator('.thread-item, [role="link"]', { hasText: title }).first().click();
  }

  /**
   * Get thread count
   */
  async getThreadCount(): Promise<number> {
    return await this.threadItems.count();
  }

  /**
   * Check if composer is visible
   */
  async isComposerVisible(): Promise<boolean> {
    return await this.composer.isVisible();
  }

  /**
   * Check if send button is disabled
   */
  async isSendDisabled(): Promise<boolean> {
    return await this.sendButton.isDisabled();
  }

  /**
   * Wait for navigation to thread page
   */
  async waitForThreadNavigation(): Promise<void> {
    await this.page.waitForURL(/\/t\/.+/);
  }
}
