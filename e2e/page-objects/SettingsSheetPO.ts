import type { Page, Locator } from '@playwright/test';

/**
 * Settings Sheet Page Object
 *
 * Opens via the "Settings" menu item in the sidebar. Backed by
 * `components/settings/SettingsSheet.tsx` + `SettingsForm.tsx`.
 *
 * Exposes helpers for the controls that matter most to E2E: API key,
 * Obsidian vault name, model, reasoning, web-search, system prompt,
 * response + translate language.
 */
export class SettingsSheetPO {
  readonly page: Page;
  readonly sheet: Locator;
  readonly trigger: Locator;
  readonly apiKeyInput: Locator;
  readonly obsidianVaultInput: Locator;
  readonly resetButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sheet = page.locator('[role="dialog"]').filter({
      has: page.locator('text=OpenAI API Key'),
    });
    this.trigger = page.locator('button', { hasText: 'Settings' });
    this.apiKeyInput = this.sheet.locator('input#api-key');
    this.obsidianVaultInput = this.sheet.locator('input#obsidian-vault');
    this.resetButton = this.sheet.locator('button', {
      hasText: 'Reset to Defaults',
    });
  }

  async open(): Promise<void> {
    await this.trigger.click();
    await this.sheet.waitFor({ state: 'visible' });
  }

  async close(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.sheet.waitFor({ state: 'hidden' });
  }

  async isOpen(): Promise<boolean> {
    return await this.sheet.isVisible();
  }

  async setApiKey(value: string): Promise<void> {
    await this.apiKeyInput.fill(value);
  }

  async getApiKey(): Promise<string> {
    return await this.apiKeyInput.inputValue();
  }

  async setObsidianVault(value: string): Promise<void> {
    await this.obsidianVaultInput.fill(value);
  }

  async getObsidianVault(): Promise<string> {
    return await this.obsidianVaultInput.inputValue();
  }

  /** Pick a model by label ("GPT-5.4-mini", "GPT-5.4"). Uses exact match. */
  async selectModel(label: 'GPT-5.4-mini' | 'GPT-5.4'): Promise<void> {
    await this.sheet
      .locator('button', { hasText: new RegExp(`^${label}$`) })
      .click();
  }

  /** Pick reasoning effort ("None" | "Low" | "Medium" | "High"). */
  async selectReasoning(
    label: 'None' | 'Low' | 'Medium' | 'High',
  ): Promise<void> {
    await this.sheet
      .locator('button', { hasText: new RegExp(`^${label}$`) })
      .click();
  }

  async setWebSearch(on: boolean): Promise<void> {
    await this.sheet
      .locator('button', { hasText: on ? 'On' : 'Off' })
      .click();
  }

  async resetDefaults(): Promise<void> {
    await this.resetButton.click();
  }
}
