/**
 * Pure state functions for settings management
 * These are pure functions with no side effects - testable and framework-agnostic
 */

import type { Settings, ModelType, ReasoningEffort, TranslateLanguage } from '@/types/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';

/**
 * Create initial settings with default values
 */
export const createInitialSettings = (): Settings => {
  return { ...DEFAULT_SETTINGS };
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
  reasoningEffort: ReasoningEffort
): Settings => {
  return { ...settings, reasoningEffort };
};

/**
 * Update the web search enabled setting
 */
export const updateWebSearchEnabled = (
  settings: Settings,
  webSearchEnabled: boolean
): Settings => {
  return { ...settings, webSearchEnabled };
};

/**
 * Update the translation language setting
 */
export const updateTranslateLanguage = (
  settings: Settings,
  translateLanguage: TranslateLanguage
): Settings => {
  return { ...settings, translateLanguage };
};

/**
 * Reset settings to default values
 */
export const resetSettings = (): Settings => {
  return { ...DEFAULT_SETTINGS };
};
