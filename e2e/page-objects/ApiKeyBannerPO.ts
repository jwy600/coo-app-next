import type { Page, Locator } from '@playwright/test';

/**
 * API Key Banner Page Object
 *
 * The sticky banner rendered at the top of the layout when
 * `settings.apiKey` is empty. Source: components/layout/ApiKeyBanner.tsx.
 */
export class ApiKeyBannerPO {
  readonly page: Page;
  readonly banner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.banner = page.locator('text=Add your OpenAI API key in');
  }

  async isVisible(): Promise<boolean> {
    return await this.banner.isVisible();
  }

  async getText(): Promise<string> {
    return await this.banner.innerText();
  }
}
