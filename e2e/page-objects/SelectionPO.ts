import type { Page, Locator } from '@playwright/test';

/**
 * Selection Page Object
 *
 * Encapsulates text selection inside the composer and the resulting chip →
 * rewrite → undo flow. Selections happen in the composer (not block content);
 * dragging over text dispatches mouseup which auto-creates a chip under the
 * selected block.
 */
export class SelectionPO {
  readonly page: Page;
  readonly blocks: Locator;

  constructor(page: Page) {
    this.page = page;
    this.blocks = page.locator('.doc-block');
  }

  /**
   * Drag-select text inside the composer contenteditable. Uses real mouse
   * events so the app's mousedown/mouseup drag detection fires and a chip
   * is created automatically.
   */
  async selectInComposer(text: string): Promise<void> {
    const positions = await this.page.evaluate((searchText) => {
      const composer = document.querySelector('div#prompt');
      if (!composer) throw new Error('Composer prompt input not found');

      const textContent = composer.textContent || '';
      const startIndex = textContent.indexOf(searchText);
      if (startIndex === -1) {
        throw new Error(
          `Text "${searchText}" not found in composer. Content: "${textContent}"`,
        );
      }

      const walker = document.createTreeWalker(composer, NodeFilter.SHOW_TEXT);
      let currentNode: Node | null;
      let currentOffset = 0;

      while ((currentNode = walker.nextNode())) {
        const nodeLength = currentNode.textContent?.length || 0;
        if (currentOffset + nodeLength > startIndex) {
          const range = document.createRange();
          const startOffset = startIndex - currentOffset;
          const endOffset = startOffset + searchText.length;

          range.setStart(currentNode, startOffset);
          range.setEnd(currentNode, startOffset);
          const startRect = range.getBoundingClientRect();

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

    await this.page.mouse.move(positions.startX, positions.startY);
    await this.page.mouse.down();
    await this.page.mouse.move(positions.endX, positions.endY);
    await this.page.mouse.up();
    await this.page.waitForTimeout(100);
  }

  /** Chips attached to a given block. */
  getChips(blockIndex: number): Locator {
    return this.blocks.nth(blockIndex).locator('.chip');
  }

  /** Click the rewrite button and wait for the API response. */
  async clickRewrite(blockIndex: number): Promise<void> {
    const button = this.blocks.nth(blockIndex).locator('.chip-rewrite');

    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('api.openai.com/v1/responses') &&
        response.status() === 200,
      { timeout: 10000 },
    );

    await button.click();
    await responsePromise;
    await this.page.waitForTimeout(200);
  }

  /** Undo the last rewrite on a block (no API call). */
  async clickUndo(blockIndex: number): Promise<void> {
    await this.blocks.nth(blockIndex).locator('.chip-undo').click();
    await this.page.waitForTimeout(100);
  }

  /** The undo button locator (useful for visibility assertions). */
  getUndoButton(blockIndex: number): Locator {
    return this.blocks.nth(blockIndex).locator('.chip-undo');
  }
}
