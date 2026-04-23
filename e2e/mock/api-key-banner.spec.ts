import { test, expect } from '../utils/test-fixtures';
import { ApiKeyBannerPO } from '../page-objects/ApiKeyBannerPO';
import { SettingsSheetPO } from '../page-objects/SettingsSheetPO';

/**
 * Sticky API key banner (commit 0f3f93f).
 *
 * Appears at the top of the layout when `settings.apiKey` is empty, and
 * hides once the user types a key into Settings.
 *
 * The shared test-fixtures.ts pre-seeds an API key so the banner never
 * shows in other specs. Here we overwrite that seed with an empty key.
 */

const EMPTY_SEED = {
  state: {
    threads: [],
    blocks: [],
    cards: [],
    activeThreadId: null,
    settings: {
      apiKey: '',
      model: 'gpt-5.4-mini',
      reasoningEffort: 'none',
      webSearchEnabled: false,
      responseLanguage: 'en',
      translateLanguage: 'Chinese',
      exportDestination: 'local',
      obsidianVaultName: '',
    },
  },
  version: 2,
};

test.describe('API key banner', () => {
  let banner: ApiKeyBannerPO;
  let settings: SettingsSheetPO;

  test.beforeEach(async ({ page }) => {
    banner = new ApiKeyBannerPO(page);
    settings = new SettingsSheetPO(page);

    // Overwrite the fixture's seed so apiKey is empty. The fixture runs
    // first and sets apiKey='sk-test'; this init runs second and replaces
    // the stored settings blob.
    await page.addInitScript((seed) => {
      window.localStorage.setItem('coo-test-storage', JSON.stringify(seed));
    }, EMPTY_SEED);

    await page.goto('/');
  });

  test('shows banner on landing when API key is empty', async () => {
    await expect(banner.banner).toBeVisible();
    expect(await banner.getText()).toContain('Add your OpenAI API key');
  });

  test('hides banner once user types an API key in Settings', async () => {
    await expect(banner.banner).toBeVisible();

    await settings.open();
    await settings.setApiKey('sk-live-123');
    await settings.close();

    await expect(banner.banner).not.toBeVisible();
  });

  test('re-shows banner if user clears the API key', async () => {
    await settings.open();
    await settings.setApiKey('sk-live-123');
    await settings.close();
    await expect(banner.banner).not.toBeVisible();

    await settings.open();
    await settings.setApiKey('');
    await settings.close();

    await expect(banner.banner).toBeVisible();
  });
});
