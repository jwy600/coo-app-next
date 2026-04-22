import type { Page, Locator } from '@playwright/test';

/**
 * Sidebar Page Object
 *
 * Wraps the sidebar thread list (components/sidebar/SidebarThreadList.tsx)
 * and the delete-thread confirmation flow (components/chat/DeleteThreadButton.tsx).
 */
export class SidebarPO {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly threadLinks: Locator;
  readonly deleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('[data-sidebar="sidebar"]').or(
      page.locator('aside').first(),
    );
    this.threadLinks = this.sidebar.locator('a[href^="/t/"]');
    this.deleteButton = page.locator('button[aria-label="Delete thread"]');
  }

  async getThreadCount(): Promise<number> {
    return await this.threadLinks.count();
  }

  /** Title text of a thread link by index. */
  async getThreadTitle(index: number): Promise<string> {
    return (await this.threadLinks.nth(index).innerText()).trim();
  }

  async clickThread(index: number): Promise<void> {
    await this.threadLinks.nth(index).click();
  }

  async clickThreadByTitle(title: string): Promise<void> {
    await this.threadLinks.filter({ hasText: title }).first().click();
  }

  /**
   * Open delete confirmation for the active thread and confirm.
   * Waits for the alert dialog and clicks "Delete".
   */
  async deleteActiveThread(): Promise<void> {
    await this.deleteButton.click();
    const dialog = this.page.locator('[role="alertdialog"]');
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('button', { hasText: /^Delete$/ }).click();
    await dialog.waitFor({ state: 'hidden' });
  }

  /** Open delete confirmation and cancel. */
  async cancelDeleteActiveThread(): Promise<void> {
    await this.deleteButton.click();
    const dialog = this.page.locator('[role="alertdialog"]');
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('button', { hasText: 'Cancel' }).click();
    await dialog.waitFor({ state: 'hidden' });
  }
}
