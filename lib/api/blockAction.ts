import { apiFetch } from './client';
import type { BlockAction, BlockActionRequest, BlockActionResponse } from '@/types/api';
import type { TranslateLanguage } from '@/types/settings';
import { parseString } from '@/lib/utils/validation';

/**
 * Fetch block action transformation from OpenAI
 *
 * @param action - Type of transformation (translate, eli5, expand, etc.)
 * @param blockText - Text content to transform
 * @param prompt - Optional prompt for 'ask' and 'rewrite' actions
 * @param translateLanguage - Optional target language for 'translate' action
 * @returns Promise with transformed text
 * @throws ApiClientError on validation or API errors
 */
export async function fetchBlockAction(
  action: BlockAction,
  blockText: string,
  prompt?: string,
  translateLanguage?: TranslateLanguage
): Promise<BlockActionResponse> {
  // Parse and validate inputs
  const trimmedBlockText = parseString(blockText);
  const trimmedPrompt = parseString(prompt);

  if (!trimmedBlockText) {
    throw new Error('Block text cannot be empty');
  }

  if ((action === 'ask' || action === 'rewrite') && !trimmedPrompt) {
    throw new Error(`Action '${action}' requires a prompt`);
  }

  // Build request
  const requestBody: BlockActionRequest = {
    action,
    blockText: trimmedBlockText,
    prompt: trimmedPrompt || undefined,
    mode: 'block',
    translateLanguage: action === 'translate' ? translateLanguage : undefined,
  };

  // Call API
  return apiFetch<BlockActionResponse>('/api/block-action', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });
}
