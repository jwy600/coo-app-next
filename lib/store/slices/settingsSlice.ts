/**
 * Settings slice - Wraps pure settings state functions
 */

import { StateCreator } from 'zustand';
import * as settingsFns from '@/lib/state/settings';
import type { Settings, ModelType, ReasoningEffort, ResponseLanguage, TranslateLanguage } from '@/types/settings';

export interface SettingsSlice {
  settings: Settings;

  // Actions that wrap pure functions
  updateModel: (model: ModelType) => void;
  updateReasoningEffort: (effort: ReasoningEffort) => void;
  updateWebSearchEnabled: (enabled: boolean) => void;
  updateResponseLanguage: (language: ResponseLanguage) => void;
  updateTranslateLanguage: (language: TranslateLanguage) => void;
  resetSettings: () => void;
}

export const settingsSlice: StateCreator<
  SettingsSlice,
  [],
  [],
  SettingsSlice
> = (set, get) => ({
  settings: settingsFns.createInitialSettings(),

  updateModel: (model) => {
    const updated = settingsFns.updateModel(get().settings, model);
    set({ settings: updated });
  },

  updateReasoningEffort: (effort) => {
    const updated = settingsFns.updateReasoningEffort(get().settings, effort);
    set({ settings: updated });
  },

  updateWebSearchEnabled: (enabled) => {
    const updated = settingsFns.updateWebSearchEnabled(get().settings, enabled);
    set({ settings: updated });
  },

  updateResponseLanguage: (language) => {
    const updated = settingsFns.updateResponseLanguage(get().settings, language);
    set({ settings: updated });
  },

  updateTranslateLanguage: (language) => {
    const updated = settingsFns.updateTranslateLanguage(get().settings, language);
    set({ settings: updated });
  },

  resetSettings: () => {
    const reset = settingsFns.resetSettings();
    set({ settings: reset });
  },
});
