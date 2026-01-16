import { apiFetch } from './client';
import type { ChatRequest, ChatResponse } from '@/types/api';

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
  // Local validation
  const trimmedPrompt = prompt.trim();

  if (!trimmedPrompt) {
    throw new Error('Prompt cannot be empty');
  }

  if (trimmedPrompt.length > 4000) {
    throw new Error('Prompt is too long. Maximum 4000 characters.');
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
