import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreateResponseStream } = vi.hoisted(() => ({
  mockCreateResponseStream: vi.fn(),
}));

vi.mock("@/lib/api/openAiClient", () => ({
  createResponseStream: mockCreateResponseStream,
}));

vi.mock("@/lib/config/prompts", () => ({
  getChatPrompt: vi.fn(() => "chat prompt"),
}));

import { fetchChatCompletionStream } from "@/lib/api/chat";
import type { StreamChatCallbacks } from "@/lib/api/chat";
import type { Settings } from "@/types/settings";

const baseSettings: Settings = {
  apiKey: "sk-test",
  model: "gpt-5.6-luna",
  reasoningEffort: "none",
  responseLanguage: "en",
  translateLanguage: "Chinese",
  webSearchEnabled: false,
  exportDestination: "local",
  obsidianVaultName: "",
};

const makeCallbacks = (): StreamChatCallbacks => ({
  onToken: vi.fn(),
  onResponseId: vi.fn(),
  onComplete: vi.fn(),
  onError: vi.fn(),
});

describe("fetchChatCompletionStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls onError on empty prompt", async () => {
    const callbacks = makeCallbacks();
    await fetchChatCompletionStream(
      "   ",
      callbacks,
      undefined,
      undefined,
      baseSettings,
    );
    expect(callbacks.onError).toHaveBeenCalled();
    expect(mockCreateResponseStream).not.toHaveBeenCalled();
  });

  it("calls onError when apiKey is missing", async () => {
    const callbacks = makeCallbacks();
    await fetchChatCompletionStream(
      "Hello",
      callbacks,
      undefined,
      undefined,
      { ...baseSettings, apiKey: "" },
    );
    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Missing OpenAI API key"),
      }),
    );
    expect(mockCreateResponseStream).not.toHaveBeenCalled();
  });

  it("calls onError when settings are missing entirely", async () => {
    const callbacks = makeCallbacks();
    await fetchChatCompletionStream("Hello", callbacks);
    expect(callbacks.onError).toHaveBeenCalled();
    expect(mockCreateResponseStream).not.toHaveBeenCalled();
  });

  it("forwards params to createResponseStream", async () => {
    const callbacks = makeCallbacks();
    mockCreateResponseStream.mockResolvedValue(undefined);

    await fetchChatCompletionStream(
      "Hello world",
      callbacks,
      "thread-1",
      "prev-resp-id",
      baseSettings,
    );

    expect(mockCreateResponseStream).toHaveBeenCalledTimes(1);
    const [params, handler] = mockCreateResponseStream.mock.calls[0];
    expect(params.apiKey).toBe("sk-test");
    expect(params.model).toBe("gpt-5.6-luna");
    expect(params.input).toBe("Hello world");
    expect(params.instructions).toBe("chat prompt");
    expect(params.previousResponseId).toBe("prev-resp-id");
    expect(handler).toBe(callbacks);
  });

  it("trims whitespace from the prompt", async () => {
    const callbacks = makeCallbacks();
    mockCreateResponseStream.mockResolvedValue(undefined);

    await fetchChatCompletionStream(
      "  Hello  ",
      callbacks,
      undefined,
      undefined,
      baseSettings,
    );

    const params = mockCreateResponseStream.mock.calls[0][0];
    expect(params.input).toBe("Hello");
  });

  it("passes reasoning and web search settings through", async () => {
    const callbacks = makeCallbacks();
    mockCreateResponseStream.mockResolvedValue(undefined);

    await fetchChatCompletionStream(
      "Hello",
      callbacks,
      undefined,
      undefined,
      { ...baseSettings, reasoningEffort: "high", webSearchEnabled: true },
    );

    const params = mockCreateResponseStream.mock.calls[0][0];
    expect(params.reasoningEffort).toBe("high");
    expect(params.webSearchEnabled).toBe(true);
  });
});
