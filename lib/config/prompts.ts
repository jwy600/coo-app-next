import type {
  ResponseLanguage,
  TranslateLanguage,
} from "@/types/settings";
import { LANGUAGE_MAP } from "@/types/settings";
import {
  CHATGPT_PROMPT,
  BLOCK_ACTION_PROMPT,
  BLOCK_ACTION_TRANSLATE_PROMPT,
  THREAD_TITLE_PROMPT,
  REWRITE_PROMPT,
} from "./promptTemplates";

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

export const getChatPrompt = (
  responseLanguage: ResponseLanguage = "en",
): string => {
  return replaceLanguageTag(CHATGPT_PROMPT, responseLanguage);
};

export const getBlockActionPrompt = (
  responseLanguage: ResponseLanguage = "en",
): string => {
  return replaceLanguageTag(BLOCK_ACTION_PROMPT, responseLanguage);
};

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

export const getTranslatePrompt = (
  translateLanguage: TranslateLanguage,
): string => {
  return replaceTranslationLanguageTag(
    BLOCK_ACTION_TRANSLATE_PROMPT,
    translateLanguage,
  );
};

export const getThreadTitlePrompt = (): string => THREAD_TITLE_PROMPT;

export const getRewritePrompt = (
  responseLanguage: ResponseLanguage = "en",
): string => {
  return replaceLanguageTag(REWRITE_PROMPT, responseLanguage);
};

/** No-op kept for test compatibility. */
export const _clearPromptCache = (): void => {};
