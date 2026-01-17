import { apiFetch } from './client';
import type { ChatRequest, ChatResponse } from '@/types/api';
import { validatePrompt } from '@/lib/utils/validation';

/**
 * Fetch chat completion from OpenAI
 *
 * @param prompt - User prompt text
 * @param threadId - Optional thread ID for context
 * @returns Promise with AI response text
 * @throws ApiClientError on validation or API errors
 */
export async function fetchChatCompletion(
  prompt: string,
  threadId?: string
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
  };

  // Call API
  return apiFetch<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });
}
