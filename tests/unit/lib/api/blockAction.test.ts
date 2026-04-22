import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockApiFetch } = vi.hoisted(() => ({
  mockApiFetch: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  apiFetch: mockApiFetch,
}));

import { fetchBlockAction } from "@/lib/api/blockAction";

describe("fetchBlockAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls apiFetch with correct body for eli5", async () => {
    mockApiFetch.mockResolvedValue({ text: "Simplified" });

    const result = await fetchBlockAction("eli5", "Complex text here");

    expect(mockApiFetch).toHaveBeenCalledWith("/api/block-action", {
      method: "POST",
      body: expect.any(String),
    });
    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body);
    expect(body.action).toBe("eli5");
    expect(body.blockText).toBe("Complex text here");
    expect(result.text).toBe("Simplified");
  });

  it("throws on empty block text", async () => {
    await expect(fetchBlockAction("eli5", "  ")).rejects.toThrow(
      "Block text cannot be empty",
    );
  });

  it("throws when ask action has no prompt", async () => {
    await expect(fetchBlockAction("ask", "some text")).rejects.toThrow(
      "requires a prompt",
    );
  });

  it("throws when rewrite action has no prompt", async () => {
    await expect(fetchBlockAction("rewrite", "some text")).rejects.toThrow(
      "requires a prompt",
    );
  });

  it("passes prompt for ask action", async () => {
    mockApiFetch.mockResolvedValue({ text: "Answer" });

    await fetchBlockAction("ask", "block text", "What does this mean?");

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body);
    expect(body.prompt).toBe("What does this mean?");
  });

  it("passes translateLanguage for translate action", async () => {
    mockApiFetch.mockResolvedValue({ text: "Translated" });

    await fetchBlockAction(
      "translate",
      "Hello",
      undefined,
      "Spanish",
    );

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body);
    expect(body.translateLanguage).toBe("Spanish");
  });

  it("does not pass translateLanguage for non-translate actions", async () => {
    mockApiFetch.mockResolvedValue({ text: "Expanded" });

    await fetchBlockAction("expand", "Hello", undefined, "Spanish");

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body);
    expect(body.translateLanguage).toBeUndefined();
  });

  it("passes settings when provided", async () => {
    mockApiFetch.mockResolvedValue({ text: "ok" });

    const settings = {
      model: "gpt-5.4" as const,
      reasoningEffort: "high" as const,
      responseLanguage: "en" as const,
      translateLanguage: "English" as const,
      webSearchEnabled: false,
    };

    await fetchBlockAction("eli5", "text", undefined, undefined, settings);

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body);
    expect(body.settings).toEqual(settings);
  });
});
