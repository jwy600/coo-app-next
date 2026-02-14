import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// Hoist mocks
const { mockStoreActions, mockFetchStream } = vi.hoisted(() => ({
  mockStoreActions: {
    startStreaming: vi.fn(),
    appendStreamToken: vi.fn(),
    flushStreamParse: vi.fn(),
    setStreamResponseId: vi.fn(),
    clearStream: vi.fn(),
  },
  mockFetchStream: vi.fn(),
}));

// Mock useStore to return individual actions via selectors
vi.mock("@/lib/store/useStore", () => {
  const storeState = {
    ...mockStoreActions,
    streamingMessage: null as { blocks: { id: string }[] } | null,
  };

  const useStoreFn = vi.fn(
    (selector: (s: typeof storeState) => unknown) => selector(storeState),
  );
  (useStoreFn as Record<string, unknown>).getState = vi.fn(() => storeState);

  return {
    useStore: useStoreFn,
  };
});

vi.mock("@/lib/api", () => ({
  fetchChatCompletionStream: mockFetchStream,
}));

vi.mock("@/lib/utils/errorHandling", () => ({
  getErrorMessage: (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback,
}));

import { useStreaming } from "@/hooks/useStreaming";
import { useStore } from "@/lib/store/useStore";

describe("useStreaming", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: mock getState returns no streaming message
    const storeState = {
      ...mockStoreActions,
      streamingMessage: null,
    };
    (useStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(storeState);
  });

  it("returns streamChat function", () => {
    const { result } = renderHook(() => useStreaming());
    expect(typeof result.current.streamChat).toBe("function");
  });

  it("calls startStreaming with messageId and threadId", async () => {
    mockFetchStream.mockResolvedValue(undefined);

    const { result } = renderHook(() => useStreaming());

    await result.current.streamChat({
      prompt: "Hello",
      threadId: "t1",
      messageId: "m1",
    });

    expect(mockStoreActions.startStreaming).toHaveBeenCalledWith("m1", "t1");
  });

  it("passes tokens to appendStreamToken via onToken callback", async () => {
    mockFetchStream.mockImplementation(
      async (
        _prompt: string,
        callbacks: { onToken: (t: string) => void; onComplete: () => void },
      ) => {
        callbacks.onToken("Hello");
        callbacks.onToken(" world");
        callbacks.onComplete();
      },
    );

    // getState returns streaming message with blocks for onComplete
    (useStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockStoreActions,
      streamingMessage: { blocks: [{ id: "b1" }] },
    });

    const { result } = renderHook(() => useStreaming());

    await result.current.streamChat({
      prompt: "test",
      threadId: "t1",
      messageId: "m1",
    });

    expect(mockStoreActions.appendStreamToken).toHaveBeenCalledWith("Hello");
    expect(mockStoreActions.appendStreamToken).toHaveBeenCalledWith(" world");
  });

  it("handles onResponseId callback", async () => {
    mockFetchStream.mockImplementation(
      async (
        _prompt: string,
        callbacks: {
          onResponseId: (id: string) => void;
          onComplete: () => void;
        },
      ) => {
        callbacks.onResponseId("resp-123");
        callbacks.onComplete();
      },
    );

    (useStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockStoreActions,
      streamingMessage: { blocks: [] },
    });

    const { result } = renderHook(() => useStreaming());

    await result.current.streamChat({
      prompt: "test",
      threadId: "t1",
      messageId: "m1",
    });

    expect(mockStoreActions.setStreamResponseId).toHaveBeenCalledWith(
      "resp-123",
    );
  });

  it("flushes parse and calls onComplete with blocks", async () => {
    const blocks = [
      { id: "b1", type: "paragraph", text: "Hello" },
      { id: "b2", type: "paragraph", text: "World" },
    ];

    mockFetchStream.mockImplementation(
      async (
        _prompt: string,
        callbacks: { onComplete: () => void; onResponseId: (id: string) => void },
      ) => {
        callbacks.onResponseId("resp-1");
        callbacks.onComplete();
      },
    );

    (useStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockStoreActions,
      streamingMessage: { blocks },
    });

    const onComplete = vi.fn();
    const { result } = renderHook(() => useStreaming());

    await result.current.streamChat(
      { prompt: "test", threadId: "t1", messageId: "m1" },
      { onComplete },
    );

    expect(mockStoreActions.flushStreamParse).toHaveBeenCalled();
    expect(mockStoreActions.clearStream).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith(blocks, "resp-1");
  });

  it("calls onComplete with empty array when no streaming blocks", async () => {
    mockFetchStream.mockImplementation(
      async (_prompt: string, callbacks: { onComplete: () => void }) => {
        callbacks.onComplete();
      },
    );

    (useStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockStoreActions,
      streamingMessage: { blocks: [] },
    });

    const onComplete = vi.fn();
    const { result } = renderHook(() => useStreaming());

    await result.current.streamChat(
      { prompt: "test", threadId: "t1", messageId: "m1" },
      { onComplete },
    );

    expect(onComplete).toHaveBeenCalledWith([], undefined);
  });

  it("handles API callback error", async () => {
    mockFetchStream.mockImplementation(
      async (
        _prompt: string,
        callbacks: { onError: (err: Error) => void },
      ) => {
        callbacks.onError(new Error("Stream failed"));
      },
    );

    const onError = vi.fn();
    const { result } = renderHook(() => useStreaming());

    await result.current.streamChat(
      { prompt: "test", threadId: "t1", messageId: "m1" },
      { onError },
    );

    expect(mockStoreActions.clearStream).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith("Stream failed");
  });

  it("handles thrown error from fetchChatCompletionStream", async () => {
    mockFetchStream.mockRejectedValue(new Error("Network error"));

    const onError = vi.fn();
    const { result } = renderHook(() => useStreaming());

    await result.current.streamChat(
      { prompt: "test", threadId: "t1", messageId: "m1" },
      { onError },
    );

    expect(mockStoreActions.clearStream).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith("Network error");
  });

  it("passes settings and previousResponseId to API", async () => {
    mockFetchStream.mockResolvedValue(undefined);

    const { result } = renderHook(() => useStreaming());

    const settings = {
      model: "gpt-4.1",
      reasoningEffort: "medium",
      responseLanguage: "en",
      translateLanguage: "zh-TW",
      webSearchEnabled: false,
    };

    await result.current.streamChat({
      prompt: "test",
      threadId: "t1",
      messageId: "m1",
      previousResponseId: "prev-resp",
      settings: settings as never,
    });

    expect(mockFetchStream).toHaveBeenCalledWith(
      "test",
      expect.any(Object),
      "t1",
      "prev-resp",
      settings,
    );
  });
});
