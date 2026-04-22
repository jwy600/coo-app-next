import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "@/lib/store/useStore";

describe("streamingSlice", () => {
  beforeEach(() => {
    useStore.setState({ streamingMessage: null });
  });

  describe("startStreaming", () => {
    it("should initialize streaming message", () => {
      useStore.getState().startStreaming("msg-1", "thread-1");

      const { streamingMessage } = useStore.getState();
      expect(streamingMessage).not.toBeNull();
      expect(streamingMessage!.messageId).toBe("msg-1");
      expect(streamingMessage!.threadId).toBe("thread-1");
      expect(streamingMessage!.accumulatedText).toBe("");
      expect(streamingMessage!.blocks).toEqual([]);
      expect(streamingMessage!.responseId).toBeUndefined();
    });
  });

  describe("appendStreamToken", () => {
    it("should append token to accumulated text", () => {
      useStore.getState().startStreaming("msg-1", "thread-1");
      useStore.getState().appendStreamToken("Hello");

      const { streamingMessage } = useStore.getState();
      expect(streamingMessage!.accumulatedText).toBe("Hello");
    });

    it("should accumulate multiple tokens", () => {
      useStore.getState().startStreaming("msg-1", "thread-1");
      useStore.getState().appendStreamToken("Hello");
      useStore.getState().appendStreamToken(" world");

      expect(useStore.getState().streamingMessage!.accumulatedText).toBe(
        "Hello world",
      );
    });

    it("should not parse blocks without paragraph break", () => {
      useStore.getState().startStreaming("msg-1", "thread-1");
      useStore.getState().appendStreamToken("Hello world");

      expect(useStore.getState().streamingMessage!.blocks).toEqual([]);
    });

    it("should parse blocks when token contains paragraph break", () => {
      useStore.getState().startStreaming("msg-1", "thread-1");
      useStore.getState().appendStreamToken("First paragraph\n\nSecond");

      const { streamingMessage } = useStore.getState();
      expect(streamingMessage!.blocks.length).toBeGreaterThanOrEqual(1);
    });

    it("should parse blocks when boundary creates paragraph break", () => {
      useStore.getState().startStreaming("msg-1", "thread-1");
      useStore.getState().appendStreamToken("First paragraph\n");
      // blocks still empty - no double newline yet
      expect(useStore.getState().streamingMessage!.blocks).toEqual([]);

      useStore.getState().appendStreamToken("\nSecond");
      // Now boundary creates \n\n
      expect(
        useStore.getState().streamingMessage!.blocks.length,
      ).toBeGreaterThanOrEqual(1);
    });

    it("should do nothing when no streaming message exists", () => {
      // streamingMessage is null from beforeEach
      useStore.getState().appendStreamToken("token");
      expect(useStore.getState().streamingMessage).toBeNull();
    });
  });

  describe("flushStreamParse", () => {
    it("should force parse all accumulated text into blocks", () => {
      useStore.getState().startStreaming("msg-1", "thread-1");
      useStore.getState().appendStreamToken("Hello world");
      // No paragraph break, so blocks are empty
      expect(useStore.getState().streamingMessage!.blocks).toEqual([]);

      useStore.getState().flushStreamParse();

      const { streamingMessage } = useStore.getState();
      expect(streamingMessage!.blocks.length).toBeGreaterThanOrEqual(1);
      expect(streamingMessage!.blocks[0].text).toBe("Hello world");
    });

    it("should handle multiple paragraphs on flush", () => {
      useStore.getState().startStreaming("msg-1", "thread-1");
      useStore.getState().appendStreamToken("Para 1\n\nPara 2");
      useStore.getState().flushStreamParse();

      const { streamingMessage } = useStore.getState();
      expect(streamingMessage!.blocks.length).toBe(2);
    });

    it("should do nothing when no streaming message exists", () => {
      useStore.getState().flushStreamParse();
      expect(useStore.getState().streamingMessage).toBeNull();
    });
  });

  describe("setStreamResponseId", () => {
    it("should set response ID on streaming message", () => {
      useStore.getState().startStreaming("msg-1", "thread-1");
      useStore.getState().setStreamResponseId("resp-123");

      expect(useStore.getState().streamingMessage!.responseId).toBe(
        "resp-123",
      );
    });

    it("should do nothing when no streaming message exists", () => {
      useStore.getState().setStreamResponseId("resp-123");
      expect(useStore.getState().streamingMessage).toBeNull();
    });
  });

  describe("clearStream", () => {
    it("should clear the streaming message", () => {
      useStore.getState().startStreaming("msg-1", "thread-1");
      useStore.getState().appendStreamToken("some text");
      useStore.getState().clearStream();

      expect(useStore.getState().streamingMessage).toBeNull();
    });
  });
});
