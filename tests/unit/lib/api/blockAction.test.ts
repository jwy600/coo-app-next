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
    expect(params.input).toContain("Explain the passage like I'm 5");
    expect(params.input).toContain("<passage>\nComplex text here\n</passage>");
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

  it("forwards previousResponseId and keeps the wrapped passage on chained ask", async () => {
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
    // The dead "drop block text on chain" branch is gone — passage always sent.
    expect(params.input).toContain("<passage>\nblock text\n</passage>");
    expect(params.input).toContain("what is abc?");
  });

  it("keeps the preamble and wraps the passage on the first ask", async () => {
    mockCreateResponse.mockResolvedValue({
      text: "First answer",
      responseId: "resp-1",
    });

    await fetchBlockAction(
      "ask",
      "block text",
      "what does warp mean?",
      undefined,
      baseSettings,
    );

    const params = mockCreateResponse.mock.calls[0][0];
    expect(params.input).toContain("Answer this question about the passage");
    expect(params.input).toContain("what does warp mean?");
    expect(params.input).toContain("<passage>\nblock text\n</passage>");
  });

  it("wraps every action's blockText in a <passage> fence", async () => {
    mockCreateResponse.mockResolvedValue({ text: "ok", responseId: "r" });

    for (const action of ["translate", "summarize", "expand", "example"] as const) {
      mockCreateResponse.mockClear();
      await fetchBlockAction(
        action,
        "passage body",
        // None of the iterated actions take a prompt; ask/rewrite are
        // covered by their own dedicated tests.
        undefined,
        action === "translate" ? "Spanish" : undefined,
        baseSettings,
      );
      const params = mockCreateResponse.mock.calls[0][0];
      expect(params.input).toContain("<passage>\npassage body\n</passage>");
    }
  });

  it("injects <reference-question> when no previousResponseId is set", async () => {
    mockCreateResponse.mockResolvedValue({ text: "ok", responseId: "r" });

    await fetchBlockAction(
      "summarize",
      "passage body",
      undefined,
      undefined,
      baseSettings,
      undefined,
      "What does saturator do?",
    );

    const params = mockCreateResponse.mock.calls[0][0];
    expect(params.input).toContain(
      "<reference-question>\nWhat does saturator do?\n</reference-question>",
    );
    expect(params.input).toContain("<passage>\npassage body\n</passage>");
  });

  it("drops <reference-question> when previousResponseId is set (chain wins)", async () => {
    mockCreateResponse.mockResolvedValue({ text: "ok", responseId: "r" });

    await fetchBlockAction(
      "summarize",
      "passage body",
      undefined,
      undefined,
      baseSettings,
      "resp_M",
      "What does saturator do?",
    );

    const params = mockCreateResponse.mock.calls[0][0];
    expect(params.input).not.toContain("<reference-question>");
    expect(params.input).toContain("<passage>\npassage body\n</passage>");
    expect(params.previousResponseId).toBe("resp_M");
  });

  it("does not inject <reference-question> when neither chain nor reference is set", async () => {
    mockCreateResponse.mockResolvedValue({ text: "ok", responseId: "r" });

    await fetchBlockAction(
      "summarize",
      "passage body",
      undefined,
      undefined,
      baseSettings,
    );

    const params = mockCreateResponse.mock.calls[0][0];
    expect(params.input).not.toContain("<reference-question>");
  });

  it("tags the request with focus:<action> label", async () => {
    mockCreateResponse.mockResolvedValue({ text: "ok", responseId: "r" });

    await fetchBlockAction(
      "summarize",
      "block text",
      undefined,
      undefined,
      baseSettings,
    );

    const params = mockCreateResponse.mock.calls[0][0];
    expect(params.label).toBe("focus:summarize");
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

  it("passes web search through for ask when enabled in settings", async () => {
    mockCreateResponse.mockResolvedValue({ text: "ok", responseId: "r" });

    await fetchBlockAction(
      "ask",
      "block text",
      "is this field mature?",
      undefined,
      { ...baseSettings, webSearchEnabled: true },
    );

    const params = mockCreateResponse.mock.calls[0][0];
    expect(params.webSearchEnabled).toBe(true);
  });

  it("never enables web search for transformations, even when the setting is on", async () => {
    for (const action of ["translate", "eli5", "summarize", "expand", "example"] as const) {
      mockCreateResponse.mockClear();
      await fetchBlockAction(
        action,
        "block text",
        undefined,
        action === "translate" ? "Spanish" : undefined,
        { ...baseSettings, webSearchEnabled: true },
      );
      const params = mockCreateResponse.mock.calls[0][0];
      expect(params.webSearchEnabled).toBe(false);
    }
  });
});
