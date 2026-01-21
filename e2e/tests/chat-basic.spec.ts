import { test, expect } from '@playwright/test';
import { LandingPage } from '../page-objects/LandingPage';
import { ChatPage } from '../page-objects/ChatPage';
import { ApiMocker, MOCK_RESPONSES } from '../utils/api-mocks';

test.describe('Basic Chat Flow', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;
  let apiMocker: ApiMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);
    apiMocker = new ApiMocker(page);

    // Set test mode environment variable
    await page.addInitScript(() => {
      (window as any).__TEST_MODE__ = true;
    });

    await landingPage.goto();
  });

  test('should create new thread when user submits from landing', async ({ page }) => {
    // Mock successful chat response
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.simple);

    // Submit prompt from landing page
    await landingPage.submitFirstPrompt('Explain React');

    // Verify navigation to thread page
    await expect(page).toHaveURL(/\/t\/.+/);

    // Verify user message appears
    const userMessages = chatPage.getUserMessages();
    await expect(userMessages).toHaveCount(1);
    await expect(userMessages.first()).toContainText('Explain React');

    // Wait for AI response
    await chatPage.waitForResponse();

    // Verify assistant message with blocks
    const assistantMessages = chatPage.getAssistantMessages();
    await expect(assistantMessages).toHaveCount(1);

    // Verify blocks are created
    const blocks = chatPage.getBlocks();
    await expect(blocks).toHaveCount(1);
    await expect(blocks.first()).toContainText('This is a test response');
  });

  test('should parse markdown response into multiple blocks', async ({ page }) => {
    // Mock response with multiple paragraphs
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.multiBlock);

    // Submit prompt
    await landingPage.submitFirstPrompt('What is React?');

    // Wait for navigation
    await expect(page).toHaveURL(/\/t\/.+/);

    // Wait for response
    await chatPage.waitForResponse();

    // Verify multiple blocks are created (3 paragraphs)
    const blocks = chatPage.getBlocks();
    await expect(blocks).toHaveCount(3);

    // Verify block content
    await expect(blocks.nth(0)).toContainText('React is a JavaScript library');
    await expect(blocks.nth(1)).toContainText('created by Facebook');
    await expect(blocks.nth(2)).toContainText('component-based architecture');
  });

  test('should parse markdown with code blocks and lists', async ({ page }) => {
    // Mock response with complex markdown
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.markdown);

    // Submit prompt
    await landingPage.submitFirstPrompt('Show me markdown examples');

    // Wait for navigation and response
    await expect(page).toHaveURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Verify blocks include different types
    const blockCount = await chatPage.getBlockCount();
    expect(blockCount).toBeGreaterThan(2);

    // Check for heading
    await expect(page.locator('h1')).toContainText('Introduction');

    // Check for list (scope to assistant message to exclude sidebar)
    await expect(page.locator('.assistant-message li')).toHaveCount(2);

    // Check for code block
    await expect(page.locator('pre code')).toBeVisible();
  });

  test('should allow multiple message exchanges in a thread', async ({ page }) => {
    // First message
    await apiMocker.mockChatSuccess({ text: 'React is a library.' });
    await landingPage.submitFirstPrompt('What is React?');
    await expect(page).toHaveURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Verify first exchange
    expect(await chatPage.getMessageCount()).toBe(2); // user + assistant

    // Second message
    await apiMocker.mockChatSuccess({ text: 'Components are reusable pieces.' });
    await chatPage.submitPrompt('What are components?');
    await chatPage.waitForResponse();

    // Verify second exchange
    expect(await chatPage.getMessageCount()).toBe(4); // 2 user + 2 assistant
    expect(await chatPage.getBlockCount()).toBeGreaterThanOrEqual(2);
  });

  test('should show composer on chat page', async ({ page }) => {
    // Create a thread
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.simple);
    await landingPage.submitFirstPrompt('Hello');
    await expect(page).toHaveURL(/\/t\/.+/);

    // Verify composer is visible on chat page
    await expect(chatPage.composer).toBeVisible();
    await expect(chatPage.promptInput).toBeVisible();
    await expect(chatPage.sendButton).toBeVisible();
  });
});
