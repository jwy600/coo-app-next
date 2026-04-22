import { test, expect } from '../utils/test-fixtures';
import type { Route } from '@playwright/test';
import { LandingPage } from '../page-objects/LandingPage';
import { ChatPage } from '../page-objects/ChatPage';
import { ApiMocker } from '../utils/api-mocks';
import type { ResponsesRequest } from '../utils/api-mocks';

/**
 * Ask-chain context threading (commits 437bae3 + 4cf2448).
 *
 * When the user asks a follow-up question on the same block, the second
 * request should:
 *   - carry `previous_response_id` = the ID OpenAI returned for the first
 *     ask, and
 *   - omit the "Answer the following question…" preamble (the raw question
 *     goes in `input` so the model resolves it against the chained prior
 *     answer).
 *
 * The chain is scoped per block and invalidated when the block's grounding
 * changes (edit / rewrite / selection / strikethrough / switching block).
 */

const ASK_PREAMBLE = 'Answer the following question';

/**
 * Install a route that fulfils non-streaming ask requests with sequential
 * IDs (`ask-resp-0`, `ask-resp-1`, …) so tests can assert exact chain
 * relationships. Streaming (chat) and non-ask block actions fall back.
 */
async function installSequentialAskRoute(
  page: import('@playwright/test').Page,
  issuedIds: string[],
): Promise<void> {
  await page.route('**/api.openai.com/v1/responses', async (route: Route) => {
    const body = route.request().postDataJSON() as ResponsesRequest | null;
    if (body?.stream) {
      await route.fallback();
      return;
    }
    const isAsk =
      body?.input?.includes(ASK_PREAMBLE) || !!body?.previous_response_id;
    if (!isAsk) {
      await route.fallback();
      return;
    }
    const id = `ask-resp-${issuedIds.length}`;
    issuedIds.push(id);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id,
        output_text: `A${issuedIds.length}: follow-up answer`,
      }),
    });
  });
}

test.describe('Ask chain - per-block context threading', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;
  let apiMocker: ApiMocker;
  let captured: ResponsesRequest[];
  let issuedIds: string[];

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);
    apiMocker = new ApiMocker(page);
    issuedIds = [];

    // Chat seed: give the thread two blocks for cross-block isolation tests.
    await apiMocker.mockChatSuccess({
      text: `React is a JavaScript library for building user interfaces.

React uses a component-based architecture.`,
    });

    captured = apiMocker.captureResponseRequests();
    await installSequentialAskRoute(page, issuedIds);

    await landingPage.goto();
    await landingPage.submitFirstPrompt('Explain React');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  /** Ask a question on the currently selected block. */
  async function ask(question: string): Promise<void> {
    await chatPage.clearPrompt();
    await chatPage.typePrompt(question);

    const responsePromise = chatPage.page.waitForResponse(
      (r) =>
        r.url().includes('api.openai.com/v1/responses') &&
        !r.request().postDataJSON()?.stream,
      { timeout: 10000 },
    );
    await chatPage.sendButton.click();
    await responsePromise;
    await chatPage.page.waitForTimeout(100);
  }

  /** Filter captured requests to just the ask calls. */
  function askRequests(): ResponsesRequest[] {
    return captured.filter(
      (r) =>
        !r.stream &&
        (r.input?.includes(ASK_PREAMBLE) || !!r.previous_response_id),
    );
  }

  test('first ask includes preamble and has no previous_response_id', async () => {
    await chatPage.selectBlock(0);
    await ask('What is this?');

    const asks = askRequests();
    expect(asks).toHaveLength(1);
    expect(asks[0].input).toContain(ASK_PREAMBLE);
    expect(asks[0].previous_response_id ?? null).toBeNull();
  });

  test('follow-up ask chains previous_response_id and drops the preamble', async () => {
    await chatPage.selectBlock(0);
    await ask('What is this?');
    await ask('Can you elaborate?');

    const asks = askRequests();
    expect(asks).toHaveLength(2);
    expect(asks[1].previous_response_id).toBe(issuedIds[0]);
    expect(asks[1].input).not.toContain(ASK_PREAMBLE);
    expect(asks[1].input).toBe('Can you elaborate?');
  });

  test('switching blocks invalidates the chain', async () => {
    await chatPage.selectBlock(0);
    await ask('Question on block 0');

    await chatPage.selectBlock(1);
    await ask('Question on block 1');

    const asks = askRequests();
    expect(asks).toHaveLength(2);
    expect(asks[1].previous_response_id ?? null).toBeNull();
    expect(asks[1].input).toContain(ASK_PREAMBLE);
  });

  test('deselecting then re-selecting the same block invalidates the chain', async ({
    page,
  }) => {
    await chatPage.selectBlock(0);
    await ask('Initial question');

    await page.keyboard.press('Escape');
    await chatPage.selectBlock(0);

    await ask('Second question');

    const asks = askRequests();
    expect(asks).toHaveLength(2);
    expect(asks[1].previous_response_id ?? null).toBeNull();
  });
});
