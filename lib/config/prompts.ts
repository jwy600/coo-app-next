import { readFileSync } from 'fs';
import { join } from 'path';

/** Supported prompt names */
type PromptName = 'developer' | 'block-action';

/** Supported languages */
type PromptLanguage = 'en' | 'zh';

/** Module-scope cache: each prompt is read from disk once */
const promptCache = new Map<string, string>();

/**
 * Load a prompt from prompts/{name}.{lang}.md, with module-scope caching.
 * Reads synchronously on first access, returns cached value thereafter.
 */
const loadPrompt = (name: PromptName, lang: PromptLanguage): string => {
  const key = `${name}.${lang}`;

  const cached = promptCache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const filePath = join(process.cwd(), 'prompts', `${name}.${lang}.md`);
  const content = readFileSync(filePath, 'utf-8').trim();

  if (!content) {
    throw new Error(`Prompt file is empty: ${filePath}`);
  }

  promptCache.set(key, content);
  return content;
};

/** Get the developer/chat system prompt for the given language. */
export const getDeveloperPrompt = (responseLanguage: 'en' | 'zh' = 'en'): string => {
  return loadPrompt('developer', responseLanguage);
};

/** Get the block action system prompt for the given language. */
export const getBlockActionPrompt = (responseLanguage: 'en' | 'zh' = 'en'): string => {
  return loadPrompt('block-action', responseLanguage);
};

/** Clear the prompt cache (for testing only). */
export const _clearPromptCache = (): void => {
  promptCache.clear();
};
