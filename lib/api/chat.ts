import { apiFetch } from './client';
import type { ChatRequest, ChatResponse } from '@/types/api';
import { validatePrompt } from '@/lib/utils/validation';

/**
 * Fetch chat completion from OpenAI
 *
 * @param prompt - User prompt text
 * @param threadId - Optional thread ID for context
 * @param previousResponseId - Optional response ID for contextual chaining
 * @returns Promise with AI response text and response ID
 * @throws ApiClientError on validation or API errors
 */
export async function fetchChatCompletion(
  prompt: string,
  threadId?: string,
  previousResponseId?: string
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
    mode: 'chat',
    previousResponseId,
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
 */
export async function fetchChatCompletionStream(
  prompt: string,
  callbacks: StreamChatCallbacks,
  threadId?: string,
  previousResponseId?: string
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
    mode: 'chat',
    previousResponseId,
    stream: true,
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

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Process remaining buffer
          if (buffer.trim()) {
            processStreamBuffer(buffer, callbacks);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Split on double newline (SSE separator)
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          processStreamBuffer(part, callbacks);
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    callbacks.onError(error as Error);
  }
}

/**
 * Process SSE buffer and dispatch to callbacks
 */
function processStreamBuffer(data: string, callbacks: StreamChatCallbacks): void {
  const lines = data.split('\n');

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
      // Skip malformed JSON
      console.warn('Failed to parse stream event:', jsonStr);
    }
  }
}
