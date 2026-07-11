import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreateResponse } = vi.hoisted(() => ({
  mockCreateResponse: vi.fn(),
}));

vi.mock("@/lib/api/openAiClient", () => ({
  createResponse: mockCreateResponse,
}));

vi.mock("@/lib/config/prompts", () => ({
  getThreadTitlePrompt: vi.fn(() => "title system prompt"),
}));

import { generateThreadTitle, sanitizeTitle } from "@/lib/api/generateThreadTitle";
import type { Settings } from "@/types/settings";

const baseSettings: Settings = {
  apiKey: "sk-test",
  model: "gpt-5.6-terra", // deliberately different — function must ignore this and use gpt-5.6-luna
  reasoningEffort: "none",
  webSearchEnabled: false,
  responseLanguage: "en",
  translateLanguage: "Chinese",
  exportDestination: "local",
  obsidianVaultName: "",
};

describe("sanitizeTitle", () => {
  it("returns trimmed text as-is for clean input", () => {
    expect(sanitizeTitle("React hooks explained")).toBe("React hooks explained");
  });

  it("strips wrapping double quotes", () => {
    expect(sanitizeTitle('"React hooks explained"')).toBe("React hooks explained");
  });

  it("strips wrapping single quotes", () => {
    expect(sanitizeTitle("'React hooks explained'")).toBe("React hooks explained");
  });

  it("strips wrapping backticks", () => {
    expect(sanitizeTitle("`React hooks explained`")).toBe("React hooks explained");
  });

  it("strips trailing period", () => {
    expect(sanitizeTitle("React hooks explained.")).toBe("React hooks explained");
  });

  it("strips trailing comma", () => {
    expect(sanitizeTitle("React hooks explained,")).toBe("React hooks explained");
  });

  it("caps to 5 words when input has more", () => {
    expect(sanitizeTitle("How React hooks work in depth today")).toBe(
      "How React hooks work in",
    );
  });

  it("returns null for empty string", () => {
    expect(sanitizeTitle("")).toBeNull();
  });

  it("returns null for whitespace only", () => {
    expect(sanitizeTitle("   ")).toBeNull();
  });

  it("caps to 40 characters as safety belt", () => {
    const longWord = "A".repeat(50);
    const result = sanitizeTitle(longWord);
    expect(result).not.toBeNull();
    expect(result!.length).toBeLessThanOrEqual(40);
  });
});

describe("generateThreadTitle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns sanitized title on success", async () => {
    mockCreateResponse.mockResolvedValue({
      text: "React hooks explained",
      responseId: "resp_123",
    });
    const result = await generateThreadTitle(
      "How do React hooks work?",
      baseSettings,
    );
    expect(result).toBe("React hooks explained");
  });

  it("sanitizes model output with wrapping quotes", async () => {
    mockCreateResponse.mockResolvedValue({
      text: '"React hooks explained"',
      responseId: "resp_123",
    });
    const result = await generateThreadTitle(
      "How do React hooks work?",
      baseSettings,
    );
    expect(result).toBe("React hooks explained");
  });

  it("sanitizes trailing period from model output", async () => {
    mockCreateResponse.mockResolvedValue({
      text: "React hooks explained.",
      responseId: "resp_123",
    });
    const result = await generateThreadTitle(
      "How do React hooks work?",
      baseSettings,
    );
    expect(result).toBe("React hooks explained");
  });

  it("caps to 5 words when model returns more", async () => {
    mockCreateResponse.mockResolvedValue({
      text: "How React hooks work in depth",
      responseId: "resp_123",
    });
    const result = await generateThreadTitle(
      "How do React hooks work?",
      baseSettings,
    );
    expect(result).toBe("How React hooks work in");
  });

  it("returns null when apiKey is missing without calling the API", async () => {
    const settingsNoKey = { ...baseSettings, apiKey: "" };
    const result = await generateThreadTitle(
      "How do React hooks work?",
      settingsNoKey,
    );
    expect(result).toBeNull();
    expect(mockCreateResponse).not.toHaveBeenCalled();
  });

  it("returns null on API error without throwing", async () => {
    mockCreateResponse.mockRejectedValue(new Error("Network error"));
    const result = await generateThreadTitle(
      "How do React hooks work?",
      baseSettings,
    );
    expect(result).toBeNull();
  });

  it("returns null when model returns empty string", async () => {
    mockCreateResponse.mockResolvedValue({ text: "", responseId: "resp_123" });
    const result = await generateThreadTitle(
      "How do React hooks work?",
      baseSettings,
    );
    expect(result).toBeNull();
  });

  it("always passes gpt-5.6-luna regardless of settings.model", async () => {
    mockCreateResponse.mockResolvedValue({
      text: "React hooks",
      responseId: "resp_123",
    });
    await generateThreadTitle("How do React hooks work?", baseSettings);
    expect(mockCreateResponse).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-5.6-luna" }),
    );
  });

  it("does not pass previousResponseId, reasoningEffort, or webSearchEnabled", async () => {
    mockCreateResponse.mockResolvedValue({
      text: "React hooks",
      responseId: "resp_123",
    });
    await generateThreadTitle("How do React hooks work?", baseSettings);
    const callArg = mockCreateResponse.mock.calls[0][0];
    expect(callArg.previousResponseId).toBeUndefined();
    expect(callArg.reasoningEffort).toBeUndefined();
    expect(callArg.webSearchEnabled).toBeUndefined();
  });
});
