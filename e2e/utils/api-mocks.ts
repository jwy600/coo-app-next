/**
 * E2E API mocks.
 *
 * Intercepts calls to the OpenAI Responses API
 * (`https://api.openai.com/v1/responses`) so tests run deterministically
 * without real API keys or network flakiness.
 *
 * The app calls OpenAI directly from the browser via the official `openai`
 * SDK (`dangerouslyAllowBrowser: true`), so we mock at the HTTP boundary.
 *
 * For streaming requests (chat), we return a Server-Sent Events body with
 * the event types the SDK emits from the Responses API stream:
 *   - response.created          → carries response.id
 *   - response.output_text.delta → carries a text delta
 *   - response.completed
 *
 * For non-streaming requests (block actions), we return a JSON body with
 * `output_text` and `id`.
 */

import type { Page, Route } from '@playwright/test';
import type { ApiError, BlockAction } from '@/types/api';

const OPENAI_RESPONSES_URL = '**/api.openai.com/v1/responses';

interface MockTextResponse {
  text: string;
}

export const MOCK_RESPONSES = {
  chat: {
    simple: { text: 'This is a test response from the AI.' },
    markdown: {
      text: `# Introduction\n\nThis is a paragraph with **bold** and *italic* text.\n\n- Item 1\n- Item 2\n\n\`\`\`javascript\nconst foo = 'bar';\n\`\`\``,
    },
    multiBlock: {
      text: `React is a JavaScript library for building user interfaces.\n\nIt was created by Facebook and is now maintained by Meta.\n\nReact uses a component-based architecture.`,
    },
  },
  blockAction: {
    eli5: {
      text: "Think of it like building with LEGO blocks. Each block is a piece that you can put together to make something cool!",
    },
    translate: { text: '这是一个测试响应。' },
    expand: {
      text: 'React is a component-based, declarative JavaScript library. This concept is fundamental to modern software development. It involves creating modular, reusable components that can be combined in various ways to build complex applications.',
    },
    example: {
      text: 'For example, imagine you have a shopping cart component that you can use on multiple pages of your website.',
    },
    rewrite: {
      text: 'This is the rewritten version of the text with improved clarity and emphasis.',
    },
    summarize: {
      text: 'A short summary of the original passage.',
    },
    ask: {
      text: 'Based on the selected text, the answer to your question is: this refers to component-based architecture.',
    },
  },
  errors: {
    missingApiKey: { error: 'Missing OpenAI API key configuration.' },
    emptyPrompt: { error: 'Please provide a prompt.' },
    tooLong: { error: 'That prompt is a bit too long. Please shorten it.' },
    networkError: {
      error: "We couldn't reach the assistant. Please try again in a moment.",
    },
    genericError: {
      error: 'We ran into an issue generating a response. Please try again.',
    },
  },
};

const randomId = () => `resp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Build an SSE body that matches the OpenAI Responses API stream format the
 * `openai` SDK consumes. The SDK parses lines starting with `data: ` and
 * dispatches events by `type` field.
 */
const buildStreamingBody = (text: string, responseId: string): string => {
  const chunkSize = 10;
  const events: string[] = [];

  events.push(
    `event: response.created\ndata: ${JSON.stringify({
      type: 'response.created',
      response: { id: responseId },
    })}\n\n`,
  );

  for (let i = 0; i < text.length; i += chunkSize) {
    const delta = text.slice(i, i + chunkSize);
    events.push(
      `event: response.output_text.delta\ndata: ${JSON.stringify({
        type: 'response.output_text.delta',
        delta,
      })}\n\n`,
    );
  }

  events.push(
    `event: response.completed\ndata: ${JSON.stringify({
      type: 'response.completed',
      response: { id: responseId, output_text: text },
    })}\n\n`,
  );

  return events.join('');
};

/**
 * API Mocker — intercepts calls to the OpenAI Responses endpoint.
 *
 * Streaming requests (the chat flow) get an SSE body.
 * Non-streaming requests (block actions) get a JSON body shaped like a
 * Responses API result.
 *
 * Handlers registered later take precedence, so tests can re-mock the same
 * endpoint mid-run (e.g. success after an initial error) without calling
 * `clearMocks()`.
 */
export class ApiMocker {
  constructor(private page: Page) {}

  /** Mock a streaming OpenAI response with the given assistant text. */
  async mockChatSuccess(response: MockTextResponse): Promise<void> {
    await this.page.route(OPENAI_RESPONSES_URL, async (route: Route) => {
      const body = route.request().postDataJSON() as { stream?: boolean } | null;

      if (body?.stream) {
        const responseId = randomId();
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          headers: { 'cache-control': 'no-cache', connection: 'keep-alive' },
          body: buildStreamingBody(response.text, responseId),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: randomId(),
            output_text: response.text,
          }),
        });
      }
    });
  }

  /**
   * Mock an error response for every OpenAI call.
   * Matches the OpenAI error envelope so the SDK surfaces the message.
   */
  async mockChatError(error: ApiError, status: number = 500): Promise<void> {
    await this.page.route(OPENAI_RESPONSES_URL, (route: Route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: error.error,
            type: 'api_error',
          },
        }),
      });
    });
  }

  /**
   * Mock a single block action by looking at the request body. Block actions
   * are identified by the `input` text, which embeds the action preamble
   * ("Explain the following text like I'm 5:", etc.). We return a JSON
   * Responses API payload.
   */
  async mockBlockActionSuccess(
    action: BlockAction,
    response: MockTextResponse,
  ): Promise<void> {
    await this.page.route(OPENAI_RESPONSES_URL, async (route: Route) => {
      const body = route.request().postDataJSON() as {
        input?: string;
        stream?: boolean;
      } | null;

      // Only intercept non-streaming block action requests whose input
      // contains the preamble for the target action.
      if (body?.stream || !matchesAction(body?.input ?? '', action)) {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: randomId(), output_text: response.text }),
      });
    });
  }

  async mockBlockActionError(
    error: ApiError,
    status: number = 500,
  ): Promise<void> {
    await this.page.route(OPENAI_RESPONSES_URL, (route: Route) => {
      const body = route.request().postDataJSON() as {
        stream?: boolean;
      } | null;

      if (body?.stream) {
        route.fallback();
        return;
      }

      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: error.error,
            type: 'api_error',
          },
        }),
      });
    });
  }

  /**
   * Mock every block action in one go. Useful when a spec exercises multiple
   * actions without caring about the specific transform content.
   */
  async mockAllBlockActions(): Promise<void> {
    await this.page.route(OPENAI_RESPONSES_URL, async (route: Route) => {
      const body = route.request().postDataJSON() as {
        input?: string;
        stream?: boolean;
      } | null;

      if (body?.stream) {
        await route.fallback();
        return;
      }

      const action = detectActionFromInput(body?.input ?? '');
      const response = action
        ? MOCK_RESPONSES.blockAction[action]
        : { text: 'Mock response for unknown action' };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: randomId(), output_text: response.text }),
      });
    });
  }

  async clearMocks(): Promise<void> {
    await this.page.unroute(OPENAI_RESPONSES_URL);
  }

  /**
   * Mock the background thread-title generator call. The title generator is a
   * non-streaming call to `gpt-5.4-mini` with a short instruction; we match by
   * `model` in the request body so it composes with chat mocks.
   *
   * NOTE: `lib/api/generateThreadTitle.ts` short-circuits in test mode, so
   * tests that exercise the title-gen flow must disable that short-circuit
   * (e.g. seed a real-looking settings object and flip the test-mode flag
   * off for that spec).
   */
  async mockTitleGeneration(title: string): Promise<void> {
    await this.page.route(OPENAI_RESPONSES_URL, async (route: Route) => {
      const body = route.request().postDataJSON() as {
        model?: string;
        stream?: boolean;
      } | null;

      if (body?.stream || body?.model !== 'gpt-5.4-mini') {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: randomId(), output_text: title }),
      });
    });
  }

  /**
   * Capture every OpenAI Responses API request body for later assertions
   * (e.g. checking that a follow-up ask carries `previous_response_id`).
   *
   * Returns an array that is mutated in place as requests arrive.
   */
  captureResponseRequests(): ResponsesRequest[] {
    const captured: ResponsesRequest[] = [];
    this.page.on('request', (request) => {
      if (!request.url().includes('api.openai.com/v1/responses')) return;
      const body = request.postDataJSON() as ResponsesRequest | null;
      if (body) captured.push(body);
    });
    return captured;
  }

  /**
   * Capture `obsidian://new?…` URIs triggered by the anchor-click export flow.
   * Installs an init script that patches `HTMLAnchorElement.prototype.click`
   * so clicks on `obsidian:` hrefs push into `window.__OBSIDIAN_URIS__`
   * instead of attempting navigation.
   *
   * Call `readCapturedObsidianUris()` to drain the queue.
   */
  async captureObsidianUri(): Promise<void> {
    await this.page.addInitScript(() => {
      (window as unknown as { __OBSIDIAN_URIS__: string[] }).__OBSIDIAN_URIS__ = [];
      const original = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        if (this.href?.startsWith('obsidian:')) {
          (
            window as unknown as { __OBSIDIAN_URIS__: string[] }
          ).__OBSIDIAN_URIS__.push(this.href);
          return;
        }
        return original.call(this);
      };
    });
  }

  async readCapturedObsidianUris(): Promise<string[]> {
    return await this.page.evaluate(
      () =>
        (window as unknown as { __OBSIDIAN_URIS__?: string[] })
          .__OBSIDIAN_URIS__ ?? [],
    );
  }
}

export interface ResponsesRequest {
  model?: string;
  input?: string;
  instructions?: string;
  stream?: boolean;
  previous_response_id?: string | null;
  [key: string]: unknown;
}

const ACTION_MARKERS: Record<BlockAction, (input: string) => boolean> = {
  eli5: (input) => input.includes("Explain the following text like I'm 5"),
  example: (input) => input.includes('Give a concrete example'),
  expand: (input) => input.includes('Expand the following text'),
  summarize: (input) => input.includes('Summarize the following text'),
  rewrite: (input) => input.includes('Rewrite the following text'),
  ask: (input) => input.includes('Answer the following question'),
  // `translate` has no preamble in the input; it is driven by `instructions`
  // so we match anything that is not another action.
  translate: (input) =>
    !input.includes("Explain the following text like I'm 5") &&
    !input.includes('Give a concrete example') &&
    !input.includes('Expand the following text') &&
    !input.includes('Summarize the following text') &&
    !input.includes('Rewrite the following text') &&
    !input.includes('Answer the following question'),
};

const matchesAction = (input: string, action: BlockAction): boolean =>
  ACTION_MARKERS[action](input);

const detectActionFromInput = (input: string): BlockAction | null => {
  const actions: BlockAction[] = ['eli5', 'example', 'expand', 'rewrite', 'ask'];
  for (const a of actions) {
    if (ACTION_MARKERS[a](input)) return a;
  }
  // Default to translate if no preamble matches (translate has no preamble).
  return 'translate';
};
