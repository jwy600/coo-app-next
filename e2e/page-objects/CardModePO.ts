import type { Page, Locator } from '@playwright/test';

/**
 * Card Mode Page Object
 *
 * Cards are formed by double-clicking a block's gutter. Each card renders as
 * a `.block-card` wrapper around one or more blocks and carries a `.card-
 * controls` cluster with Remove and Export buttons.
 */
export class CardModePO {
  readonly page: Page;
  readonly blocks: Locator;

  constructor(page: Page) {
    this.page = page;
    this.blocks = page.locator('.doc-block');
  }

  /** Create a card by double-clicking the target block's gutter handle. */
  async createCard(blockIndex: number): Promise<void> {
    const gutter = this.blocks.nth(blockIndex).locator('.gutter-handle');
    await gutter.dblclick();
    await this.page.locator('.block-card').first().waitFor({
      state: 'visible',
      timeout: 5000,
    });
  }

  /** True when the block at index is inside a `.block-card` ancestor. */
  async isBlockInCard(blockIndex: number): Promise<boolean> {
    const block = this.blocks.nth(blockIndex);
    const cardAncestor = block.locator(
      'xpath=ancestor::div[contains(@class, "block-card")]',
    );
    return (await cardAncestor.count()) > 0;
  }

  /** All card containers on the page. */
  getCards(): Locator {
    return this.page.locator('.block-card');
  }

  async getCardCount(): Promise<number> {
    return await this.getCards().count();
  }

  getCardControls(cardIndex: number = 0): Locator {
    return this.getCards().nth(cardIndex).locator('.card-controls');
  }

  /**
   * Click the Remove button on a card.
   * Uses dispatchEvent for WebKit compatibility (pointer-event interception).
   */
  async clickClear(cardIndex: number = 0): Promise<void> {
    const card = this.getCards().nth(cardIndex);
    await card.waitFor({ state: 'visible' });
    const clearButton = card.locator('button[aria-label="Remove card"]');
    await clearButton.dispatchEvent('click');
    await this.page.waitForTimeout(200);
  }

  /**
   * Click the Export button on a card — opens the ExportCardDialog.
   * Uses dispatchEvent for WebKit compatibility.
   */
  async clickExport(cardIndex: number = 0): Promise<void> {
    const card = this.getCards().nth(cardIndex);
    await card.waitFor({ state: 'visible' });
    const exportButton = card.locator('button[aria-label="Export card"]');
    await exportButton.dispatchEvent('click');
    await this.page.waitForTimeout(200);
  }
}
