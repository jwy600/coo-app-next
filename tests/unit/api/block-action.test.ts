import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/block-action/route';
import { NextRequest } from 'next/server';
import { setupTestEnv, clearTestEnv, createMockCompletion } from './setup';
import { BLOCK_ACTION_PROMPT } from '@/lib/config/openai';

// Create mock function that can be imported
const mockCreate = vi.fn();

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

describe('Block Action API Route', () => {
  beforeEach(() => {
    setupTestEnv();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearTestEnv();
  });

  describe('Translate action', () => {
    it('should translate text to Chinese', async () => {
      mockCreate.mockResolvedValue(createMockCompletion('你好世界'));

      const request = new NextRequest('http://localhost:3000/api/block-action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'translate',
          blockText: 'Hello world',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe('你好世界');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5-mini',
          messages: [
            { role: 'system', content: BLOCK_ACTION_PROMPT },
            { role: 'user', content: 'Translate into Chinese:\n\nHello world' },
          ],
        })
      );
    });
  });

  describe('Settings support', () => {
    it('should use model from settings when provided', async () => {
      mockCreate.mockResolvedValue(createMockCompletion('Translated text'));

      const request = new NextRequest('http://localhost:3000/api/block-action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'translate',
          blockText: 'Hello world',
          settings: {
            model: 'gpt-5.2',
            reasoningEffort: 'none',
            webSearchEnabled: false,
            translateLanguage: 'Chinese',
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe('Translated text');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5.2',
        })
      );
    });

    it('should fall back to default model when settings not provided', async () => {
      mockCreate.mockResolvedValue(createMockCompletion('Translated text'));

      const request = new NextRequest('http://localhost:3000/api/block-action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'translate',
          blockText: 'Hello world',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5-mini',
        })
      );
    });
  });

  describe('Example action', () => {
    it('should provide example for text', async () => {
      mockCreate.mockResolvedValue(createMockCompletion('For example: ...'));

      const request = new NextRequest('http://localhost:3000/api/block-action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'example',
          blockText: 'Recursion is a programming technique',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe('For example: ...');
    });
  });

  describe('Expand action', () => {
    it('should expand text with detail', async () => {
      mockCreate.mockResolvedValue(createMockCompletion('Detailed expansion...'));

      const request = new NextRequest('http://localhost:3000/api/block-action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'expand',
          blockText: 'AI is transforming software',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe('Detailed expansion...');
    });
  });

  describe('ELI5 action', () => {
    it('should explain like I\'m five', async () => {
      mockCreate.mockResolvedValue(createMockCompletion('Imagine a toy that...'));

      const request = new NextRequest('http://localhost:3000/api/block-action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'eli5',
          blockText: 'Quantum entanglement occurs when...',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe('Imagine a toy that...');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: BLOCK_ACTION_PROMPT },
            { role: 'user', content: 'Explain this like I\'m five:\n\nQuantum entanglement occurs when...' },
          ],
        })
      );
    });
  });

  describe('Rewrite action', () => {
    it('should rewrite emphasizing highlighted phrases', async () => {
      mockCreate.mockResolvedValue(createMockCompletion('Rewritten with emphasis...'));

      const request = new NextRequest('http://localhost:3000/api/block-action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'rewrite',
          blockText: 'The cat sat on the mat',
          prompt: 'cat, mat',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe('Rewritten with emphasis...');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: BLOCK_ACTION_PROMPT },
            { role: 'user', content: expect.stringContaining('Phrases to incorporate: cat, mat') },
          ],
        })
      );
    });

    it('should return 400 when prompt is missing for rewrite', async () => {
      const request = new NextRequest('http://localhost:3000/api/block-action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'rewrite',
          blockText: 'The cat sat on the mat',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing prompt for block action.');
    });
  });

  describe('Ask action', () => {
    it('should answer question about paragraph', async () => {
      mockCreate.mockResolvedValue(createMockCompletion('The answer is...'));

      const request = new NextRequest('http://localhost:3000/api/block-action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'ask',
          blockText: 'React is a JavaScript library for building user interfaces.',
          prompt: 'What is React?',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe('The answer is...');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: BLOCK_ACTION_PROMPT },
            { role: 'user', content: 'Text: "React is a JavaScript library for building user interfaces."\n\nQuestion: What is React?' },
          ],
        })
      );
    });

    it('should return 400 when prompt is missing for ask', async () => {
      const request = new NextRequest('http://localhost:3000/api/block-action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'ask',
          blockText: 'Some text',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing prompt for block action.');
    });
  });

  describe('Validation', () => {
    it('should return 400 for missing action', async () => {
      const request = new NextRequest('http://localhost:3000/api/block-action', {
        method: 'POST',
        body: JSON.stringify({
          blockText: 'Some text',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing block action input.');
    });

    it('should return 400 for missing blockText', async () => {
      const request = new NextRequest('http://localhost:3000/api/block-action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'translate',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing block action input.');
    });

    it('should return 400 for unsupported action', async () => {
      const request = new NextRequest('http://localhost:3000/api/block-action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'invalid',
          blockText: 'Some text',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Unsupported action.');
    });

    it('should return 400 for prompt too long', async () => {
      const longText = 'a'.repeat(4000);
      const request = new NextRequest('http://localhost:3000/api/block-action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'translate',
          blockText: longText,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('That request is a bit too long. Please shorten it.');
    });

    it('should return 500 when OpenAI API key is missing', async () => {
      delete process.env.OPENAI_API_KEY;

      const request = new NextRequest('http://localhost:3000/api/block-action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'translate',
          blockText: 'Hello',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Missing OpenAI API key configuration.');
    });
  });

  describe('Error handling', () => {
    it('should handle OpenAI API errors', async () => {
      const error = new Error('API Error');
      (error as any).status = 500;
      mockCreate.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/block-action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'translate',
          blockText: 'Hello',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("We couldn't reach the assistant. Please try again in a moment.");
    });
  });
});
