import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/chat/route';
import { NextRequest } from 'next/server';
import { setupTestEnv, clearTestEnv, createMockResponse } from './setup';

// Create mock function for Responses API
const mockResponsesCreate = vi.fn();

// Mock OpenAI with Responses API
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      responses = {
        create: mockResponsesCreate,
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

  it('should return chat response for valid request', async () => {
    // Setup mock
    mockResponsesCreate.mockResolvedValue(createMockResponse('Hello! How can I help?', 'resp_abc123'));

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
    expect(data).toEqual({ text: 'Hello! How can I help?', responseId: 'resp_abc123' });
    expect(mockResponsesCreate).toHaveBeenCalledWith({
      model: 'gpt-5-mini',
      input: 'Hello',
      instructions: expect.stringContaining('You are a knowledgeable assistant'),
      store: true,
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
    mockResponsesCreate.mockResolvedValue({
      id: 'resp_test',
      output_text: '',
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
    mockResponsesCreate.mockRejectedValue(error);

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
    mockResponsesCreate.mockResolvedValue(createMockResponse('Response'));

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt: '  Hello World  ' }),
    });

    await POST(request);

    expect(mockResponsesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        input: 'Hello World',
      })
    );
  });

  it('should pass previousResponseId when provided', async () => {
    mockResponsesCreate.mockResolvedValue(createMockResponse('Follow-up response', 'resp_def456'));

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'What did you mean by that?',
        previousResponseId: 'resp_abc123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.responseId).toBe('resp_def456');
    expect(mockResponsesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        previous_response_id: 'resp_abc123',
      })
    );
  });
});
