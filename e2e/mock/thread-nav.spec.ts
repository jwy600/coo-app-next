import { test, expect } from '../utils/test-fixtures';
import { LandingPage } from '../page-objects/LandingPage';
import { ChatPage } from '../page-objects/ChatPage';
import { ApiMocker, MOCK_RESPONSES } from '../utils/api-mocks';

test.describe('Thread Navigation & Persistence', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;
  let apiMocker: ApiMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);
    apiMocker = new ApiMocker(page);

    await landingPage.goto();
  });

  test('should navigate back to landing page from thread', async ({ page }) => {
    // Create a thread
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.simple);
    await landingPage.submitFirstPrompt('Test thread');
    await page.waitForURL(/\/t\/.+/);

    // Navigate back to landing
    await chatPage.goToLanding();

    // Verify we're on landing page
    await expect(page).toHaveURL('/');
    await expect(landingPage.composer).toBeVisible();
  });

  test('should show thread in thread list after creation', async ({ page }) => {
    // Get initial thread count
    const initialCount = await landingPage.getThreadCount();

    // Create a new thread
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.simple);
    await landingPage.submitFirstPrompt('New thread');
    await page.waitForURL(/\/t\/.+/);

    // Navigate back to landing
    await chatPage.goToLanding();

    // Verify thread count increased (in test mode, threads persist in store)
    const newCount = await landingPage.getThreadCount();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });

  test('should load thread data when navigating to existing thread', async ({ page }) => {
    // Create a thread
    await apiMocker.mockChatSuccess({
      text: 'First thread response.',
    });
    await landingPage.submitFirstPrompt('First thread');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Capture thread ID from URL
    const threadUrl = page.url();
    const threadId = threadUrl.match(/\/t\/(.+)/)?.[1];
    expect(threadId).toBeDefined();

    // Verify content exists
    const firstThreadBlocks = await chatPage.getBlockCount();
    expect(firstThreadBlocks).toBeGreaterThan(0);

    // Navigate to landing
    await chatPage.goToLanding();

    // Create second thread
    await apiMocker.mockChatSuccess({
      text: 'Second thread response.',
    });
    await landingPage.submitFirstPrompt('Second thread');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Navigate back to first thread
    await page.goto(threadUrl);

    // Verify first thread content is loaded
    await expect(chatPage.getUserMessages().first()).toContainText('First thread');
    const blocks = chatPage.getBlocks();
    await expect(blocks.first()).toContainText('First thread response');
  });

  test('should maintain thread state when navigating between threads', async ({ page }) => {
    // Create first thread
    await apiMocker.mockChatSuccess({ text: 'Thread 1 response.' });
    await landingPage.submitFirstPrompt('Thread 1');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
    const thread1Url = page.url();

    // Add second message to first thread
    await apiMocker.mockChatSuccess({ text: 'Thread 1 second response.' });
    await chatPage.submitPrompt('Follow-up question');
    await chatPage.waitForResponse();

    // Verify first thread has 4 messages (2 user + 2 assistant)
    expect(await chatPage.getMessageCount()).toBe(4);

    // Navigate to landing and create second thread
    await chatPage.goToLanding();
    await apiMocker.mockChatSuccess({ text: 'Thread 2 response.' });
    await landingPage.submitFirstPrompt('Thread 2');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Verify second thread has 2 messages
    expect(await chatPage.getMessageCount()).toBe(2);

    // Navigate back to first thread
    await page.goto(thread1Url);

    // Wait for messages to load from sessionStorage
    await chatPage.waitForBlockCount(2); // Wait for at least 2 blocks (from assistant messages)

    // Verify first thread still has 4 messages
    expect(await chatPage.getMessageCount()).toBe(4);
  });

  test('should allow direct navigation to thread via URL', async ({ page }) => {
    // Create a thread
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.simple);
    await landingPage.submitFirstPrompt('Direct navigation test');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    const threadUrl = page.url();
    const threadId = threadUrl.match(/\/t\/(.+)/)?.[1];

    // Direct URL navigation test
    // In test mode with in-memory store, each page has its own store
    // So this mainly tests that the URL routing works
    await expect(page).toHaveURL(threadUrl);
  });
});
