import { describe, it, expect, beforeEach } from "vitest";
import {
  getChatPrompt,
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

  describe("getChatPrompt", () => {
    it("loads developer prompt by default", () => {
      const prompt = getChatPrompt();
      expect(prompt).toContain("knowledgeable assistant");
    });

    it("loads developer prompt explicitly", () => {
      const prompt = getChatPrompt("developer", "en");
      expect(prompt).toContain("knowledgeable assistant");
    });

    it("loads atomic prompt", () => {
      const prompt = getChatPrompt("atomic", "en");
      expect(prompt).toContain("concise assistant");
      expect(prompt).toContain("atomic");
    });

    it("injects language into atomic prompt", () => {
      const prompt = getChatPrompt("atomic", "zh");
      expect(prompt).toContain("Always respond in Simplified Chinese.");
      expect(prompt).toContain("concise assistant");
    });

    it("removes language tag for English in atomic prompt", () => {
      const prompt = getChatPrompt("atomic", "en");
      expect(prompt).not.toContain("<language>");
      expect(prompt).not.toContain("</language>");
    });

    it("loads all prompt files for all languages without error", () => {
      const files = ["developer", "atomic"] as const;
      const languages: ResponseLanguage[] = ["en", "es", "fr", "zh", "ja"];
      for (const file of files) {
        for (const lang of languages) {
          expect(() => getChatPrompt(file, lang)).not.toThrow();
          expect(getChatPrompt(file, lang).length).toBeGreaterThan(0);
        }
      }
    });

    it("returns same result as getDeveloperPrompt for developer file", () => {
      const languages: ResponseLanguage[] = ["en", "es", "fr", "zh", "ja"];
      for (const lang of languages) {
        expect(getChatPrompt("developer", lang)).toBe(getDeveloperPrompt(lang));
      }
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
