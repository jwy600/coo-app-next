import { describe, it, expect, afterEach } from "vitest";
import {
  getOpenAIModelConfig,
  getDeveloperPrompt,
  getBlockActionPrompt,
  calculateCost,
  DEVELOPER_PROMPT,
  DEVELOPER_PROMPT_ZH,
  BLOCK_ACTION_PROMPT,
  BLOCK_ACTION_PROMPT_ZH,
} from "@/lib/config/openai";

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
    expect(config.model).toBe("gpt-5-mini");
  });

  it("returns env var model when set", () => {
    process.env.OPENAI_MODEL = "gpt-5.2";
    const config = getOpenAIModelConfig();
    expect(config.model).toBe("gpt-5.2");
  });
});

describe("getDeveloperPrompt", () => {
  it("returns English prompt by default", () => {
    expect(getDeveloperPrompt()).toBe(DEVELOPER_PROMPT);
  });

  it("returns English prompt for 'en'", () => {
    expect(getDeveloperPrompt("en")).toBe(DEVELOPER_PROMPT);
  });

  it("returns Chinese prompt for 'zh'", () => {
    expect(getDeveloperPrompt("zh")).toBe(DEVELOPER_PROMPT_ZH);
  });
});

describe("getBlockActionPrompt", () => {
  it("returns English prompt by default", () => {
    expect(getBlockActionPrompt()).toBe(BLOCK_ACTION_PROMPT);
  });

  it("returns English prompt for 'en'", () => {
    expect(getBlockActionPrompt("en")).toBe(BLOCK_ACTION_PROMPT);
  });

  it("returns Chinese prompt for 'zh'", () => {
    expect(getBlockActionPrompt("zh")).toBe(BLOCK_ACTION_PROMPT_ZH);
  });
});

describe("calculateCost", () => {
  it("calculates cost for known model", () => {
    // gpt-5-mini: input=0.25, output=2.00 per 1M tokens
    const cost = calculateCost("gpt-5-mini", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.25 + 2.0);
  });

  it("returns 0 for unknown model", () => {
    expect(calculateCost("unknown-model", 1000, 1000)).toBe(0);
  });

  it("handles zero tokens", () => {
    expect(calculateCost("gpt-5-mini", 0, 0)).toBe(0);
  });

  it("calculates fractional costs correctly", () => {
    // 100 tokens of gpt-5.2: input=1.75/1M, output=14.00/1M
    const cost = calculateCost("gpt-5.2", 100, 100);
    const expected = (100 / 1_000_000) * 1.75 + (100 / 1_000_000) * 14.0;
    expect(cost).toBeCloseTo(expected);
  });
});
