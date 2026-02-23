import { describe, it, expect, beforeEach } from "vitest";
import {
  getChatPrompt,
  getDeveloperPrompt,
  getBlockActionPrompt,
  getTranslatePrompt,
  replaceLanguageTag,
  replaceTranslationLanguageTag,
  _clearPromptCache,
} from "@/lib/config/prompts";
import type { ResponseLanguage, TranslateLanguage } from "@/types/settings";

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

    it("loads chatgpt prompt", () => {
      const prompt = getChatPrompt("chatgpt", "en");
      expect(prompt).toContain("helpful, warm assistant");
    });

    it("injects language into chatgpt prompt", () => {
      const prompt = getChatPrompt("chatgpt", "zh");
      expect(prompt).toContain("Always respond in Simplified Chinese.");
      expect(prompt).toContain("helpful, warm assistant");
    });

    it("removes language tag for English in chatgpt prompt", () => {
      const prompt = getChatPrompt("chatgpt", "en");
      expect(prompt).not.toContain("<language>");
      expect(prompt).not.toContain("</language>");
    });

    it("loads all prompt files for all languages without error", () => {
      const files = ["developer", "chatgpt"] as const;
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

    it("removes language tag for English", () => {
      const prompt = getBlockActionPrompt("en");
      expect(prompt).not.toContain("<language>");
      expect(prompt).not.toContain("</language>");
      expect(prompt).not.toContain("Always respond in");
      expect(prompt).toContain("You transform or answer questions");
    });

    it("injects language tag for non-English", () => {
      const prompt = getBlockActionPrompt("zh");
      expect(prompt).toContain(
        "<language>Always respond in Simplified Chinese.</language>",
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

  describe("getTranslatePrompt", () => {
    it("loads translate prompt for all supported languages", () => {
      const languages: TranslateLanguage[] = [
        "English",
        "Chinese",
        "Spanish",
        "French",
        "Japanese",
      ];
      for (const lang of languages) {
        expect(() => getTranslatePrompt(lang)).not.toThrow();
        expect(getTranslatePrompt(lang).length).toBeGreaterThan(0);
      }
    });

    it("removes translation language tag for English", () => {
      const prompt = getTranslatePrompt("English");
      expect(prompt).not.toContain("<translationlanguage>");
      expect(prompt).not.toContain("</translationlanguage>");
      expect(prompt).toContain("You translate a given text block");
    });

    it("injects translation language tag for non-English", () => {
      const prompt = getTranslatePrompt("Chinese");
      expect(prompt).toContain(
        "<translationlanguage>Translate into Chinese.</translationlanguage>",
      );
      expect(prompt).toContain("You translate a given text block");
    });

    it("uses TranslateLanguage value directly without mapping", () => {
      const prompt = getTranslatePrompt("Japanese");
      expect(prompt).toContain("Translate into Japanese.");
    });
  });

  describe("replaceTranslationLanguageTag", () => {
    const template =
      "Translate.\n<translationlanguage></translationlanguage>\nRules.";

    it("removes tag for English", () => {
      const result = replaceTranslationLanguageTag(template, "English");
      expect(result).not.toContain("<translationlanguage>");
      expect(result).toContain("Translate.");
      expect(result).toContain("Rules.");
    });

    it("fills tag for non-English", () => {
      const result = replaceTranslationLanguageTag(template, "French");
      expect(result).toContain(
        "<translationlanguage>Translate into French.</translationlanguage>",
      );
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
