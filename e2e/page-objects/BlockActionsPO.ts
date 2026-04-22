import type { Page, Locator } from '@playwright/test';

/**
 * Block Actions Page Object
 *
 * Encapsulates the block action controls that appear when a block is selected
 * (ELI5, Translate, Expand, Example, Ask). These are Badge components rendered
 * as <div> elements, not buttons.
 */
export class BlockActionsPO {
  readonly page: Page;
  readonly composer: Locator;
  readonly controls: Locator;

  constructor(page: Page) {
    this.page = page;
    this.composer = page.locator('form.composer');
    this.controls = this.composer
      .locator('div')
      .filter({ hasText: /Translate|ELI5|Example|Expand/ })
      .first();
  }

  /** Get a specific action control (ELI5, Translate, etc.) */
  get(action: string): Locator {
    return this.controls.locator('div', {
      hasText: new RegExp(`^${action}$`, 'i'),
    });
  }

  async isVisible(): Promise<boolean> {
    return await this.controls.isVisible();
  }

  /**
   * Click a block action and wait for the OpenAI response to complete.
   */
  async click(
    action: 'ELI5' | 'Translate' | 'Expand' | 'Example' | 'Ask',
  ): Promise<void> {
    const button = this.get(action);

    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes('api.openai.com/v1/responses'),
      { timeout: 10000 },
    );

    await button.click();
    await responsePromise;
    await this.page.waitForTimeout(200);
  }
}
