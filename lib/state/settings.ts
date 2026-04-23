/**
 * Pure state functions for settings management
 * These are pure functions with no side effects - testable and framework-agnostic
 */

import type {
  Settings,
  ModelType,
  ReasoningEffort,
  ResponseLanguage,
  TranslateLanguage,
  ExportDestination,
} from "@/types/settings";
import {
  DEFAULT_SETTINGS,
  isLanguageConflict,
  getDefaultTranslateLanguage,
} from "@/types/settings";

/**
 * Create initial settings with default values
 */
export const createInitialSettings = (): Settings => {
  return { ...DEFAULT_SETTINGS };
};

/**
 * Update the OpenAI API key
 */
export const updateApiKey = (
  settings: Settings,
  apiKey: string,
): Settings => {
  return { ...settings, apiKey };
};

/**
 * Update the model setting
 */
export const updateModel = (settings: Settings, model: ModelType): Settings => {
  return { ...settings, model };
};

/**
 * Update the reasoning effort setting
 */
export const updateReasoningEffort = (
  settings: Settings,
  reasoningEffort: ReasoningEffort,
): Settings => {
  return { ...settings, reasoningEffort };
};

/**
 * Update the web search enabled setting
 */
export const updateWebSearchEnabled = (
  settings: Settings,
  webSearchEnabled: boolean,
): Settings => {
  return { ...settings, webSearchEnabled };
};

/**
 * Update the response language setting.
 * Auto-adjusts translateLanguage if it would conflict with the new response language.
 */
export const updateResponseLanguage = (
  settings: Settings,
  responseLanguage: ResponseLanguage,
): Settings => {
  let { translateLanguage } = settings;
  if (isLanguageConflict(responseLanguage, translateLanguage)) {
    translateLanguage = getDefaultTranslateLanguage(responseLanguage);
  }
  return { ...settings, responseLanguage, translateLanguage };
};

/**
 * Update the translation language setting
 */
export const updateTranslateLanguage = (
  settings: Settings,
  translateLanguage: TranslateLanguage,
): Settings => {
  return { ...settings, translateLanguage };
};

/**
 * Update the export destination setting
 */
export const updateExportDestination = (
  settings: Settings,
  exportDestination: ExportDestination,
): Settings => {
  return { ...settings, exportDestination };
};

/**
 * Update the Obsidian vault name setting
 */
export const updateObsidianVaultName = (
  settings: Settings,
  obsidianVaultName: string,
): Settings => {
  return { ...settings, obsidianVaultName };
};

/**
 * Reset settings to default values
 */
export const resetSettings = (): Settings => {
  return { ...DEFAULT_SETTINGS };
};
