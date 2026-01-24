import { apiFetch } from './client';
import type { ChatRequest, ChatResponse, TitleRequest, TitleResponse } from '@/types/api';
import type { Settings } from '@/types/settings';
import { validatePrompt } from '@/lib/utils/validation';

/**
 * Fetch chat completion from OpenAI
 *
 * @param prompt - User prompt text
 * @param threadId - Optional thread ID for context
 * @param previousResponseId - Optional response ID for contextual chaining
 * @param settings - Optional settings for model, reasoning, and web search
 * @returns Promise with AI response text and response ID
 * @throws ApiClientError on validation or API errors
 */
export async function fetchChatCompletion(
  prompt: string,
  threadId?: string,
  previousResponseId?: string,
  settings?: Settings
): Promise<ChatResponse> {
  // Validate prompt
  const trimmedPrompt = prompt.trim();
  const validation = validatePrompt(trimmedPrompt);

  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid prompt');
  }

  // Build request
  const requestBody: ChatRequest = {
    prompt: trimmedPrompt,
    threadId,
    mode: 'thread',
    previousResponseId,
    settings,
  };

  // Call API
  return apiFetch<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });
}

/**
 * Callbacks for streaming chat completion
 */
export interface StreamChatCallbacks {
  onToken: (token: string) => void;
  onResponseId: (responseId: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

/**
 * Fetch chat completion with streaming from OpenAI
 * Response tokens are delivered via callbacks as they arrive
 *
 * @param prompt - User prompt text
 * @param callbacks - Event handlers for stream events
 * @param threadId - Optional thread ID for context
 * @param previousResponseId - Optional response ID for contextual chaining
 * @param settings - Optional settings for model, reasoning, and web search
 */
export async function fetchChatCompletionStream(
  prompt: string,
  callbacks: StreamChatCallbacks,
  threadId?: string,
  previousResponseId?: string,
  settings?: Settings
): Promise<void> {
  // Validate prompt
  const trimmedPrompt = prompt.trim();
  const validation = validatePrompt(trimmedPrompt);

  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid prompt');
  }

  // Build request with streaming enabled
  const requestBody: ChatRequest = {
    prompt: trimmedPrompt,
    threadId,
    mode: 'thread',
    previousResponseId,
    stream: true,
    settings,
  };

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(errorData.error || 'Request failed');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body available');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let consecutiveParseFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 10;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Process remaining buffer
          if (buffer.trim()) {
            const result = processStreamBuffer(buffer, callbacks);
            consecutiveParseFailures = result.hadParseError
              ? consecutiveParseFailures + 1
              : 0;
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Split on double newline (SSE separator)
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const result = processStreamBuffer(part, callbacks);
          if (result.hadParseError) {
            consecutiveParseFailures++;
            if (consecutiveParseFailures >= MAX_CONSECUTIVE_FAILURES) {
              throw new Error(
                `Stream corrupted: ${MAX_CONSECUTIVE_FAILURES} consecutive parse failures`
              );
            }
          } else {
            consecutiveParseFailures = 0;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    callbacks.onError(error as Error);
  }
}

interface ProcessBufferResult {
  hadParseError: boolean;
}

/**
 * Process SSE buffer and dispatch to callbacks
 * Returns whether any parse errors occurred for error threshold tracking
 */
function processStreamBuffer(
  data: string,
  callbacks: StreamChatCallbacks
): ProcessBufferResult {
  const lines = data.split('\n');
  let hadParseError = false;

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;

    const jsonStr = line.slice(6);
    if (!jsonStr.trim()) continue;

    try {
      const event = JSON.parse(jsonStr);

      if (event.type === 'token' && event.content !== undefined) {
        callbacks.onToken(event.content);
      } else if (event.type === 'response_id' && event.responseId) {
        callbacks.onResponseId(event.responseId);
      } else if (event.type === 'done') {
        callbacks.onComplete();
      } else if (event.type === 'error') {
        callbacks.onError(new Error(event.error || 'Stream error'));
      }
    } catch (e) {
      // Track parse errors for threshold detection
      hadParseError = true;
      console.warn('Failed to parse stream event:', jsonStr);
    }
  }

  return { hadParseError };
}

/**
 * Generate a succinct title for a thread using AI
 *
 * @param prompt - User's first message in the thread
 * @param response - Optional AI response for better context
 * @returns Promise with generated title
 * @throws Error on API failure
 */
export async function generateThreadTitle(
  prompt: string,
  response?: string
): Promise<string> {
  const requestBody: TitleRequest = { prompt, response };

  const res = await fetch('/api/thread-title', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    throw new Error('Failed to generate thread title');
  }

  const data: TitleResponse = await res.json();
  return data.title;
}
