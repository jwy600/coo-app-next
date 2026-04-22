import { test, expect } from '../utils/test-fixtures';
import { LandingPage } from '../page-objects/LandingPage';
import { ChatPage } from '../page-objects/ChatPage';
import { ApiMocker } from '../utils/api-mocks';

/**
 * Obsidian export URI (commits 2d6a21f + 125e3ec).
 *
 * When `settings.exportDestination === 'obsidian'` and a vault is set,
 * `exportMarkdown` delegates to `openInObsidian`, which constructs
 * `obsidian://new?vault=…&file=…&content=…&overwrite=true` and triggers it
 * via a hidden anchor click. We patch anchor clicks to capture the URI
 * instead of letting the browser hand it off to the protocol handler.
 */

const RESPONSE = {
  text: `## Heading One

A paragraph under the heading for exporting.`,
};

const VAULT_SEED = (apiKey = 'sk-test', vaultName = 'MyVault') => ({
  state: {
    threads: [],
    blocks: [],
    cards: [],
    activeThreadId: null,
    settings: {
      apiKey,
      systemPromptFile: 'developer',
      model: 'gpt-5.4-mini',
      reasoningEffort: 'none',
      webSearchEnabled: false,
      responseLanguage: 'en',
      translateLanguage: 'Chinese',
      exportDestination: 'obsidian',
      obsidianVaultName: vaultName,
    },
  },
  version: 2,
});

test.describe('Obsidian export', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;
  let apiMocker: ApiMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);
    apiMocker = new ApiMocker(page);

    // Capture obsidian:// URIs BEFORE navigation so the init script is
    // registered ahead of the page's first load.
    await apiMocker.captureObsidianUri();

    // Seed settings with obsidian destination + vault.
    await page.addInitScript((seed) => {
      window.localStorage.setItem('coo-test-storage', JSON.stringify(seed));
    }, VAULT_SEED());

    await apiMocker.mockChatSuccess(RESPONSE);
    await landingPage.goto();
    await landingPage.submitFirstPrompt('Explain React');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  test('heading card export triggers obsidian://new URI with correct params', async () => {
    await chatPage.cards.createCard(0); // heading-anchored card
    await chatPage.cards.clickExport(0);
    await chatPage.exportDialog.confirm('Test Card');

    const uris = await apiMocker.readCapturedObsidianUris();
    expect(uris).toHaveLength(1);

    const uri = new URL(uris[0]);
    expect(uri.protocol).toBe('obsidian:');
    expect(uri.searchParams.get('vault')).toBe('MyVault');
    // openInObsidian strips the .md suffix and prefixes `Coo/`.
    expect(uri.searchParams.get('file')).toBe('Coo/Test Card');
    expect(uri.searchParams.get('overwrite')).toBe('true');

    const content = uri.searchParams.get('content') ?? '';
    expect(content).toContain('Heading One');
    expect(content).toContain('paragraph under the heading');
  });

  test('paragraph card export uses thread title as filename', async () => {
    // Block 1 = paragraph under the heading. defaultCardTitle picks the
    // thread title (no heading prefix for paragraph cards).
    await chatPage.cards.createCard(1);
    await chatPage.cards.clickExport(0);
    await chatPage.exportDialog.confirmDefault();

    const uris = await apiMocker.readCapturedObsidianUris();
    expect(uris).toHaveLength(1);

    const uri = new URL(uris[0]);
    expect(uri.searchParams.get('file')).toBe('Coo/Explain React');
  });
});
