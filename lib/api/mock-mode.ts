/**
 * Mock OpenAI responses for development/testing
 * Enable by setting MOCK_OPENAI=true in .env.local
 */

export const MOCK_ENABLED = process.env.MOCK_OPENAI === 'true';

export function getMockChatResponse(prompt: string): string {
  return `[MOCK] Response to: "${prompt.slice(0, 50)}..."

This is a mock response. Set OPENAI_API_KEY to get real AI responses.`;
}

export function getMockBlockActionResponse(action: string, blockText: string): string {
  const responses: Record<string, string> = {
    translate: `[MOCK 翻译] ${blockText.slice(0, 30)}的中文翻译...`,
    example: `[MOCK] Example: For instance, imagine ${blockText.slice(0, 20)}...`,
    expand: `[MOCK] Expanded: ${blockText} Furthermore, this concept extends to...`,
    eli5: `[MOCK] ELI5: Think of ${blockText.slice(0, 20)} like when you...`,
    rewrite: `[MOCK] Rewritten: ${blockText}`,
    ask: `[MOCK] Answer: Based on the paragraph, the answer is...`,
  };

  return responses[action] || '[MOCK] Unknown action';
}
