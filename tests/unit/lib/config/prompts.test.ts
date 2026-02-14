import { describe, it, expect, beforeEach } from "vitest";
import {
  getDeveloperPrompt,
  getBlockActionPrompt,
  _clearPromptCache,
} from "@/lib/config/prompts";

describe("prompt loader", () => {
  beforeEach(() => {
    _clearPromptCache();
  });

  it("loads all 4 prompt files without error", () => {
    expect(() => getDeveloperPrompt("en")).not.toThrow();
    expect(() => getDeveloperPrompt("zh")).not.toThrow();
    expect(() => getBlockActionPrompt("en")).not.toThrow();
    expect(() => getBlockActionPrompt("zh")).not.toThrow();
  });

  it("returns non-empty strings for all prompts", () => {
    expect(getDeveloperPrompt("en").length).toBeGreaterThan(0);
    expect(getDeveloperPrompt("zh").length).toBeGreaterThan(0);
    expect(getBlockActionPrompt("en").length).toBeGreaterThan(0);
    expect(getBlockActionPrompt("zh").length).toBeGreaterThan(0);
  });

  it("caches prompts after first read", () => {
    const first = getDeveloperPrompt("en");
    const second = getDeveloperPrompt("en");
    expect(first).toBe(second);
  });

  it("clears cache correctly", () => {
    getDeveloperPrompt("en");
    _clearPromptCache();
    expect(() => getDeveloperPrompt("en")).not.toThrow();
  });

  it("defaults to English when no language specified", () => {
    const prompt = getDeveloperPrompt();
    expect(prompt).not.toContain("Simplified Chinese");
  });
});
