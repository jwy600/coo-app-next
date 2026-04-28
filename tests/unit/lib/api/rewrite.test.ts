import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreateResponse } = vi.hoisted(() => ({
  mockCreateResponse: vi.fn(),
}));

vi.mock('@/lib/api/openAiClient', () => ({
  createResponse: mockCreateResponse,
}));

vi.mock('@/lib/config/prompts', () => ({
  getRewritePrompt: vi.fn(() => 'rewrite prompt'),
}));

import { fetchRewrite } from '@/lib/api/rewrite';
import type { Settings } from '@/types/settings';

const baseSettings: Settings = {
  apiKey: 'sk-test',
  model: 'gpt-5.4-mini',
  reasoningEffort: 'none',
  responseLanguage: 'en',
  translateLanguage: 'Chinese',
  webSearchEnabled: false,
  exportDestination: 'local',
  obsidianVaultName: '',
};

describe('fetchRewrite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateResponse.mockResolvedValue({
      text: 'rewritten passage',
      responseId: 'resp-1',
    });
  });

  it('throws when buffer text is empty', async () => {
    await expect(fetchRewrite('   ', [], baseSettings)).rejects.toThrow(
      'Buffer text cannot be empty',
    );
  });

  it('throws when settings.apiKey is missing', async () => {
    await expect(
      fetchRewrite('hello', [], { ...baseSettings, apiKey: '' }),
    ).rejects.toThrow(/Missing OpenAI API key/);
  });

  it('calls createResponse with the rewrite prompt and a buffer-only input when no notes', async () => {
    const result = await fetchRewrite('original passage', [], baseSettings);
    expect(mockCreateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'sk-test',
        model: 'gpt-5.4-mini',
        instructions: 'rewrite prompt',
        input: expect.stringContaining('original passage'),
      }),
    );
    expect(result).toEqual({ text: 'rewritten passage', responseId: 'resp-1' });
  });

  it('embeds each note as a labeled bullet in the input', async () => {
    await fetchRewrite('passage', ['tighten it', 'add a CTA'], baseSettings);
    const input = (mockCreateResponse.mock.calls[0][0] as { input: string }).input;
    expect(input).toContain('passage');
    expect(input).toContain('tighten it');
    expect(input).toContain('add a CTA');
  });
});
