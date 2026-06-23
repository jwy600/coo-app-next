import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { getOpenAIModelConfig, calculateCost } from "@/lib/config/openai";
import {
  _clearPromptCache,
  getChatPrompt,
  getBlockActionPrompt,
} from "@/lib/config/prompts";

describe("getOpenAIModelConfig", () => {
  const originalModel = process.env.OPENAI_MODEL;

  afterEach(() => {
    if (originalModel !== undefined) {
      process.env.OPENAI_MODEL = originalModel;
    } else {
      delete process.env.OPENAI_MODEL;
    }
  });

  it("returns default model when env var not set", () => {
    delete process.env.OPENAI_MODEL;
    const config = getOpenAIModelConfig();
    expect(config.model).toBe("gpt-5.4-mini");
  });

  it("returns env var model when set", () => {
    process.env.OPENAI_MODEL = "gpt-5.4";
    const config = getOpenAIModelConfig();
    expect(config.model).toBe("gpt-5.4");
  });
});

describe("getChatPrompt", () => {
  beforeEach(() => {
    _clearPromptCache();
  });

  it("returns English prompt by default", () => {
    const prompt = getChatPrompt();
    expect(prompt).toContain("helpful, warm assistant");
    expect(prompt).not.toContain("Simplified Chinese");
  });

  it("returns English prompt for 'en'", () => {
    const prompt = getChatPrompt("en");
    expect(prompt).toContain("helpful, warm assistant");
    expect(prompt).not.toContain("Simplified Chinese");
  });

  it("returns Chinese prompt for 'zh'", () => {
    const prompt = getChatPrompt("zh");
    expect(prompt).toContain("helpful, warm assistant");
    expect(prompt).toContain("Simplified Chinese");
  });

  it("returns the same content on repeated calls (caching)", () => {
    const first = getChatPrompt("en");
    const second = getChatPrompt("en");
    expect(first).toBe(second);
  });
});

describe("getBlockActionPrompt", () => {
  beforeEach(() => {
    _clearPromptCache();
  });

  it("returns English prompt by default", () => {
    const prompt = getBlockActionPrompt();
    expect(prompt).toContain("transform or answer questions");
    expect(prompt).toContain("<transformations>");
    expect(prompt).toContain("<ask>");
    expect(prompt).not.toContain("Simplified Chinese");
  });

  it("returns English prompt for 'en'", () => {
    const prompt = getBlockActionPrompt("en");
    expect(prompt).not.toContain("Simplified Chinese");
  });

  it("returns Chinese prompt for 'zh'", () => {
    const prompt = getBlockActionPrompt("zh");
    expect(prompt).toContain("Simplified Chinese");
  });

  it("returns the same content on repeated calls (caching)", () => {
    const first = getBlockActionPrompt("en");
    const second = getBlockActionPrompt("en");
    expect(first).toBe(second);
  });
});

describe("calculateCost", () => {
  it("calculates cost for known model", () => {
    // gpt-5.4-mini: input=0.75, output=4.50 per 1M tokens
    const cost = calculateCost("gpt-5.4-mini", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.75 + 4.5);
  });

  it("returns 0 for unknown model", () => {
    expect(calculateCost("unknown-model", 1000, 1000)).toBe(0);
  });

  it("handles zero tokens", () => {
    expect(calculateCost("gpt-5.4-mini", 0, 0)).toBe(0);
  });

  it("calculates fractional costs correctly", () => {
    // 100 tokens of gpt-5.4: input=1.75/1M, output=14.00/1M
    const cost = calculateCost("gpt-5.4", 100, 100);
    const expected = (100 / 1_000_000) * 1.75 + (100 / 1_000_000) * 14.0;
    expect(cost).toBeCloseTo(expected);
  });
});
