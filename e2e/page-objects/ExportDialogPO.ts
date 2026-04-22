import type { Page, Locator } from '@playwright/test';

/**
 * Export Card Dialog Page Object
 *
 * The dialog opened from `CardControls.Export`. Lets the user pick a filename
 * (auto-populated from thread title / heading) before exporting as Markdown
 * or to an Obsidian vault URI.
 */
export class ExportDialogPO {
  readonly page: Page;
  readonly dialog: Locator;
  readonly titleInput: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('[role="dialog"]');
    this.titleInput = this.dialog.locator('input#card-title');
    this.confirmButton = this.dialog.locator('button', { hasText: 'Export' });
    this.cancelButton = this.dialog.locator('button', { hasText: 'Cancel' });
  }

  /** True when the dialog is visible AND it is the Export Card dialog. */
  async isOpen(): Promise<boolean> {
    if (!(await this.dialog.isVisible())) return false;
    return await this.dialog.locator('text=Export Card').isVisible();
  }

  /** Read the current value of the filename input (the auto-populated default). */
  async getTitleValue(): Promise<string> {
    return await this.titleInput.inputValue();
  }

  /** Replace the filename input's contents. */
  async setTitle(title: string): Promise<void> {
    await this.titleInput.fill(title);
  }

  /** Type `title` into the input, then click Export. */
  async confirm(title: string): Promise<void> {
    await this.setTitle(title);
    await this.confirmButton.click();
    await this.page.waitForTimeout(100);
  }

  /** Click Export without changing the filename (accepts the default). */
  async confirmDefault(): Promise<void> {
    await this.confirmButton.click();
    await this.page.waitForTimeout(100);
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await this.page.waitForTimeout(100);
  }
}
