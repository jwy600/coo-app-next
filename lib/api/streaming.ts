/**
 * Server-Sent Events (SSE) stream parsing utilities
 */

export interface StreamEvent {
  type: 'token' | 'done' | 'error';
  content?: string;
  responseId?: string;
  error?: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (responseId?: string) => void;
  onError: (error: Error) => void;
}

/**
 * Parse and consume a Server-Sent Events stream from a fetch response
 *
 * @param response - Fetch response with SSE body
 * @param callbacks - Event handlers for tokens, completion, and errors
 */
export async function consumeSSEStream(
  response: Response,
  callbacks: StreamCallbacks
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body available for streaming');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process any remaining data in buffer
        if (buffer.trim()) {
          processSSELines(buffer, callbacks);
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Split on double newline (SSE event separator)
      const parts = buffer.split('\n\n');
      // Keep the last incomplete part in buffer
      buffer = parts.pop() || '';

      // Process complete events
      for (const part of parts) {
        processSSELines(part, callbacks);
      }
    }
  } catch (error) {
    callbacks.onError(error as Error);
  } finally {
    reader.releaseLock();
  }
}

/**
 * Process SSE lines and dispatch to appropriate callback
 */
function processSSELines(data: string, callbacks: StreamCallbacks): void {
  const lines = data.split('\n');

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;

    const jsonStr = line.slice(6); // Remove 'data: ' prefix
    if (!jsonStr.trim()) continue;

    try {
      const event: StreamEvent = JSON.parse(jsonStr);

      if (event.type === 'token' && event.content !== undefined) {
        callbacks.onToken(event.content);
      } else if (event.type === 'done') {
        callbacks.onComplete(event.responseId);
      } else if (event.type === 'error') {
        callbacks.onError(new Error(event.error || 'Stream error'));
      }
    } catch (e) {
      // Skip malformed JSON lines
      console.warn('Failed to parse SSE event:', jsonStr);
    }
  }
}
