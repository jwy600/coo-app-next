import { describe, it, expect } from "vitest";
import {
  createInitialSettings,
  updateModel,
  updateReasoningEffort,
  updateWebSearchEnabled,
  updateResponseLanguage,
  updateTranslateLanguage,
  updateExportDestination,
  updateObsidianVaultName,
  resetSettings,
} from "@/lib/state/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";
import type { Settings } from "@/types/settings";

describe("Settings State Functions", () => {
  describe("createInitialSettings", () => {
    it("should create settings with default values", () => {
      const settings = createInitialSettings();
      expect(settings.model).toBe("gpt-5.4-mini");
      expect(settings.reasoningEffort).toBe("none");
      expect(settings.webSearchEnabled).toBe(false);
    });

    it("should match DEFAULT_SETTINGS", () => {
      const settings = createInitialSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it("should return a new object each time (immutability)", () => {
      const settings1 = createInitialSettings();
      const settings2 = createInitialSettings();
      expect(settings1).not.toBe(settings2);
      expect(settings1).toEqual(settings2);
    });
  });

  describe("updateModel", () => {
    it("should update model to gpt-5.4", () => {
      const settings = createInitialSettings();
      const updated = updateModel(settings, "gpt-5.4");
      expect(updated.model).toBe("gpt-5.4");
    });

    it("should update model to gpt-5.4-mini", () => {
      const settings: Settings = { ...DEFAULT_SETTINGS, model: "gpt-5.4" };
      const updated = updateModel(settings, "gpt-5.4-mini");
      expect(updated.model).toBe("gpt-5.4-mini");
    });

    it("should maintain immutability", () => {
      const settings = createInitialSettings();
      const updated = updateModel(settings, "gpt-5.4");
      expect(updated).not.toBe(settings);
      expect(settings.model).toBe("gpt-5.4-mini");
    });

    it("should preserve other settings", () => {
      const settings: Settings = {
        model: "gpt-5.4-mini",
        reasoningEffort: "high",
        webSearchEnabled: true,
        responseLanguage: "en",
        translateLanguage: "English",
      };
      const updated = updateModel(settings, "gpt-5.4");
      expect(updated.reasoningEffort).toBe("high");
      expect(updated.webSearchEnabled).toBe(true);
      expect(updated.responseLanguage).toBe("en");
      expect(updated.translateLanguage).toBe("English");
    });
  });

  describe("updateReasoningEffort", () => {
    it("should update reasoning effort to low", () => {
      const settings = createInitialSettings();
      const updated = updateReasoningEffort(settings, "low");
      expect(updated.reasoningEffort).toBe("low");
    });

    it("should update reasoning effort to medium", () => {
      const settings = createInitialSettings();
      const updated = updateReasoningEffort(settings, "medium");
      expect(updated.reasoningEffort).toBe("medium");
    });

    it("should update reasoning effort to high", () => {
      const settings = createInitialSettings();
      const updated = updateReasoningEffort(settings, "high");
      expect(updated.reasoningEffort).toBe("high");
    });

    it("should update reasoning effort to none", () => {
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        reasoningEffort: "high",
      };
      const updated = updateReasoningEffort(settings, "none");
      expect(updated.reasoningEffort).toBe("none");
    });

    it("should maintain immutability", () => {
      const settings = createInitialSettings();
      const updated = updateReasoningEffort(settings, "high");
      expect(updated).not.toBe(settings);
      expect(settings.reasoningEffort).toBe("none");
    });

    it("should preserve other settings", () => {
      const settings: Settings = {
        model: "gpt-5.4",
        reasoningEffort: "none",
        webSearchEnabled: true,
        responseLanguage: "zh",
        translateLanguage: "Spanish",
      };
      const updated = updateReasoningEffort(settings, "medium");
      expect(updated.model).toBe("gpt-5.4");
      expect(updated.webSearchEnabled).toBe(true);
      expect(updated.responseLanguage).toBe("zh");
      expect(updated.translateLanguage).toBe("Spanish");
    });
  });

  describe("updateWebSearchEnabled", () => {
    it("should enable web search", () => {
      const settings = createInitialSettings();
      const updated = updateWebSearchEnabled(settings, true);
      expect(updated.webSearchEnabled).toBe(true);
    });

    it("should disable web search", () => {
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        webSearchEnabled: true,
      };
      const updated = updateWebSearchEnabled(settings, false);
      expect(updated.webSearchEnabled).toBe(false);
    });

    it("should maintain immutability", () => {
      const settings = createInitialSettings();
      const updated = updateWebSearchEnabled(settings, true);
      expect(updated).not.toBe(settings);
      expect(settings.webSearchEnabled).toBe(false);
    });

    it("should preserve other settings", () => {
      const settings: Settings = {
        model: "gpt-5.4",
        reasoningEffort: "high",
        webSearchEnabled: false,
        responseLanguage: "en",
        translateLanguage: "French",
      };
      const updated = updateWebSearchEnabled(settings, true);
      expect(updated.model).toBe("gpt-5.4");
      expect(updated.reasoningEffort).toBe("high");
      expect(updated.responseLanguage).toBe("en");
      expect(updated.translateLanguage).toBe("French");
    });
  });

  describe("updateResponseLanguage", () => {
    it("should update response language to zh", () => {
      const settings = createInitialSettings();
      const updated = updateResponseLanguage(settings, "zh");
      expect(updated.responseLanguage).toBe("zh");
    });

    it("should update response language to new languages (es, fr, ja)", () => {
      const settings = createInitialSettings();
      expect(updateResponseLanguage(settings, "es").responseLanguage).toBe(
        "es",
      );
      expect(updateResponseLanguage(settings, "fr").responseLanguage).toBe(
        "fr",
      );
      expect(updateResponseLanguage(settings, "ja").responseLanguage).toBe(
        "ja",
      );
    });

    it("should maintain immutability", () => {
      const settings = createInitialSettings();
      const updated = updateResponseLanguage(settings, "zh");
      expect(updated).not.toBe(settings);
      expect(settings.responseLanguage).toBe("en");
    });

    it("should auto-adjust translateLanguage when it conflicts", () => {
      // Default: responseLanguage=en, translateLanguage=Chinese
      // Changing response to zh should conflict with Chinese → auto-adjust to English
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        responseLanguage: "en",
        translateLanguage: "Chinese",
      };
      const updated = updateResponseLanguage(settings, "zh");
      expect(updated.responseLanguage).toBe("zh");
      expect(updated.translateLanguage).toBe("English");
    });

    it("should auto-adjust translateLanguage to Chinese when switching to English conflict", () => {
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        responseLanguage: "zh",
        translateLanguage: "English",
      };
      const updated = updateResponseLanguage(settings, "en");
      expect(updated.responseLanguage).toBe("en");
      expect(updated.translateLanguage).toBe("Chinese");
    });

    it("should not change translateLanguage when no conflict", () => {
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        responseLanguage: "en",
        translateLanguage: "Spanish",
      };
      const updated = updateResponseLanguage(settings, "zh");
      expect(updated.translateLanguage).toBe("Spanish");
    });

    it("should handle Japanese conflict", () => {
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        responseLanguage: "en",
        translateLanguage: "Japanese",
      };
      const updated = updateResponseLanguage(settings, "ja");
      expect(updated.responseLanguage).toBe("ja");
      expect(updated.translateLanguage).toBe("English");
    });
  });

  describe("updateTranslateLanguage", () => {
    it("should update translate language", () => {
      const settings = createInitialSettings();
      const updated = updateTranslateLanguage(settings, "Spanish");
      expect(updated.translateLanguage).toBe("Spanish");
    });

    it("should maintain immutability", () => {
      const settings = createInitialSettings();
      const updated = updateTranslateLanguage(settings, "French");
      expect(updated).not.toBe(settings);
    });
  });

  describe("updateExportDestination", () => {
    it("should update to obsidian", () => {
      const settings = createInitialSettings();
      const updated = updateExportDestination(settings, "obsidian");
      expect(updated.exportDestination).toBe("obsidian");
    });

    it("should update to local", () => {
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        exportDestination: "obsidian",
      };
      const updated = updateExportDestination(settings, "local");
      expect(updated.exportDestination).toBe("local");
    });

    it("should maintain immutability", () => {
      const settings = createInitialSettings();
      const updated = updateExportDestination(settings, "obsidian");
      expect(updated).not.toBe(settings);
      expect(settings.exportDestination).toBe("local");
    });

    it("should preserve other settings", () => {
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        model: "gpt-5.4",
        webSearchEnabled: true,
      };
      const updated = updateExportDestination(settings, "obsidian");
      expect(updated.model).toBe("gpt-5.4");
      expect(updated.webSearchEnabled).toBe(true);
    });
  });

  describe("updateObsidianVaultName", () => {
    it("should update vault name", () => {
      const settings = createInitialSettings();
      const updated = updateObsidianVaultName(settings, "MyVault");
      expect(updated.obsidianVaultName).toBe("MyVault");
    });

    it("should clear vault name", () => {
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        obsidianVaultName: "OldVault",
      };
      const updated = updateObsidianVaultName(settings, "");
      expect(updated.obsidianVaultName).toBe("");
    });

    it("should maintain immutability", () => {
      const settings = createInitialSettings();
      const updated = updateObsidianVaultName(settings, "NewVault");
      expect(updated).not.toBe(settings);
      expect(settings.obsidianVaultName).toBe("");
    });

    it("should preserve other settings", () => {
      const settings: Settings = {
        ...DEFAULT_SETTINGS,
        exportDestination: "obsidian",
        model: "gpt-5.4",
      };
      const updated = updateObsidianVaultName(settings, "Vault");
      expect(updated.exportDestination).toBe("obsidian");
      expect(updated.model).toBe("gpt-5.4");
    });
  });

  describe("resetSettings", () => {
    it("should reset to default settings", () => {
      const reset = resetSettings();
      expect(reset).toEqual(DEFAULT_SETTINGS);
    });

    it("should return a new object each time", () => {
      const reset1 = resetSettings();
      const reset2 = resetSettings();
      expect(reset1).not.toBe(reset2);
      expect(reset1).toEqual(reset2);
    });

    it("should reset export settings to defaults", () => {
      const reset = resetSettings();
      expect(reset.exportDestination).toBe("local");
      expect(reset.obsidianVaultName).toBe("");
    });
  });
});
