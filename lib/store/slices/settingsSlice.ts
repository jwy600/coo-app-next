/**
 * Settings slice - Wraps pure settings state functions
 */

import { StateCreator } from "zustand";
import * as settingsFns from "@/lib/state/settings";
import type {
  Settings,
  SystemPromptFile,
  ModelType,
  ReasoningEffort,
  ResponseLanguage,
  TranslateLanguage,
  ExportDestination,
} from "@/types/settings";

export interface SettingsSlice {
  settings: Settings;

  // Actions that wrap pure functions
  updateApiKey: (apiKey: string) => void;
  updateSystemPromptFile: (file: SystemPromptFile) => void;
  updateModel: (model: ModelType) => void;
  updateReasoningEffort: (effort: ReasoningEffort) => void;
  updateWebSearchEnabled: (enabled: boolean) => void;
  updateResponseLanguage: (language: ResponseLanguage) => void;
  updateTranslateLanguage: (language: TranslateLanguage) => void;
  updateExportDestination: (destination: ExportDestination) => void;
  updateObsidianVaultName: (name: string) => void;
  resetSettings: () => void;
}

export const settingsSlice: StateCreator<
  SettingsSlice,
  [],
  [],
  SettingsSlice
> = (set, get) => ({
  settings: settingsFns.createInitialSettings(),

  updateApiKey: (apiKey) => {
    const updated = settingsFns.updateApiKey(get().settings, apiKey);
    set({ settings: updated });
  },

  updateSystemPromptFile: (file) => {
    const updated = settingsFns.updateSystemPromptFile(get().settings, file);
    set({ settings: updated });
  },

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
    const updated = settingsFns.updateResponseLanguage(
      get().settings,
      language,
    );
    set({ settings: updated });
  },

  updateTranslateLanguage: (language) => {
    const updated = settingsFns.updateTranslateLanguage(
      get().settings,
      language,
    );
    set({ settings: updated });
  },

  updateExportDestination: (destination) => {
    const updated = settingsFns.updateExportDestination(
      get().settings,
      destination,
    );
    set({ settings: updated });
  },

  updateObsidianVaultName: (name) => {
    const updated = settingsFns.updateObsidianVaultName(get().settings, name);
    set({ settings: updated });
  },

  resetSettings: () => {
    const reset = settingsFns.resetSettings();
    set({ settings: reset });
  },
});
