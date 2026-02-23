import { readFileSync } from "fs";
import { join } from "path";
import type { ResponseLanguage, TranslateLanguage } from "@/types/settings";
import { LANGUAGE_MAP, TRANSLATE_TO_RESPONSE_MAP } from "@/types/settings";

/** Supported prompt names */
type PromptName = "developer" | "block-action";

/** Module-scope cache: each raw template is read from disk once */
const templateCache = new Map<string, string>();

/**
 * Load a raw prompt template from prompts/{name}.md, with module-scope caching.
 * Reads synchronously on first access, returns cached value thereafter.
 */
const loadTemplate = (name: PromptName): string => {
  const cached = templateCache.get(name);
  if (cached !== undefined) {
    return cached;
  }

  const filePath = join(process.cwd(), "prompts", `${name}.md`);
  const content = readFileSync(filePath, "utf-8").trim();

  if (!content) {
    throw new Error(`Prompt file is empty: ${filePath}`);
  }

  templateCache.set(name, content);
  return content;
};

/**
 * Replace the <language></language> placeholder in a template with a language directive.
 * For English, removes the placeholder entirely (no directive needed).
 */
export const replaceLanguageTag = (
  template: string,
  lang: ResponseLanguage,
): string => {
  if (lang === "en") {
    return template.replace(/\n?<language><\/language>\n?/, "\n");
  }
  const fullName = LANGUAGE_MAP[lang];
  return template.replace(
    "<language></language>",
    `<language>Always respond in ${fullName}.</language>`,
  );
};

/**
 * Prepend a language directive to a prompt (for templates without a <language> tag).
 * For English, returns the prompt unchanged.
 */
export const prependLanguageDirective = (
  prompt: string,
  lang: ResponseLanguage,
): string => {
  if (lang === "en") {
    return prompt;
  }
  const fullName = LANGUAGE_MAP[lang];
  return `Always respond in ${fullName}.\n\n${prompt}`;
};

/** Get the developer/chat system prompt for the given language. */
export const getDeveloperPrompt = (
  responseLanguage: ResponseLanguage = "en",
): string => {
  const template = loadTemplate("developer");
  return replaceLanguageTag(template, responseLanguage);
};

/** Get the block action system prompt for the given language. */
export const getBlockActionPrompt = (
  responseLanguage: ResponseLanguage = "en",
): string => {
  const template = loadTemplate("block-action");
  return prependLanguageDirective(template, responseLanguage);
};

/**
 * Get the system prompt for the translate action.
 * Uses the translate target language (not the response language) so the
 * system prompt doesn't conflict with the translation direction.
 */
export const getTranslatePrompt = (
  translateLanguage: TranslateLanguage,
): string => {
  const template = loadTemplate("block-action");
  const lang = TRANSLATE_TO_RESPONSE_MAP[translateLanguage];
  return prependLanguageDirective(template, lang);
};

/** Clear the template cache (for testing only). */
export const _clearPromptCache = (): void => {
  templateCache.clear();
};
