import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/chat/route';
import { NextRequest } from 'next/server';
import { setupTestEnv, clearTestEnv, createMockCompletion } from './setup';

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

describe('Chat API Route', () => {
  beforeEach(() => {
    setupTestEnv();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearTestEnv();
  });

  it('should return chat completion for valid request', async () => {
    // Setup mock
    mockCreate.mockResolvedValue(createMockCompletion('Hello! How can I help?'));

    // Create request
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello' }),
    });

    // Call API
    const response = await POST(request);
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(200);
    expect(data).toEqual({ text: 'Hello! How can I help?' });
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [{ role: 'user', content: 'Hello' }],
    });
  });

  it('should return 400 for missing prompt', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Please provide a prompt.');
  });

  it('should return 400 for empty prompt', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: '   ' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Please provide a prompt.');
  });

  it('should return 400 for prompt too long', async () => {
    const longPrompt = 'a'.repeat(4001);
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: longPrompt }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('That prompt is a bit too long. Please shorten it.');
  });

  it('should return 500 when OpenAI API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Missing OpenAI API key configuration.');
  });

  it('should return 500 when OpenAI returns no text', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '', role: 'assistant' } }],
    });

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("The assistant didn't return any text.");
  });

  it('should handle OpenAI API errors', async () => {
    const error = new Error('API Error');
    (error as any).status = 500;
    mockCreate.mockRejectedValue(error);

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hello' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("We couldn't reach the assistant. Please try again in a moment.");
  });

  it('should trim whitespace from prompt', async () => {
    mockCreate.mockResolvedValue(createMockCompletion('Response'));

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: '  Hello World  ' }),
    });

    await POST(request);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: 'user', content: 'Hello World' }],
      })
    );
  });
});
