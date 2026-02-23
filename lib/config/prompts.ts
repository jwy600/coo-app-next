import { readFileSync } from "fs";
import { join } from "path";
import type {
  ResponseLanguage,
  TranslateLanguage,
  SystemPromptFile,
} from "@/types/settings";
import { LANGUAGE_MAP } from "@/types/settings";

/** Supported prompt names (chat prompts derived from SystemPromptFile + block-action variants) */
type PromptName = SystemPromptFile | "block-action" | "block-action-translate";

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

/** Get the chat system prompt for the given prompt file and language. */
export const getChatPrompt = (
  promptFile: SystemPromptFile = "developer",
  responseLanguage: ResponseLanguage = "en",
): string => {
  const template = loadTemplate(promptFile);
  return replaceLanguageTag(template, responseLanguage);
};

/** Get the developer/chat system prompt for the given language. */
export const getDeveloperPrompt = (
  responseLanguage: ResponseLanguage = "en",
): string => {
  return getChatPrompt("developer", responseLanguage);
};

/** Get the block action system prompt for the given language. */
export const getBlockActionPrompt = (
  responseLanguage: ResponseLanguage = "en",
): string => {
  const template = loadTemplate("block-action");
  return replaceLanguageTag(template, responseLanguage);
};

/**
 * Replace the <translationlanguage></translationlanguage> placeholder with
 * the target language name. Removes the tag entirely for English.
 */
export const replaceTranslationLanguageTag = (
  template: string,
  lang: TranslateLanguage,
): string => {
  if (lang === "English") {
    return template.replace(
      /\n?<translationlanguage><\/translationlanguage>\n?/,
      "\n",
    );
  }
  return template.replace(
    "<translationlanguage></translationlanguage>",
    `<translationlanguage>Translate into ${lang}.</translationlanguage>`,
  );
};

/** Get the system prompt for the translate action. */
export const getTranslatePrompt = (
  translateLanguage: TranslateLanguage,
): string => {
  const template = loadTemplate("block-action-translate");
  return replaceTranslationLanguageTag(template, translateLanguage);
};

/** Clear the template cache (for testing only). */
export const _clearPromptCache = (): void => {
  templateCache.clear();
};
