import { describe, it, expect, beforeEach, vi } from "vitest";
import { useStore } from "@/lib/store/useStore";

// Mock Supabase modules (required by other slices in the store)
vi.mock("@/lib/supabase/threads", () => ({
  persistThreadSnapshot: vi.fn().mockResolvedValue(undefined),
  updateThreadMetadata: vi.fn().mockResolvedValue(undefined),
  deleteThreadFromSupabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabase/blocks", () => ({
  persistBlockUpdate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabase/cards", () => ({
  persistCard: vi.fn().mockResolvedValue(undefined),
  deleteCard: vi.fn().mockResolvedValue(undefined),
}));

describe("settingsSlice", () => {
  beforeEach(() => {
    useStore.getState().resetSettings();
  });

  it("should have default settings on initialization", () => {
    const { settings } = useStore.getState();
    expect(settings.model).toBe("gpt-5-mini");
    expect(settings.reasoningEffort).toBe("none");
    expect(settings.webSearchEnabled).toBe(false);
    expect(settings.responseLanguage).toBe("en");
    expect(settings.translateLanguage).toBe("Chinese");
    expect(settings.exportDestination).toBe("local");
    expect(settings.obsidianVaultName).toBe("");
  });

  describe("updateModel", () => {
    it("should update model to gpt-5.2", () => {
      useStore.getState().updateModel("gpt-5.2");
      expect(useStore.getState().settings.model).toBe("gpt-5.2");
    });

    it("should preserve other settings when updating model", () => {
      useStore.getState().updateReasoningEffort("high");
      useStore.getState().updateWebSearchEnabled(true);
      useStore.getState().updateModel("gpt-5.2");

      const { settings } = useStore.getState();
      expect(settings.model).toBe("gpt-5.2");
      expect(settings.reasoningEffort).toBe("high");
      expect(settings.webSearchEnabled).toBe(true);
    });
  });

  describe("updateReasoningEffort", () => {
    it("should update reasoning effort", () => {
      useStore.getState().updateReasoningEffort("high");
      expect(useStore.getState().settings.reasoningEffort).toBe("high");
    });

    it("should cycle through all effort levels", () => {
      const efforts = ["low", "medium", "high", "none"] as const;
      for (const effort of efforts) {
        useStore.getState().updateReasoningEffort(effort);
        expect(useStore.getState().settings.reasoningEffort).toBe(effort);
      }
    });
  });

  describe("updateWebSearchEnabled", () => {
    it("should enable web search", () => {
      useStore.getState().updateWebSearchEnabled(true);
      expect(useStore.getState().settings.webSearchEnabled).toBe(true);
    });

    it("should disable web search", () => {
      useStore.getState().updateWebSearchEnabled(true);
      useStore.getState().updateWebSearchEnabled(false);
      expect(useStore.getState().settings.webSearchEnabled).toBe(false);
    });
  });

  describe("updateResponseLanguage", () => {
    it("should update response language to zh", () => {
      useStore.getState().updateResponseLanguage("zh");
      expect(useStore.getState().settings.responseLanguage).toBe("zh");
    });

    it("should update response language to en", () => {
      useStore.getState().updateResponseLanguage("zh");
      useStore.getState().updateResponseLanguage("en");
      expect(useStore.getState().settings.responseLanguage).toBe("en");
    });
  });

  describe("updateTranslateLanguage", () => {
    it("should update translate language", () => {
      useStore.getState().updateTranslateLanguage("Spanish");
      expect(useStore.getState().settings.translateLanguage).toBe("Spanish");
    });
  });

  describe("updateExportDestination", () => {
    it("should update export destination to obsidian", () => {
      useStore.getState().updateExportDestination("obsidian");
      expect(useStore.getState().settings.exportDestination).toBe("obsidian");
    });

    it("should update export destination to local", () => {
      useStore.getState().updateExportDestination("obsidian");
      useStore.getState().updateExportDestination("local");
      expect(useStore.getState().settings.exportDestination).toBe("local");
    });
  });

  describe("updateObsidianVaultName", () => {
    it("should update vault name", () => {
      useStore.getState().updateObsidianVaultName("MyVault");
      expect(useStore.getState().settings.obsidianVaultName).toBe("MyVault");
    });

    it("should clear vault name", () => {
      useStore.getState().updateObsidianVaultName("SomeVault");
      useStore.getState().updateObsidianVaultName("");
      expect(useStore.getState().settings.obsidianVaultName).toBe("");
    });
  });

  describe("resetSettings", () => {
    it("should reset all settings to defaults", () => {
      useStore.getState().updateModel("gpt-5.2");
      useStore.getState().updateReasoningEffort("high");
      useStore.getState().updateWebSearchEnabled(true);
      useStore.getState().updateResponseLanguage("zh");
      useStore.getState().updateTranslateLanguage("French");
      useStore.getState().updateExportDestination("obsidian");
      useStore.getState().updateObsidianVaultName("MyVault");

      useStore.getState().resetSettings();

      const { settings } = useStore.getState();
      expect(settings.model).toBe("gpt-5-mini");
      expect(settings.reasoningEffort).toBe("none");
      expect(settings.webSearchEnabled).toBe(false);
      expect(settings.responseLanguage).toBe("en");
      expect(settings.translateLanguage).toBe("Chinese");
      expect(settings.exportDestination).toBe("local");
      expect(settings.obsidianVaultName).toBe("");
    });
  });
});
