/**
 * Thread lifecycle: create, delete, navigate.
 *
 * Happy-path smoke tests for thread CRUD operations via the UI.
 */

import { test, expect } from '../../utils/test-fixtures';
import { getMockCalls, resetAllMocks } from '../../utils/mock-bridge';

test.describe('Thread lifecycle', () => {
  test('submit on landing creates thread and shows in sidebar', async ({
    page,
  }) => {
    await resetAllMocks(page);
    await page.goto('/');

    // Wait for composer to be ready
    const composerInput = page.locator('[aria-label="Prompt"]');
    await composerInput.waitFor({ state: 'visible', timeout: 5000 });

    // Submit a message
    await composerInput.focus();
    await page.evaluate(() => {
      const el = document.querySelector('[aria-label="Prompt"]') as HTMLElement;
      el.textContent = 'Test message';
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    });
    await page.locator('button:has-text("Send"):not([disabled])').waitFor({ timeout: 5000 });
    await page.locator('button:has-text("Send")').click();

    // Wait for assistant message (mock response)
    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });

    // Verify we're on a thread URL
    const url = page.url();
    expect(url).toMatch(/\/t\/[a-z0-9]+/);
    const threadId = url.split('/t/')[1];

    // Verify the thread appears in the sidebar
    const threadLink = page.locator(`a[href="/t/${threadId}"]`);
    await expect(threadLink).toBeVisible();
  });

  test('delete thread shows delete button in toolbar', async ({
    page,
  }) => {
    await resetAllMocks(page);
    await page.goto('/');

    // Create a thread
    const composerInput = page.locator('[aria-label="Prompt"]');
    await composerInput.waitFor({ state: 'visible', timeout: 5000 });
    await composerInput.focus();
    await page.evaluate(() => {
      const el = document.querySelector('[aria-label="Prompt"]') as HTMLElement;
      el.textContent = 'Test message';
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    });
    await page.locator('button:has-text("Send"):not([disabled])').waitFor({ timeout: 5000 });
    await page.locator('button:has-text("Send")').click();
    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });

    // Verify delete button exists
    const deleteButton = page.locator('button[aria-label="Delete thread"]');
    await expect(deleteButton).toBeVisible();
  });

  test('delete only thread navigates to landing', async ({ page }) => {
    await resetAllMocks(page);
    await page.goto('/');

    // Create only thread
    const composerInput = page.locator('[aria-label="Prompt"]');
    await composerInput.waitFor({ state: 'visible', timeout: 5000 });
    await composerInput.focus();
    await page.evaluate(() => {
      const el = document.querySelector('[aria-label="Prompt"]') as HTMLElement;
      el.textContent = 'Only thread';
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    });
    await page.locator('button:has-text("Send"):not([disabled])').waitFor({ timeout: 5000 });
    await page.locator('button:has-text("Send")').click();
    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });

    const url = page.url();
    const threadId = url.split('/t/')[1];

    // Click the delete button (trash icon in the toolbar)
    const deleteButton = page.locator('button[aria-label="Delete thread"]');
    await deleteButton.waitFor({ state: 'visible', timeout: 5000 });
    await deleteButton.click();

    // Confirm the deletion in the alert dialog
    const confirmButton = page.locator('[role="alertdialog"]').locator('button:has-text("Delete")');
    await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
    await confirmButton.click();

    // Should navigate back to landing (/)
    await page.waitForURL('/', { timeout: 5000 });
    expect(page.url()).toContain('localhost');
    expect(page.url()).not.toContain('/t/');
  });

  test('delete active thread navigates to other thread', async ({ page }) => {
    await resetAllMocks(page);

    // Pre-seed two threads via localStorage
    const thread1Id = `thread-${Date.now()}`;
    const thread2Id = `thread-${Date.now() + 1}`;
    const user1MessageId = `user-1-${Date.now()}`;
    const asst1MessageId = `asst-1-${Date.now()}`;
    const user2MessageId = `user-2-${Date.now()}`;
    const asst2MessageId = `asst-2-${Date.now()}`;

    await page.addInitScript(
      ({ storageKey, thread1Id, thread2Id, user1MessageId, asst1MessageId, user2MessageId, asst2MessageId }) => {
        const payload = {
          state: {
            threads: [
              {
                id: thread1Id,
                title: 'Thread One',
                messages: [
                  {
                    id: user1MessageId,
                    role: 'user',
                    text: 'First thread question',
                    meta: {},
                  },
                  {
                    id: asst1MessageId,
                    role: 'assistant',
                    text: 'First thread response',
                    meta: { openaiResponseId: 'resp-1' },
                  },
                ],
                createdAt: new Date().toISOString(),
              },
              {
                id: thread2Id,
                title: 'Thread Two',
                messages: [
                  {
                    id: user2MessageId,
                    role: 'user',
                    text: 'Second thread question',
                    meta: {},
                  },
                  {
                    id: asst2MessageId,
                    role: 'assistant',
                    text: 'Second thread response',
                    meta: { openaiResponseId: 'resp-2' },
                  },
                ],
                createdAt: new Date().toISOString(),
              },
            ],
            activeThreadId: thread1Id,
            settings: {
              apiKey: 'sk-test',
              model: 'gpt-4',
              reasoningEffort: 'none',
              webSearchEnabled: false,
              responseLanguage: 'en',
              translateLanguage: 'English',
              exportDestination: 'local',
              obsidianVaultName: '',
            },
            mode: 'chat',
            isAwaitingResponse: false,
            error: null,
            focus: null,
            composerPrompt: '',
          },
          version: 3,
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
      },
      {
        storageKey: 'coo-test-storage',
        thread1Id,
        thread2Id,
        user1MessageId,
        asst1MessageId,
        user2MessageId,
        asst2MessageId,
      },
    );

    // Navigate to the first thread
    await page.goto(`/t/${thread1Id}`);
    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });

    // Verify we're on thread 1
    let url = page.url();
    expect(url).toContain(`/t/${thread1Id}`);

    // Click delete button
    const deleteButton = page.locator('button[aria-label="Delete thread"]');
    await deleteButton.waitFor({ state: 'visible', timeout: 5000 });
    await deleteButton.click();

    // Confirm deletion
    const confirmButton = page.locator('[role="alertdialog"]').locator('button:has-text("Delete")');
    await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
    await confirmButton.click();

    // Should navigate to the other thread
    await page.waitForURL(`/t/${thread2Id}`, { timeout: 5000 });
    url = page.url();
    expect(url).toContain(`/t/${thread2Id}`);
    expect(url).not.toContain(thread1Id);
  });
});
