export type ModelType = 'gpt-5.2' | 'gpt-5-mini';
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high';
export type ResponseLanguage = 'en' | 'es' | 'fr' | 'zh' | 'ja';
export type TranslateLanguage = 'English' | 'Chinese' | 'Spanish' | 'French' | 'Japanese';

/** Maps response language codes to full language names (for prompt injection) */
export const LANGUAGE_MAP: Record<ResponseLanguage, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  zh: 'Simplified Chinese',
  ja: 'Japanese',
};

/** Maps TranslateLanguage display names to ResponseLanguage codes */
export const TRANSLATE_TO_RESPONSE_MAP: Record<TranslateLanguage, ResponseLanguage> = {
  English: 'en',
  Spanish: 'es',
  French: 'fr',
  Chinese: 'zh',
  Japanese: 'ja',
};

/** Maps ResponseLanguage codes to TranslateLanguage display names */
export const RESPONSE_TO_TRANSLATE_MAP: Record<ResponseLanguage, TranslateLanguage> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  zh: 'Chinese',
  ja: 'Japanese',
};

/** Check if the response and translate languages are the same (a conflict) */
export const isLanguageConflict = (
  responseLang: ResponseLanguage,
  translateLang: TranslateLanguage,
): boolean => {
  return TRANSLATE_TO_RESPONSE_MAP[translateLang] === responseLang;
};

/** Get a sensible default translate language that doesn't conflict with the response language */
export const getDefaultTranslateLanguage = (
  responseLang: ResponseLanguage,
): TranslateLanguage => {
  if (responseLang === 'en') return 'Chinese';
  return 'English';
};

export interface Settings {
  model: ModelType;
  reasoningEffort: ReasoningEffort;
  webSearchEnabled: boolean;
  responseLanguage: ResponseLanguage;
  translateLanguage: TranslateLanguage;
}

export const DEFAULT_SETTINGS: Settings = {
  model: 'gpt-5-mini',
  reasoningEffort: 'none',
  webSearchEnabled: false,
  responseLanguage: 'en',
  translateLanguage: 'Chinese',
};
