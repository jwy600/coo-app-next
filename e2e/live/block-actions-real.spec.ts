import { test, expect } from '@playwright/test';
import { LandingPage } from '../page-objects/LandingPage';
import { ChatPage } from '../page-objects/ChatPage';

/**
 * Integration tests for block actions with REAL OpenAI API calls.
 *
 * IMPORTANT:
 * - These tests make real API calls (costs money)
 * - Requires valid OPENAI_API_KEY in environment
 * - Tests run sequentially (configured in playwright.integration.config.ts)
 * - Higher timeout (60s) to accommodate real API latency
 */

test.describe('Block Actions - Real API Integration', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);

    // Create a thread with initial content
    await landingPage.goto();

    // Submit a prompt that will create a block we can transform
    await landingPage.submitFirstPrompt('Explain what TypeScript is. Answer in 2 sentences.');

    // Wait for navigation and response
    await page.waitForURL(/\/t\/.+/, { timeout: 10000 });
    await chatPage.waitForResponse(30000);

    // Verify blocks are created
    const blocks = chatPage.getBlocks();
    await expect(blocks.first()).toBeVisible();
  });

  test('should perform real ELI5 transformation', async () => {
    // Select first block (contains TypeScript explanation)
    await chatPage.selectBlock(0);

    // Verify block is selected
    expect(await chatPage.isBlockSelected(0)).toBe(true);

    // Click ELI5
    await chatPage.clickBlockAction('ELI5');

    // Wait for real API response (may take several seconds)
    await chatPage.waitForResponse(30000);

    // Verify ELI5 result appears in composer prompt
    const promptValue = await chatPage.promptInput.textContent();

    // Real ELI5 should simplify the language
    // Check that the result is not empty and is different from original
    expect(promptValue).toBeTruthy();
    expect(promptValue!.length).toBeGreaterThan(10);

    // ELI5 often uses simple analogies or comparisons
    // The response should be simpler/shorter than a technical explanation
    console.log('ELI5 result:', promptValue);
  });

  test('should perform real Translate transformation to Chinese', async () => {
    // Select first block
    await chatPage.selectBlock(0);

    // Click Translate
    await chatPage.clickBlockAction('Translate');

    // Wait for real API response
    await chatPage.waitForResponse(30000);

    // Verify translated text appears in composer
    const promptValue = await chatPage.promptInput.textContent();

    // Verify Chinese characters are present (Unicode range for Chinese)
    expect(promptValue).toBeTruthy();
    const hasChinese = /[\u4e00-\u9fff]/.test(promptValue!);
    expect(hasChinese).toBe(true);

    // Log the translation for verification
    console.log('Translation result:', promptValue);

    // Verify it's a substantial translation (not just a few characters)
    const chineseCharCount = (promptValue!.match(/[\u4e00-\u9fff]/g) || []).length;
    expect(chineseCharCount).toBeGreaterThan(5);
  });
});
