import { describe, it, expect, beforeEach } from "vitest";
import {
  getDeveloperPrompt,
  getBlockActionPrompt,
  replaceLanguageTag,
  prependLanguageDirective,
  _clearPromptCache,
} from "@/lib/config/prompts";
import type { ResponseLanguage } from "@/types/settings";

describe("prompt loader", () => {
  beforeEach(() => {
    _clearPromptCache();
  });

  describe("getDeveloperPrompt", () => {
    it("loads developer prompt for all supported languages", () => {
      const languages: ResponseLanguage[] = ["en", "es", "fr", "zh", "ja"];
      for (const lang of languages) {
        expect(() => getDeveloperPrompt(lang)).not.toThrow();
        expect(getDeveloperPrompt(lang).length).toBeGreaterThan(0);
      }
    });

    it("defaults to English when no language specified", () => {
      const prompt = getDeveloperPrompt();
      expect(prompt).not.toContain("<language>");
      expect(prompt).not.toContain("Always respond in");
    });

    it("removes language tag for English", () => {
      const prompt = getDeveloperPrompt("en");
      expect(prompt).not.toContain("<language>");
      expect(prompt).not.toContain("</language>");
    });

    it("injects language directive for Chinese", () => {
      const prompt = getDeveloperPrompt("zh");
      expect(prompt).toContain("Always respond in Simplified Chinese.");
      expect(prompt).toContain("<language>");
    });

    it("injects language directive for Japanese", () => {
      const prompt = getDeveloperPrompt("ja");
      expect(prompt).toContain("Always respond in Japanese.");
    });

    it("injects language directive for Spanish", () => {
      const prompt = getDeveloperPrompt("es");
      expect(prompt).toContain("Always respond in Spanish.");
    });

    it("injects language directive for French", () => {
      const prompt = getDeveloperPrompt("fr");
      expect(prompt).toContain("Always respond in French.");
    });

    it("caches templates after first read", () => {
      const first = getDeveloperPrompt("en");
      const second = getDeveloperPrompt("en");
      expect(first).toBe(second);
    });
  });

  describe("getBlockActionPrompt", () => {
    it("loads block-action prompt for all supported languages", () => {
      const languages: ResponseLanguage[] = ["en", "es", "fr", "zh", "ja"];
      for (const lang of languages) {
        expect(() => getBlockActionPrompt(lang)).not.toThrow();
        expect(getBlockActionPrompt(lang).length).toBeGreaterThan(0);
      }
    });

    it("returns unmodified prompt for English", () => {
      const prompt = getBlockActionPrompt("en");
      expect(prompt).not.toContain("Always respond in");
      expect(prompt).toContain("You transform or answer questions");
    });

    it("prepends language directive for non-English", () => {
      const prompt = getBlockActionPrompt("zh");
      expect(prompt.startsWith("Always respond in Simplified Chinese.")).toBe(
        true,
      );
      expect(prompt).toContain("You transform or answer questions");
    });
  });

  describe("replaceLanguageTag", () => {
    const template = "Hello\n<language></language>\nWorld";

    it("removes tag for English", () => {
      const result = replaceLanguageTag(template, "en");
      expect(result).not.toContain("<language>");
      expect(result).toContain("Hello");
      expect(result).toContain("World");
    });

    it("fills tag for non-English", () => {
      const result = replaceLanguageTag(template, "ja");
      expect(result).toContain(
        "<language>Always respond in Japanese.</language>",
      );
    });
  });

  describe("prependLanguageDirective", () => {
    const prompt = "Some prompt text.";

    it("returns unchanged for English", () => {
      expect(prependLanguageDirective(prompt, "en")).toBe(prompt);
    });

    it("prepends directive for non-English", () => {
      const result = prependLanguageDirective(prompt, "fr");
      expect(result).toBe("Always respond in French.\n\nSome prompt text.");
    });
  });

  describe("cache management", () => {
    it("clears cache correctly", () => {
      getDeveloperPrompt("en");
      _clearPromptCache();
      expect(() => getDeveloperPrompt("en")).not.toThrow();
    });
  });
});
