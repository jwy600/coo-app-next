/**
 * Task 7.2: Persistence & Migration Tests
 *
 * Tests:
 * 1. Reload preserves persisted state: send message, stream reply, reload, assert both still present
 * 2. UI state is reset on reload: open editor, reload, assert editor is closed
 * 3. v2 → v3 migration: write v2 payload (block/card model), navigate, assert joined messages + v3 schema
 * 4. v1 → v2 → v3 migration: write v1 payload, navigate, assert compounded migration succeeds
 * 5. Migration is idempotent: write v3 payload, navigate, reload, assert no diff
 */

import { test, expect } from '../../utils/test-fixtures';
import { resetAllMocks, setMockResponse } from '../../utils/mock-bridge';
import { FocusEditorPO } from '../../page-objects/FocusEditorPO';
import { dragSelectRange } from '../../utils/select';
import { v1Payload, v2Payload, v3Payload, sampleThread } from '../../utils/legacy-fixtures';

test('reload preserves persisted state: thread + messages survive page reload', async ({
  page,
}) => {
  await resetAllMocks(page);
  await page.goto('/');

  // Send a message via the composer
  const composerInput = page.locator('[aria-label="Prompt"]');
  await composerInput.waitFor({ state: 'visible', timeout: 5000 });

  await composerInput.focus();
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Prompt"]') as HTMLElement;
    el.textContent = 'Test persistence';
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
  });

  // Mock the chat response
  await setMockResponse(page, 'chat', 'Test persistence', 'This is a streamed reply that should persist.');

  await page.locator('button:has-text("Send"):not([disabled])').waitFor({ timeout: 5000 });
  await page.locator('button:has-text("Send")').click();

  // Wait for assistant message
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });

  // Capture the thread structure before reload
  const threadBeforeReload = await page.evaluate(() => {
    const stored = localStorage.getItem('coo-test-storage');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.state.threads[0];
  });

  expect(threadBeforeReload).toBeTruthy();
  expect(threadBeforeReload.messages.length).toBeGreaterThanOrEqual(2); // user + assistant

  // Reload the page
  await page.reload();

  // Wait for the restored thread to render
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });

  // Verify the thread and messages are still there
  const threadAfterReload = await page.evaluate(() => {
    const stored = localStorage.getItem('coo-test-storage');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.state.threads[0];
  });

  expect(threadAfterReload).toBeTruthy();
  expect(threadAfterReload.messages.length).toBe(threadBeforeReload.messages.length);
  expect(threadAfterReload.messages[0].text).toBe('Test persistence');
  expect(threadAfterReload.messages[1].text).toContain('streamed reply');
});

test('UI state is reset on reload: focus editor closes, focus state is null', async ({
  page,
}) => {
  await resetAllMocks(page);

  const threadId = `thread-${Date.now()}`;
  const messageId = `msg-${Date.now()}`;

  await page.addInitScript(
    ({ storageKey, threadId, messageId }) => {
      const payload = {
        state: {
          threads: [
            {
              id: threadId,
              title: 'Test Thread',
              messages: [
                {
                  id: messageId,
                  threadId: threadId,
                  role: 'assistant',
                  text: 'React is a JavaScript library for building user interfaces.',
                  createdAt: Date.now(),
                  meta: { openaiResponseId: 'resp-123' },
                },
              ],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
          activeThreadId: threadId,
          settings: {
            apiKey: 'sk-test',
            model: 'gpt-4',
            reasoningEffort: 'none',
            webSearchEnabled: false,
            responseLanguage: 'en',
            translateLanguage: 'Chinese',
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
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    },
    { storageKey: 'coo-test-storage', threadId, messageId },
  );

  await page.goto(`/t/${threadId}`);
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });

  // Open the focus editor via drag-select
  await dragSelectRange(page, messageId, 0, 20);

  const editor = new FocusEditorPO(page);
  await editor.waitForOpen();

  const isOpenBefore = await editor.isOpen();
  expect(isOpenBefore).toBe(true);

  // Reload the page
  await page.reload();

  // Wait for the thread to re-render
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });

  // Assert editor is closed
  const isOpenAfter = await editor.isOpen();
  expect(isOpenAfter).toBe(false);

  // Assert focus state in localStorage is null or undefined (not persisted)
  const state = await page.evaluate(() => {
    const stored = localStorage.getItem('coo-test-storage');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.state.focus;
  });

  expect(state == null).toBe(true);
});

test('v2 payload migrates to v3: blocks array removed, messages joined into text', async ({
  page,
}) => {
  await resetAllMocks(page);

  const thread = sampleThread();
  const threadId = thread.id;

  // Build a v2 payload with top-level blocks and cards arrays
  const v2Payload_data = v2Payload({ threads: [thread], activeThreadId: threadId });

  await page.addInitScript(
    ({ storageKey, payload }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    },
    { storageKey: 'coo-test-storage', payload: v2Payload_data },
  );

  // Navigate to the thread
  await page.goto(`/t/${threadId}`);
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });

  // Check the persisted state is now v3
  const migratedState = await page.evaluate(() => {
    const stored = localStorage.getItem('coo-test-storage');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return {
      version: parsed.version,
      hasToplevelBlocks: 'blocks' in parsed.state,
      hasToplevelCards: 'cards' in parsed.state,
      messagesHaveText: parsed.state.threads[0]?.messages?.every(
        (m: any) => typeof m.text === 'string',
      ),
    };
  });

  expect(migratedState).not.toBeNull();
  expect(migratedState!.version).toBe(3);
  expect(migratedState!.hasToplevelBlocks).toBe(false);
  expect(migratedState!.hasToplevelCards).toBe(false);
  expect(migratedState!.messagesHaveText).toBe(true);
});

test('v1 payload migrates through v2 → v3: settings shape fixed + blocks joined', async ({
  page,
}) => {
  await resetAllMocks(page);

  const thread = sampleThread();
  const threadId = thread.id;

  // Build a v1 payload (has obsidianVaultPath instead of obsidianVaultName)
  const v1Payload_data = v1Payload({ threads: [thread], activeThreadId: threadId });

  // Verify v1 has the legacy settings shape
  expect((v1Payload_data.state.settings as any).obsidianVaultPath).toBeDefined();
  expect((v1Payload_data.state.settings as any).obsidianVaultName).toBeUndefined();

  await page.addInitScript(
    ({ storageKey, payload }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    },
    { storageKey: 'coo-test-storage', payload: v1Payload_data },
  );

  // Navigate
  await page.goto(`/t/${threadId}`);
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });

  // Check compounded migration: v1 → v2 (settings), v2 → v3 (blocks → text)
  const finalState = await page.evaluate(() => {
    const stored = localStorage.getItem('coo-test-storage');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const settings = parsed.state.settings;
    return {
      version: parsed.version,
      hasVaultPath: 'obsidianVaultPath' in settings,
      hasVaultName: 'obsidianVaultName' in settings,
      vaultName: settings.obsidianVaultName,
      messagesHaveText: parsed.state.threads[0]?.messages?.every(
        (m: any) => typeof m.text === 'string',
      ),
      hasToplevelBlocks: 'blocks' in parsed.state,
    };
  });

  expect(finalState).not.toBeNull();
  expect(finalState!.version).toBe(3);
  expect(finalState!.hasVaultPath).toBe(false); // v1 → v2 migration removed this
  expect(finalState!.hasVaultName).toBe(true); // replaced with this
  expect(finalState!.vaultName).toBe(''); // default empty string
  expect(finalState!.messagesHaveText).toBe(true); // v2 → v3 joined blocks into text
  expect(finalState!.hasToplevelBlocks).toBe(false); // removed in v3
});

test('migration is idempotent: v3 payload unchanged after navigate + reload', async ({
  page,
}) => {
  await resetAllMocks(page);

  const thread = sampleThread();
  const threadId = thread.id;
  const v3Payload_data = v3Payload({ threads: [thread], activeThreadId: threadId });

  await page.addInitScript(
    ({ storageKey, payload }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    },
    { storageKey: 'coo-test-storage', payload: v3Payload_data },
  );

  // Navigate to trigger rehydration
  await page.goto(`/t/${threadId}`);
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });

  // Capture post-navigation state
  const stateAfterNavigate = await page.evaluate(() => {
    const stored = localStorage.getItem('coo-test-storage');
    if (!stored) return null;
    return JSON.stringify(JSON.parse(stored));
  });

  // Reload
  await page.reload();
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 5000 });

  // Capture post-reload state
  const stateAfterReload = await page.evaluate(() => {
    const stored = localStorage.getItem('coo-test-storage');
    if (!stored) return null;
    return JSON.stringify(JSON.parse(stored));
  });

  // Both should be identical (idempotent)
  expect(stateAfterReload).toBe(stateAfterNavigate);
});
