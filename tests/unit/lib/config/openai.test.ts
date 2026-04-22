import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  getOpenAIModelConfig,
  getDeveloperPrompt,
  getBlockActionPrompt,
  calculateCost,
} from "@/lib/config/openai";
import { _clearPromptCache } from "@/lib/config/prompts";

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

describe("getDeveloperPrompt", () => {
  beforeEach(() => {
    _clearPromptCache();
  });

  it("returns English prompt by default", () => {
    const prompt = getDeveloperPrompt();
    expect(prompt).toContain("knowledgeable assistant");
    expect(prompt).toContain("<response_approach>");
    expect(prompt).not.toContain("Simplified Chinese");
  });

  it("returns English prompt for 'en'", () => {
    const prompt = getDeveloperPrompt("en");
    expect(prompt).toContain("knowledgeable assistant");
    expect(prompt).not.toContain("Simplified Chinese");
  });

  it("returns Chinese prompt for 'zh'", () => {
    const prompt = getDeveloperPrompt("zh");
    expect(prompt).toContain("knowledgeable assistant");
    expect(prompt).toContain("Simplified Chinese");
  });

  it("returns the same content on repeated calls (caching)", () => {
    const first = getDeveloperPrompt("en");
    const second = getDeveloperPrompt("en");
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
    expect(prompt).toContain("<rules>");
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
    // gpt-5.4-mini: input=0.25, output=2.00 per 1M tokens
    const cost = calculateCost("gpt-5.4-mini", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.25 + 2.0);
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
