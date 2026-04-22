import type {
  ResponseLanguage,
  TranslateLanguage,
  SystemPromptFile,
} from "@/types/settings";
import { LANGUAGE_MAP } from "@/types/settings";
import {
  DEVELOPER_PROMPT,
  CHATGPT_PROMPT,
  BLOCK_ACTION_PROMPT,
  BLOCK_ACTION_TRANSLATE_PROMPT,
} from "./promptTemplates";

type PromptName = SystemPromptFile | "block-action" | "block-action-translate";

const TEMPLATES: Record<PromptName, string> = {
  developer: DEVELOPER_PROMPT,
  chatgpt: CHATGPT_PROMPT,
  "block-action": BLOCK_ACTION_PROMPT,
  "block-action-translate": BLOCK_ACTION_TRANSLATE_PROMPT,
};

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
  promptFile: SystemPromptFile = "developer",
  responseLanguage: ResponseLanguage = "en",
): string => {
  return replaceLanguageTag(TEMPLATES[promptFile], responseLanguage);
};

export const getDeveloperPrompt = (
  responseLanguage: ResponseLanguage = "en",
): string => {
  return getChatPrompt("developer", responseLanguage);
};

export const getBlockActionPrompt = (
  responseLanguage: ResponseLanguage = "en",
): string => {
  return replaceLanguageTag(TEMPLATES["block-action"], responseLanguage);
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
    TEMPLATES["block-action-translate"],
    translateLanguage,
  );
};

/** No-op kept for test compatibility. */
export const _clearPromptCache = (): void => {};
