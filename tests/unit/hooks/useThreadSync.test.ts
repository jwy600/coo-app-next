import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

// Hoist mocks
const {
  mockLoadThread,
  mockLoadMessages,
  mockLoadBlocks,
  mockLoadCards,
  mockMergeThread,
  mockSetCards,
} = vi.hoisted(() => ({
  mockLoadThread: vi.fn(),
  mockLoadMessages: vi.fn(),
  mockLoadBlocks: vi.fn(),
  mockLoadCards: vi.fn(),
  mockMergeThread: vi.fn(),
  mockSetCards: vi.fn(),
}));

// Mock store
const { mockStoreState } = vi.hoisted(() => ({
  mockStoreState: {
    threads: [] as { id: string; messages: { id: string }[] }[],
    mergeThreadFromSupabase: mockMergeThread,
    setCards: mockSetCards,
  },
}));

vi.mock("@/lib/store/useStore", () => {
  const useStoreFn = vi.fn((selector: (s: typeof mockStoreState) => unknown) =>
    selector(mockStoreState),
  );
  (useStoreFn as Record<string, unknown>).getState = vi.fn(
    () => mockStoreState,
  );
  (useStoreFn as Record<string, unknown>).setState = vi.fn();

  return { useStore: useStoreFn };
});

vi.mock("@/lib/supabase/threads", () => ({
  loadThreadFromSupabase: mockLoadThread,
}));

vi.mock("@/lib/supabase/messages", () => ({
  loadMessagesForThread: mockLoadMessages,
}));

vi.mock("@/lib/supabase/blocks", () => ({
  loadBlocksForThread: mockLoadBlocks,
}));

vi.mock("@/lib/supabase/cards", () => ({
  loadCardsForThread: mockLoadCards,
}));

vi.mock("@/lib/utils/errorHandling", () => ({
  getErrorMessage: (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback,
}));

import { useThreadSync } from "@/hooks/useThreadSync";

describe("useThreadSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.threads = [];
  });

  it("returns initial state with no threadId", () => {
    const { result } = renderHook(() => useThreadSync(null));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.thread).toBeNull();
  });

  it("does not load when threadId is null", () => {
    renderHook(() => useThreadSync(null));

    expect(mockLoadThread).not.toHaveBeenCalled();
  });

  it("skips loading when thread already has messages in store", () => {
    mockStoreState.threads = [
      {
        id: "t1",
        messages: [{ id: "m1" }],
      },
    ];

    renderHook(() => useThreadSync("t1"));

    expect(mockLoadThread).not.toHaveBeenCalled();
  });

  it("loads thread from Supabase when not in store", async () => {
    const threadData = {
      id: "t1",
      title: "Thread 1",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
    };
    const messages = [
      {
        id: "m1",
        threadId: "t1",
        role: "user",
        createdAt: "2024-01-01",
        meta: {},
      },
    ];
    const blocks = [
      { id: "b1", messageId: "m1", type: "paragraph", text: "Hello" },
    ];
    const cards = [{ id: "c1", blockIds: ["b1"] }];

    mockLoadThread.mockResolvedValue(threadData);
    mockLoadMessages.mockResolvedValue(messages);
    mockLoadBlocks.mockResolvedValue(blocks);
    mockLoadCards.mockResolvedValue(cards);

    const { result } = renderHook(() => useThreadSync("t1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockLoadThread).toHaveBeenCalledWith("t1");
    expect(mockLoadMessages).toHaveBeenCalledWith("t1");
    expect(mockLoadBlocks).toHaveBeenCalledWith("t1");
    expect(mockLoadCards).toHaveBeenCalledWith("t1");
    expect(mockMergeThread).toHaveBeenCalled();
    expect(mockSetCards).toHaveBeenCalledWith(cards);
  });

  it("loads thread that exists in store but has no messages", async () => {
    // Thread exists but has empty messages (from landing page)
    mockStoreState.threads = [
      {
        id: "t1",
        messages: [],
      },
    ];

    const threadData = {
      id: "t1",
      title: "Thread 1",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
    };

    mockLoadThread.mockResolvedValue(threadData);
    mockLoadMessages.mockResolvedValue([]);
    mockLoadBlocks.mockResolvedValue([]);
    mockLoadCards.mockResolvedValue([]);

    const { result } = renderHook(() => useThreadSync("t1"));

    await waitFor(() => {
      expect(mockLoadThread).toHaveBeenCalledWith("t1");
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("sets error when thread not found after retries", async () => {
    vi.useFakeTimers();

    mockLoadThread.mockResolvedValue(null);

    const { result } = renderHook(() => useThreadSync("missing-thread"));

    // Run all timers and microtasks (retries with exponential backoff)
    // Wrap in act() to flush React state updates
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe("Thread not found");

    vi.useRealTimers();
  });

  it("sets error on fetch failure", async () => {
    vi.useFakeTimers();

    mockLoadThread.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useThreadSync("t1"));

    // Run all timers and microtasks (retries with exponential backoff)
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe("Network error");

    vi.useRealTimers();
  });

  it("returns thread from store", () => {
    const thread = {
      id: "t1",
      messages: [{ id: "m1" }],
    };
    mockStoreState.threads = [thread];

    const { result } = renderHook(() => useThreadSync("t1"));

    expect(result.current.thread).toEqual(thread);
  });

  it("returns null thread when not in store", () => {
    mockStoreState.threads = [];

    const { result } = renderHook(() => useThreadSync("t1"));

    expect(result.current.thread).toBeNull();
  });
});
