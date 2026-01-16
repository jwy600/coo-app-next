import { vi } from 'vitest';

/**
 * Mock OpenAI API responses for testing
 */
export function mockOpenAI() {
  const mockCreate = vi.fn();

  const mockOpenAIInstance = {
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  };

  // Mock the OpenAI constructor
  vi.mock('openai', () => ({
    default: vi.fn(() => mockOpenAIInstance),
  }));

  return { mockCreate, mockOpenAIInstance };
}

/**
 * Create a mock OpenAI completion response
 */
export function createMockCompletion(text: string) {
  return {
    choices: [
      {
        message: {
          content: text,
          role: 'assistant',
        },
        finish_reason: 'stop',
        index: 0,
      },
    ],
    created: Date.now(),
    id: 'chatcmpl-test',
    model: 'gpt-4o-mini',
    object: 'chat.completion',
  };
}

/**
 * Set environment variables for testing
 */
export function setupTestEnv() {
  process.env.OPENAI_API_KEY = 'test-api-key';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-anon-key';
}

/**
 * Clear environment variables after testing
 */
export function clearTestEnv() {
  delete process.env.OPENAI_API_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}
