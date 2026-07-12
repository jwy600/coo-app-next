export type ModelType = "gpt-5.6-sol" | "gpt-5.6-terra" | "gpt-5.6-luna";
export type ReasoningEffort = "none" | "low" | "medium" | "high";
export type ResponseLanguage = "en" | "es" | "fr" | "zh" | "ja";
export type TranslateLanguage =
  | "English"
  | "Chinese"
  | "Spanish"
  | "French"
  | "Japanese";
/** Maps response language codes to full language names (for prompt injection) */
export const LANGUAGE_MAP: Record<ResponseLanguage, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  zh: "Simplified Chinese",
  ja: "Japanese",
};

/** Maps TranslateLanguage display names to ResponseLanguage codes */
export const TRANSLATE_TO_RESPONSE_MAP: Record<
  TranslateLanguage,
  ResponseLanguage
> = {
  English: "en",
  Spanish: "es",
  French: "fr",
  Chinese: "zh",
  Japanese: "ja",
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
  if (responseLang === "en") return "Chinese";
  return "English";
};

export type ExportDestination = "local" | "obsidian";

export interface Settings {
  apiKey: string;
  model: ModelType;
  reasoningEffort: ReasoningEffort;
  webSearchEnabled: boolean;
  responseLanguage: ResponseLanguage;
  translateLanguage: TranslateLanguage;
  exportDestination: ExportDestination;
  obsidianVaultName: string;
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  model: "gpt-5.6-terra",
  reasoningEffort: "low",
  webSearchEnabled: true,
  responseLanguage: "en",
  translateLanguage: "Chinese",
  exportDestination: "local",
  obsidianVaultName: "",
};
