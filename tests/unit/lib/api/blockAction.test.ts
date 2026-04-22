import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreateResponse } = vi.hoisted(() => ({
  mockCreateResponse: vi.fn(),
}));

vi.mock("@/lib/api/openAiClient", () => ({
  createResponse: mockCreateResponse,
}));

vi.mock("@/lib/config/prompts", () => ({
  getBlockActionPrompt: vi.fn(() => "block action prompt"),
  getTranslatePrompt: vi.fn(
    (lang: string) => `translate prompt for ${lang}`,
  ),
}));

import { fetchBlockAction } from "@/lib/api/blockAction";
import type { Settings } from "@/types/settings";

const baseSettings: Settings = {
  apiKey: "sk-test",
  model: "gpt-5.4-mini",
  reasoningEffort: "none",
  responseLanguage: "en",
  translateLanguage: "Chinese",
  webSearchEnabled: false,
  exportDestination: "local",
  obsidianVaultName: "",
  systemPromptFile: "default",
};

describe("fetchBlockAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls OpenAI with correct input for eli5", async () => {
    mockCreateResponse.mockResolvedValue({
      text: "Simplified",
      responseId: "resp-1",
    });

    const result = await fetchBlockAction(
      "eli5",
      "Complex text here",
      undefined,
      undefined,
      baseSettings,
    );

    expect(mockCreateResponse).toHaveBeenCalledTimes(1);
    const params = mockCreateResponse.mock.calls[0][0];
    expect(params.apiKey).toBe("sk-test");
    expect(params.model).toBe("gpt-5.4-mini");
    expect(params.input).toContain("Explain the following text like I'm 5");
    expect(params.input).toContain("Complex text here");
    expect(result.text).toBe("Simplified");
  });

  it("throws on empty block text", async () => {
    await expect(
      fetchBlockAction("eli5", "  ", undefined, undefined, baseSettings),
    ).rejects.toThrow("Block text cannot be empty");
  });

  it("throws when ask action has no prompt", async () => {
    await expect(
      fetchBlockAction("ask", "some text", undefined, undefined, baseSettings),
    ).rejects.toThrow("requires a prompt");
  });

  it("throws when rewrite action has no prompt", async () => {
    await expect(
      fetchBlockAction(
        "rewrite",
        "some text",
        undefined,
        undefined,
        baseSettings,
      ),
    ).rejects.toThrow("requires a prompt");
  });

  it("throws when apiKey is missing", async () => {
    await expect(
      fetchBlockAction("eli5", "text", undefined, undefined, {
        ...baseSettings,
        apiKey: "",
      }),
    ).rejects.toThrow("Missing OpenAI API key");
  });

  it("includes prompt in input for ask action", async () => {
    mockCreateResponse.mockResolvedValue({
      text: "Answer",
      responseId: "resp-1",
    });

    await fetchBlockAction(
      "ask",
      "block text",
      "What does this mean?",
      undefined,
      baseSettings,
    );

    const params = mockCreateResponse.mock.calls[0][0];
    expect(params.input).toContain("What does this mean?");
    expect(params.input).toContain("block text");
  });

  it("uses translate instructions for translate action", async () => {
    mockCreateResponse.mockResolvedValue({
      text: "Translated",
      responseId: "resp-1",
    });

    await fetchBlockAction(
      "translate",
      "Hello",
      undefined,
      "Spanish",
      baseSettings,
    );

    const params = mockCreateResponse.mock.calls[0][0];
    expect(params.instructions).toBe("translate prompt for Spanish");
  });

  it("forwards previousResponseId to createResponse for ask chain", async () => {
    mockCreateResponse.mockResolvedValue({
      text: "Follow-up answer",
      responseId: "resp-2",
    });

    const result = await fetchBlockAction(
      "ask",
      "block text",
      "what is abc?",
      undefined,
      baseSettings,
      "resp-1",
    );

    const params = mockCreateResponse.mock.calls[0][0];
    expect(params.previousResponseId).toBe("resp-1");
    expect(result.responseId).toBe("resp-2");
  });

  it("uses block action instructions for non-translate actions", async () => {
    mockCreateResponse.mockResolvedValue({
      text: "Expanded",
      responseId: "resp-1",
    });

    await fetchBlockAction(
      "expand",
      "Hello",
      undefined,
      undefined,
      baseSettings,
    );

    const params = mockCreateResponse.mock.calls[0][0];
    expect(params.instructions).toBe("block action prompt");
  });
});
