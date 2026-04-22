import { test, expect } from '../utils/test-fixtures';
import { LandingPage } from '../page-objects/LandingPage';
import { ChatPage } from '../page-objects/ChatPage';

/**
 * Integration tests for chat functionality with REAL OpenAI API calls.
 *
 * IMPORTANT:
 * - These tests make real API calls (costs money)
 * - Requires valid OPENAI_API_KEY in environment
 * - Tests run sequentially (configured in playwright.integration.config.ts)
 * - Higher timeout (60s) to accommodate real API latency
 */

test.describe('Chat Flow - Real API Integration', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);

    // Skip test mode - we want real API calls
    // (test mode is disabled in playwright.integration.config.ts)

    await landingPage.goto();
  });

  test('should create thread and receive real AI response', async ({ page }) => {
    // Submit a simple prompt that should get a quick response
    await landingPage.submitFirstPrompt('What is the capital of France? Answer in one sentence.');

    // Verify navigation to thread page
    await expect(page).toHaveURL(/\/t\/.+/, { timeout: 10000 });

    // Verify user message appears
    const userMessages = chatPage.getUserMessages();
    await expect(userMessages).toHaveCount(1);
    await expect(userMessages.first()).toContainText('What is the capital of France');

    // Wait for real AI response (may take several seconds)
    await chatPage.waitForResponse(30000);

    // Verify assistant message appears
    const assistantMessages = chatPage.getAssistantMessages();
    await expect(assistantMessages).toHaveCount(1);

    // Verify blocks are created
    const blocks = chatPage.getBlocks();
    await expect(blocks.first()).toBeVisible();

    // Verify response contains Paris (real AI should answer correctly)
    const blockText = await blocks.first().textContent();
    expect(blockText?.toLowerCase()).toContain('paris');
  });

  test('should parse real markdown response correctly', async ({ page }) => {
    // Submit prompt that should generate markdown
    await landingPage.submitFirstPrompt('Write a simple Python function that adds two numbers. Include a code block.');

    // Wait for navigation
    await expect(page).toHaveURL(/\/t\/.+/, { timeout: 10000 });

    // Wait for real response
    await chatPage.waitForResponse(30000);

    // Verify blocks are created
    const blocks = chatPage.getBlocks();
    const blockCount = await blocks.count();
    expect(blockCount).toBeGreaterThan(0);

    // Verify code block is rendered
    const codeBlocks = page.locator('pre code');
    await expect(codeBlocks.first()).toBeVisible({ timeout: 5000 });

    // Verify code contains Python syntax
    const codeText = await codeBlocks.first().textContent();
    expect(codeText?.toLowerCase()).toMatch(/def|return|function/);
  });

  test('should handle multi-turn conversation with real AI', async ({ page }) => {
    // First turn - ask about TypeScript
    await landingPage.submitFirstPrompt('What is TypeScript? Answer in one sentence.');
    await expect(page).toHaveURL(/\/t\/.+/, { timeout: 10000 });
    await chatPage.waitForResponse(30000);

    // Verify first exchange
    const messageCount1 = await chatPage.getMessageCount();
    expect(messageCount1).toBe(2); // user + assistant

    // Second turn - ask follow-up question
    await chatPage.submitPrompt('What are its benefits? List 2 benefits.');
    await chatPage.waitForResponse(30000);

    // Verify second exchange
    const messageCount2 = await chatPage.getMessageCount();
    expect(messageCount2).toBe(4); // 2 user + 2 assistant

    // Verify both user messages are present
    const userMessages = chatPage.getUserMessages();
    await expect(userMessages).toHaveCount(2);
    await expect(userMessages.nth(0)).toContainText('What is TypeScript');
    await expect(userMessages.nth(1)).toContainText('benefits');

    // Verify both assistant responses are present
    const assistantMessages = chatPage.getAssistantMessages();
    await expect(assistantMessages).toHaveCount(2);

    // Verify blocks from both responses
    const blocks = chatPage.getBlocks();
    const blockCount = await blocks.count();
    expect(blockCount).toBeGreaterThanOrEqual(2);
  });
});
