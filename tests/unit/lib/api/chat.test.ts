import { describe, it, expect, vi, beforeEach } from "vitest";

import { fetchChatCompletionStream } from "@/lib/api/chat";
import type { StreamChatCallbacks } from "@/lib/api/chat";

describe("fetchChatCompletionStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  const makeCallbacks = (): StreamChatCallbacks => ({
    onToken: vi.fn(),
    onResponseId: vi.fn(),
    onComplete: vi.fn(),
    onError: vi.fn(),
  });

  it("throws on empty prompt", async () => {
    const callbacks = makeCallbacks();
    await expect(fetchChatCompletionStream("   ", callbacks)).rejects.toThrow();
  });

  it("calls onError when response is not ok", async () => {
    const callbacks = makeCallbacks();

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Bad request" }),
    } as Response);

    await fetchChatCompletionStream("Hello", callbacks);

    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Bad request" }),
    );
  });

  it("calls onError when response body is null", async () => {
    const callbacks = makeCallbacks();

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      body: null,
    } as Response);

    await fetchChatCompletionStream("Hello", callbacks);

    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "No response body available" }),
    );
  });

  it("processes token events from SSE stream", async () => {
    const callbacks = makeCallbacks();

    const encoder = new TextEncoder();
    const chunks = [
      'data: {"type":"token","content":"Hello"}\n\n',
      'data: {"type":"token","content":" world"}\n\n',
      'data: {"type":"done"}\n\n',
    ];

    let chunkIndex = 0;
    const mockReader = {
      read: vi.fn(async () => {
        if (chunkIndex < chunks.length) {
          return {
            done: false,
            value: encoder.encode(chunks[chunkIndex++]),
          };
        }
        return { done: true, value: undefined };
      }),
      releaseLock: vi.fn(),
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    } as unknown as Response);

    await fetchChatCompletionStream("Hello", callbacks);

    expect(callbacks.onToken).toHaveBeenCalledWith("Hello");
    expect(callbacks.onToken).toHaveBeenCalledWith(" world");
    expect(callbacks.onComplete).toHaveBeenCalled();
  });

  it("processes response_id events", async () => {
    const callbacks = makeCallbacks();

    const encoder = new TextEncoder();
    const chunks = [
      'data: {"type":"response_id","responseId":"resp-123"}\n\ndata: {"type":"done"}\n\n',
    ];

    let chunkIndex = 0;
    const mockReader = {
      read: vi.fn(async () => {
        if (chunkIndex < chunks.length) {
          return {
            done: false,
            value: encoder.encode(chunks[chunkIndex++]),
          };
        }
        return { done: true, value: undefined };
      }),
      releaseLock: vi.fn(),
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    } as unknown as Response);

    await fetchChatCompletionStream("Hello", callbacks);

    expect(callbacks.onResponseId).toHaveBeenCalledWith("resp-123");
  });

  it("processes error events from stream", async () => {
    const callbacks = makeCallbacks();

    const encoder = new TextEncoder();
    const chunks = ['data: {"type":"error","error":"Rate limited"}\n\n'];

    let chunkIndex = 0;
    const mockReader = {
      read: vi.fn(async () => {
        if (chunkIndex < chunks.length) {
          return {
            done: false,
            value: encoder.encode(chunks[chunkIndex++]),
          };
        }
        return { done: true, value: undefined };
      }),
      releaseLock: vi.fn(),
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    } as unknown as Response);

    await fetchChatCompletionStream("Hello", callbacks);

    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Rate limited" }),
    );
  });

  it("calls onError on network failure", async () => {
    const callbacks = makeCallbacks();

    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("Network failure"),
    );

    await fetchChatCompletionStream("Hello", callbacks);

    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Network failure" }),
    );
  });

  it("releases reader lock on completion", async () => {
    const callbacks = makeCallbacks();

    const encoder = new TextEncoder();
    const releaseLock = vi.fn();
    const mockReader = {
      read: vi.fn(async () => ({
        done: true,
        value: encoder.encode('data: {"type":"done"}\n\n'),
      })),
      releaseLock,
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    } as unknown as Response);

    await fetchChatCompletionStream("Hello", callbacks);

    expect(releaseLock).toHaveBeenCalled();
  });

  it("passes threadId and previousResponseId", async () => {
    const callbacks = makeCallbacks();

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      body: null,
    } as Response);

    await fetchChatCompletionStream("Hello", callbacks, "t1", "prev-resp");

    const body = JSON.parse(
      (vi.mocked(globalThis.fetch).mock.calls[0][1] as RequestInit)
        .body as string,
    );
    expect(body.threadId).toBe("t1");
    expect(body.previousResponseId).toBe("prev-resp");
    expect(body.stream).toBe(true);
  });
});
