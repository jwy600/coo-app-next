import type { Page, Route } from '@playwright/test';
import type {
  ChatResponse,
  BlockActionResponse,
  ApiError,
  BlockAction,
} from '@/types/api';

export interface MockChatResponse {
  text: string;
}

export interface MockBlockActionResponse {
  text: string;
}

/**
 * Predefined mock responses for common scenarios
 */
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
    eli5: { text: 'Think of it like building with LEGO blocks. Each block is a piece that you can put together to make something cool!' },
    translate: { text: '这是一个测试响应。' },
    expand: {
      text: 'React is a component-based, declarative JavaScript library. This concept is fundamental to modern software development. It involves creating modular, reusable components that can be combined in various ways to build complex applications.',
    },
    example: { text: 'For example, imagine you have a shopping cart component that you can use on multiple pages of your website.' },
    rewrite: { text: 'This is the rewritten version of the text with improved clarity and emphasis.' },
    ask: { text: 'Based on the selected text, the answer to your question is: this refers to component-based architecture.' },
  },
  errors: {
    missingApiKey: { error: 'Missing OpenAI API key configuration.' },
    emptyPrompt: { error: 'Please provide a prompt.' },
    tooLong: { error: 'That prompt is a bit too long. Please shorten it.' },
    networkError: { error: "We couldn't reach the assistant. Please try again in a moment." },
    genericError: { error: 'We ran into an issue generating a response. Please try again.' },
  },
};

/**
 * API Mocker class for Playwright E2E tests
 *
 * Intercepts API routes and returns mock responses for deterministic testing.
 *
 * Usage:
 * ```typescript
 * const apiMocker = new ApiMocker(page);
 * await apiMocker.mockChatSuccess({ text: 'Hello!' });
 * ```
 */
export class ApiMocker {
  constructor(private page: Page) {}

  /**
   * Mock successful /api/chat response
   * Supports both streaming (SSE) and non-streaming (JSON) modes
   */
  async mockChatSuccess(response: MockChatResponse): Promise<void> {
    await this.page.route('**/api/chat', async (route: Route) => {
      const request = route.request();
      const requestBody = request.postDataJSON();

      // Check if client requested streaming
      if (requestBody?.stream === true) {
        // Return Server-Sent Events format for streaming requests
        const responseId = 'mock-response-id-' + Date.now();

        // Build SSE response: send tokens, then response_id, then done
        const tokens = response.text.split('');
        let sseBody = '';

        // Send tokens (batch them for efficiency)
        const chunkSize = 10;
        for (let i = 0; i < tokens.length; i += chunkSize) {
          const chunk = tokens.slice(i, i + chunkSize).join('');
          sseBody += `data: ${JSON.stringify({ type: 'token', content: chunk })}\n\n`;
        }

        // Send response_id
        sseBody += `data: ${JSON.stringify({ type: 'response_id', responseId })}\n\n`;

        // Send done signal
        sseBody += `data: ${JSON.stringify({ type: 'done' })}\n\n`;

        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          headers: {
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
          body: sseBody,
        });
      } else {
        // Return JSON for non-streaming requests
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response),
        });
      }
    });
  }

  /**
   * Mock /api/chat error response
   */
  async mockChatError(error: ApiError, status: number = 500): Promise<void> {
    await this.page.route('**/api/chat', (route: Route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(error),
      });
    });
  }

  /**
   * Mock successful /api/block-action response
   */
  async mockBlockActionSuccess(
    action: BlockAction,
    response: MockBlockActionResponse
  ): Promise<void> {
    await this.page.route('**/api/block-action', async (route: Route) => {
      const request = route.request();
      const requestBody = request.postDataJSON();

      // Only mock if the action matches
      if (requestBody?.action === action) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response),
        });
      } else {
        // Fall through to default mock or real endpoint
        await route.continue();
      }
    });
  }

  /**
   * Mock /api/block-action error response
   */
  async mockBlockActionError(error: ApiError, status: number = 500): Promise<void> {
    await this.page.route('**/api/block-action', (route: Route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(error),
      });
    });
  }

  /**
   * Mock all block actions with predefined responses
   */
  async mockAllBlockActions(): Promise<void> {
    await this.page.route('**/api/block-action', async (route: Route) => {
      const request = route.request();
      const requestBody = request.postDataJSON();
      const action = requestBody?.action as BlockAction;

      let response: MockBlockActionResponse;

      switch (action) {
        case 'eli5':
          response = MOCK_RESPONSES.blockAction.eli5;
          break;
        case 'translate':
          response = MOCK_RESPONSES.blockAction.translate;
          break;
        case 'expand':
          response = MOCK_RESPONSES.blockAction.expand;
          break;
        case 'example':
          response = MOCK_RESPONSES.blockAction.example;
          break;
        case 'rewrite':
          response = MOCK_RESPONSES.blockAction.rewrite;
          break;
        case 'ask':
          response = MOCK_RESPONSES.blockAction.ask;
          break;
        default:
          response = { text: 'Mock response for unknown action' };
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  }

  /**
   * Clear all mocked routes
   */
  async clearMocks(): Promise<void> {
    await this.page.unroute('**/api/chat');
    await this.page.unroute('**/api/block-action');
  }

  /**
   * Mock config endpoint (for Supabase config)
   */
  async mockConfig(): Promise<void> {
    await this.page.route('**/api/config', (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          supabaseUrl: 'https://test.supabase.co',
          supabaseAnonKey: 'test-anon-key',
        }),
      });
    });
  }
}

/**
 * Helper to wait for API response
 */
export async function waitForApiResponse(
  page: Page,
  endpoint: '/api/chat' | '/api/block-action',
  timeout: number = 5000
): Promise<void> {
  await page.waitForResponse(
    (response) => response.url().includes(endpoint) && response.status() === 200,
    { timeout }
  );
}
