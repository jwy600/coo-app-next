/**
 * Browser-side Rewrite API for the focus editor.
 *
 * Atomic (non-streaming) replacement: takes the current editor buffer and
 * the accumulated notes, asks the LLM to apply the notes as edits, and
 * returns the rewritten Markdown to drop in via `setRewriteResult`.
 */

'use client';

import type { Settings } from '@/types/settings';
import { parseString } from '@/lib/utils/validation';
import { getRewritePrompt } from '@/lib/config/prompts';
import { createResponse } from './openAiClient';

export interface RewriteResult {
  text: string;
  responseId: string;
}

export async function fetchRewrite(
  buffer: string,
  notes: string[],
  settings: Settings,
): Promise<RewriteResult> {
  const trimmed = parseString(buffer);
  if (!trimmed) throw new Error('Buffer text cannot be empty');
  if (!settings.apiKey) {
    throw new Error('Missing OpenAI API key. Open Settings and paste your key.');
  }

  const input = buildInput(trimmed, notes);
  const instructions = getRewritePrompt(settings.responseLanguage);

  const result = await createResponse({
    apiKey: settings.apiKey,
    model: settings.model,
    input,
    instructions,
    reasoningEffort: settings.reasoningEffort,
    webSearchEnabled: settings.webSearchEnabled,
  });

  return { text: result.text, responseId: result.responseId };
}

function buildInput(buffer: string, notes: string[]): string {
  if (notes.length === 0) {
    return `<passage>\n${buffer}\n</passage>`;
  }
  const noteBlock = notes.map((n) => `- ${n}`).join('\n');
  return `<passage>\n${buffer}\n</passage>\n\n<notes>\n${noteBlock}\n</notes>`;
}
