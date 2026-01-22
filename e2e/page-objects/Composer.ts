import type { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Composer Component
 *
 * Reusable interactions with the composer that appears on both landing and chat pages
 */
export class Composer {
  readonly page: Page;
  readonly composer: Locator;
  readonly promptInput: Locator;
  readonly sendButton: Locator;
  readonly blockControls: Locator;
  readonly composerLabel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.composer = page.locator('form.composer');
    this.promptInput = this.composer.locator('div#prompt, [role="textbox"]');
    this.sendButton = this.composer.locator('button[type="submit"]');
    // Block controls wrapper (div with mt-2 class that contains the action badges)
    // Note: BlockControls uses Badge components which render as <div> elements, not buttons
    this.blockControls = this.composer.locator('.mt-2').filter({ hasText: /Translate|ELI5|Example|Expand/ });
    this.composerLabel = this.composer.locator('.composer-label, label');
  }

  /**
   * Fill prompt input
   */
  async fillPrompt(text: string): Promise<void> {
    // For contenteditable divs, we need to set textContent directly
    await this.promptInput.evaluate((el, value) => {
      el.textContent = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, text);
  }

  /**
   * Clear prompt input
   */
  async clearPrompt(): Promise<void> {
    await this.promptInput.evaluate((el) => {
      el.textContent = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  /**
   * Get current prompt value
   */
  async getPromptValue(): Promise<string> {
    return await this.promptInput.evaluate((el) => el.textContent || '');
  }

  /**
   * Submit the form
   */
  async submit(): Promise<void> {
    // For very long prompts, the button might be outside viewport
    // Use form submission directly to avoid scroll issues
    try {
      await this.sendButton.click({ timeout: 2000 });
    } catch {
      // If button click fails (e.g., outside viewport), submit form directly
      await this.composer.evaluate((form) => {
        if (form instanceof HTMLFormElement) {
          form.requestSubmit();
        }
      });
    }
  }

  /**
   * Fill and submit in one action
   */
  async submitPrompt(text: string): Promise<void> {
    await this.fillPrompt(text);
    await this.submit();
  }

  /**
   * Submit using Enter key
   */
  async submitWithEnter(): Promise<void> {
    await this.promptInput.press('Enter');
  }

  /**
   * Submit using keyboard shortcut (Ctrl/Cmd+Enter)
   */
  async submitWithShortcut(): Promise<void> {
    const isMac = process.platform === 'darwin';
    const modifier = isMac ? 'Meta' : 'Control';
    await this.promptInput.press(`${modifier}+Enter`);
  }

  /**
   * Check if composer is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.composer.isVisible();
  }

  /**
   * Check if send button is disabled
   */
  async isSendDisabled(): Promise<boolean> {
    return await this.sendButton.isDisabled();
  }

  /**
   * Check if send button is enabled
   */
  async isSendEnabled(): Promise<boolean> {
    return await this.sendButton.isEnabled();
  }

  /**
   * Check if block controls are visible
   */
  async areBlockControlsVisible(): Promise<boolean> {
    return await this.blockControls.isVisible();
  }

  /**
   * Get block control badge by action name
   * Note: These are Badge components rendered as divs, not buttons
   */
  getBlockControlButton(action: string): Locator {
    return this.blockControls.locator('div', { hasText: new RegExp(`^${action}$`, 'i') });
  }

  /**
   * Click a block action button
   */
  async clickBlockAction(action: 'ELI5' | 'Translate' | 'Expand' | 'Example' | 'Ask'): Promise<void> {
    const button = this.getBlockControlButton(action);
    await button.click();
  }

  /**
   * Check if a specific block action is visible
   */
  async isBlockActionVisible(action: string): Promise<boolean> {
    const button = this.getBlockControlButton(action);
    return await button.isVisible();
  }

  /**
   * Get composer label text
   */
  async getLabelText(): Promise<string> {
    return await this.composerLabel.innerText();
  }

  /**
   * Wait for composer to be ready (not disabled)
   */
  async waitForReady(timeout: number = 5000): Promise<void> {
    await this.sendButton.waitFor({ state: 'visible', timeout });
    await this.page.waitForFunction(
      () => {
        const button = document.querySelector('button[type="submit"]');
        return button && !(button as HTMLButtonElement).disabled;
      },
      { timeout }
    );
  }

  /**
   * Focus on prompt input
   */
  async focus(): Promise<void> {
    await this.promptInput.focus();
  }

  /**
   * Check if prompt input has focus
   */
  async isFocused(): Promise<boolean> {
    return await this.promptInput.evaluate((el) => el === document.activeElement);
  }

  /**
   * Type text with typing simulation (character by character)
   */
  async typeSlowly(text: string, delay: number = 50): Promise<void> {
    await this.promptInput.type(text, { delay });
  }

  /**
   * Get placeholder text
   */
  async getPlaceholder(): Promise<string | null> {
    return await this.promptInput.getAttribute('placeholder');
  }
}
