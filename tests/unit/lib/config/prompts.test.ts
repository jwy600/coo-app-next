import { describe, it, expect, beforeEach } from "vitest";
import {
  getChatPrompt,
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

  describe("getChatPrompt", () => {
    it("loads prompt for all supported languages without error", () => {
      const languages: ResponseLanguage[] = ["en", "es", "fr", "zh", "ja"];
      for (const lang of languages) {
        expect(() => getChatPrompt(lang)).not.toThrow();
        expect(getChatPrompt(lang).length).toBeGreaterThan(0);
      }
    });

    it("defaults to English when no language specified", () => {
      const prompt = getChatPrompt();
      expect(prompt).not.toContain("<language>");
      expect(prompt).not.toContain("Always respond in");
    });

    it("removes language tag for English", () => {
      const prompt = getChatPrompt("en");
      expect(prompt).not.toContain("<language>");
      expect(prompt).not.toContain("</language>");
    });

    it("injects language directive for Chinese", () => {
      const prompt = getChatPrompt("zh");
      expect(prompt).toContain("Always respond in Simplified Chinese.");
      expect(prompt).toContain("<language>");
    });

    it("injects language directive for Japanese", () => {
      const prompt = getChatPrompt("ja");
      expect(prompt).toContain("Always respond in Japanese.");
    });

    it("injects language directive for Spanish", () => {
      const prompt = getChatPrompt("es");
      expect(prompt).toContain("Always respond in Spanish.");
    });

    it("injects language directive for French", () => {
      const prompt = getChatPrompt("fr");
      expect(prompt).toContain("Always respond in French.");
    });

    it("contains chatgpt-style persona", () => {
      const prompt = getChatPrompt("en");
      expect(prompt).toContain("helpful, warm assistant");
    });

    it("contains formatting rules", () => {
      const prompt = getChatPrompt("en");
      expect(prompt).toContain("NEVER use numbered lists");
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
      getChatPrompt("en");
      _clearPromptCache();
      expect(() => getChatPrompt("en")).not.toThrow();
    });
  });
});
