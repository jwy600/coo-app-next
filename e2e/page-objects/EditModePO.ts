import type { Page, Locator } from '@playwright/test';

/**
 * Edit Mode Page Object
 *
 * Direct-block-editing UI: the Ask/Edit toggle that appears when a block is
 * selected, plus the submit button which becomes "Replace" in Edit mode.
 */
export class EditModePO {
  readonly page: Page;
  readonly composer: Locator;
  readonly toggle: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.composer = page.locator('form.composer');
    this.submitButton = this.composer.locator('button[type="submit"]');
    this.toggle = this.composer
      .locator('div')
      .filter({ has: page.locator('button', { hasText: 'Ask' }) })
      .filter({ has: page.locator('button', { hasText: 'Edit' }) })
      .first();
  }

  async isToggleVisible(): Promise<boolean> {
    return await this.toggle.isVisible();
  }

  async clickAsk(): Promise<void> {
    await this.toggle.locator('button', { hasText: 'Ask' }).click();
    await this.page.waitForTimeout(100);
  }

  async clickEdit(): Promise<void> {
    await this.toggle.locator('button', { hasText: 'Edit' }).click();
    await this.page.waitForTimeout(100);
  }

  /** Active button carries `bg-background`. */
  async isInEditMode(): Promise<boolean> {
    const editButton = this.toggle.locator('button', { hasText: 'Edit' });
    const className = await editButton.getAttribute('class');
    return className?.includes('bg-background') || false;
  }

  async isInAskMode(): Promise<boolean> {
    const askButton = this.toggle.locator('button', { hasText: 'Ask' });
    const className = await askButton.getAttribute('class');
    return className?.includes('bg-background') || false;
  }

  async getSubmitButtonText(): Promise<string> {
    return await this.submitButton.innerText();
  }

  /** Click submit — reads as "Replace" in Edit mode. */
  async clickReplace(): Promise<void> {
    await this.submitButton.click();
    await this.page.waitForTimeout(100);
  }
}
