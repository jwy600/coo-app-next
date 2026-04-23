import { test, expect } from '../utils/test-fixtures';
import { SettingsSheetPO } from '../page-objects/SettingsSheetPO';

/**
 * Settings sheet — covers the redesign (commit 532986c) plus the Obsidian
 * vault / export-destination wiring from commit 0f3f93f.
 *
 * Verifies that controls update the store, persist across reload, and that
 * setting a vault name flips exportDestination from "local" → "obsidian".
 */

async function readSettings(page: import('@playwright/test').Page) {
  return await page.evaluate(() => {
    const raw = window.localStorage.getItem('coo-test-storage');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.state?.settings ?? null;
  });
}

test.describe('Settings sheet', () => {
  let settings: SettingsSheetPO;

  test.beforeEach(async ({ page }) => {
    settings = new SettingsSheetPO(page);
    await page.goto('/');
  });

  test('opens and closes the sheet', async () => {
    expect(await settings.isOpen()).toBe(false);
    await settings.open();
    expect(await settings.isOpen()).toBe(true);
    await settings.close();
    expect(await settings.isOpen()).toBe(false);
  });

  test('updates model selection and persists across reload', async ({
    page,
  }) => {
    await settings.open();
    await settings.selectModel('GPT-5.4');
    await settings.close();

    expect((await readSettings(page))?.model).toBe('gpt-5.4');

    await page.reload();
    await settings.open();
    // Re-open after reload — active button carries `bg-accent`.
    const activeModel = settings.sheet.locator('button.bg-accent', {
      hasText: 'GPT-5.4',
    });
    await expect(activeModel).toBeVisible();
  });

  test('changes response language', async ({ page }) => {
    await settings.open();
    // Open the response-language Select (first combobox) and pick 中文.
    const responseTrigger = settings.sheet.locator('button[role="combobox"]').first();
    await responseTrigger.click();
    await page.locator('[role="option"]', { hasText: '中文' }).click();
    await settings.close();

    expect((await readSettings(page))?.responseLanguage).toBe('zh');
  });

  test('typing an Obsidian vault flips export destination to obsidian', async ({
    page,
  }) => {
    await settings.open();
    await settings.setObsidianVault('MyVault');
    await settings.close();

    const s = await readSettings(page);
    expect(s?.obsidianVaultName).toBe('MyVault');
    expect(s?.exportDestination).toBe('obsidian');

    // Clearing the vault returns to local.
    await settings.open();
    await settings.setObsidianVault('');
    await settings.close();

    const s2 = await readSettings(page);
    expect(s2?.obsidianVaultName).toBe('');
    expect(s2?.exportDestination).toBe('local');
  });

  test('reset to defaults restores defaults for non-apiKey settings', async ({
    page,
  }) => {
    // Mutate a few things first.
    await settings.open();
    await settings.selectModel('GPT-5.4');
    await settings.setObsidianVault('MyVault');

    await settings.resetDefaults();
    await settings.close();

    const s = await readSettings(page);
    expect(s?.model).toBe('gpt-5.4-mini');
    expect(s?.obsidianVaultName ?? '').toBe('');
    expect(s?.exportDestination).toBe('local');
  });
});
