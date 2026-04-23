/**
 * Playwright test fixture.
 *
 * Extends the base test to:
 * 1. Flip the app into test mode (so it uses `coo-test-storage` in localStorage).
 * 2. Pre-seed localStorage with a dummy `settings.apiKey` so the composer
 *    enables without any Settings dialog interaction.
 *
 * Because the app is browser-only (no auth), tests don't need a login step —
 * they just need an API key to exist.
 *
 * Usage: `import { test, expect } from '../utils/test-fixtures';`
 */

import { test as base, expect } from '@playwright/test';

const TEST_STORAGE_KEY = 'coo-test-storage';
const LIVE_STORAGE_KEY = 'coo-storage';
const IS_LIVE = process.env.TEST_MODE === 'live';
const SEEDED_SETTINGS = {
  apiKey: IS_LIVE ? process.env.OPENAI_API_KEY ?? '' : 'sk-test',
  model: 'gpt-5.4-mini',
  reasoningEffort: 'none',
  webSearchEnabled: false,
  responseLanguage: 'en',
  translateLanguage: 'Chinese',
  exportDestination: 'local',
  obsidianVaultName: '',
};

export const test = base.extend({
  page: async ({ page }, use) => {
    const storageKey = IS_LIVE ? LIVE_STORAGE_KEY : TEST_STORAGE_KEY;

    await page.addInitScript(
      ({ storageKey, settings, isLive }) => {
        if (!isLive) {
          (window as unknown as { __TEST_MODE__: boolean }).__TEST_MODE__ = true;
        }

        const existing = window.localStorage.getItem(storageKey);
        if (existing) return;

        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            state: {
              threads: [],
              blocks: [],
              cards: [],
              activeThreadId: null,
              settings,
            },
            version: 2,
          }),
        );
      },
      { storageKey, settings: SEEDED_SETTINGS, isLive: IS_LIVE },
    );

    await use(page);
  },
});

export { expect };
