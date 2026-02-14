import { describe, it, expect, beforeEach, vi } from "vitest";
import { useStore } from "@/lib/store/useStore";
import * as supabaseThreads from "@/lib/supabase/threads";

// Mock Supabase modules
vi.mock("@/lib/supabase/threads", () => ({
  persistThreadSnapshot: vi.fn().mockResolvedValue(undefined),
  updateThreadMetadata: vi.fn().mockResolvedValue(undefined),
  deleteThreadFromSupabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabase/blocks", () => ({
  persistBlockUpdate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabase/cards", () => ({
  persistCard: vi.fn().mockResolvedValue(undefined),
  deleteCard: vi.fn().mockResolvedValue(undefined),
}));

describe("threadSlice", () => {
  beforeEach(() => {
    useStore.setState({
      threads: [],
      blocks: [],
      activeThreadId: "",
      mode: "landing",
      selectedBlockId: null,
      cards: [],
      isAwaitingResponse: false,
      streamingMessage: null,
    });
    vi.clearAllMocks();
  });

  describe("deleteThread", () => {
    it("should delete a thread and switch to next", () => {
      const store = useStore.getState();
      store.createThread("thread-1");
      store.createThread("thread-2");

      const nextId = useStore.getState().deleteThread("thread-2");

      expect(useStore.getState().threads).toHaveLength(1);
      expect(nextId).toBe("thread-1");
    });

    it("should switch to landing mode when last thread is deleted", () => {
      useStore.getState().createThread("thread-1");
      useStore.getState().setMode("thread");

      useStore.getState().deleteThread("thread-1");

      expect(useStore.getState().threads).toHaveLength(0);
      expect(useStore.getState().mode).toBe("landing");
      expect(useStore.getState().activeThreadId).toBeNull();
    });

    it("should clear selectedBlockId when no threads remain", () => {
      useStore.getState().createThread("thread-1");
      useStore
        .getState()
        .addAssistantMessage([{ text: "text", type: "paragraph" }]);
      const blockId = useStore.getState().blocks[0].id;
      useStore.getState().selectBlock(blockId);

      useStore.getState().deleteThread("thread-1");

      expect(useStore.getState().selectedBlockId).toBeNull();
    });

    it("should also remove blocks belonging to deleted thread", () => {
      useStore.getState().createThread("thread-1");
      useStore.getState().addUserMessage("Message in thread 1");

      useStore.getState().createThread("thread-2");
      useStore.getState().addUserMessage("Message in thread 2");

      const blockCountBefore = useStore.getState().blocks.length;
      useStore.getState().deleteThread("thread-1");

      expect(useStore.getState().blocks.length).toBeLessThan(blockCountBefore);
    });

    it("should persist deletion to Supabase", async () => {
      useStore.getState().createThread("thread-1");

      useStore.getState().deleteThread("thread-1");

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(supabaseThreads.deleteThreadFromSupabase).toHaveBeenCalledWith(
        "thread-1",
      );
    });
  });

  describe("addAssistantMessage", () => {
    it("should throw when no active thread", () => {
      useStore.setState({ activeThreadId: null });

      expect(() =>
        useStore
          .getState()
          .addAssistantMessage([{ text: "Hello", type: "paragraph" }]),
      ).toThrow("no active thread");
    });

    it("should add message with response ID", () => {
      useStore.getState().createThread("thread-1");

      const result = useStore
        .getState()
        .addAssistantMessage(
          [{ text: "Response", type: "paragraph" }],
          "resp-123",
        );

      expect(result.message.role).toBe("assistant");
      expect(result.message.meta?.openaiResponseId).toBe("resp-123");
    });

    it("should persist assistant message to Supabase", async () => {
      useStore.getState().createThread("thread-1");

      useStore
        .getState()
        .addAssistantMessage([{ text: "Hello", type: "paragraph" }]);

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(supabaseThreads.persistThreadSnapshot).toHaveBeenCalled();
    });
  });

  describe("updateThreadTitle", () => {
    it("should persist title update to Supabase", async () => {
      useStore.getState().createThread("thread-1");

      useStore.getState().updateThreadTitle("thread-1", "New Title");

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(supabaseThreads.updateThreadMetadata).toHaveBeenCalledWith(
        "thread-1",
        "New Title",
        expect.any(String),
      );
    });
  });

  describe("mergeThreadFromSupabase", () => {
    it("should update existing thread when merging", () => {
      useStore.getState().createThread("thread-1");
      const originalTitle = useStore
        .getState()
        .threads.find((t) => t.id === "thread-1")?.title;

      const updatedThread = {
        id: "thread-1",
        title: "Updated from DB",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };

      useStore.getState().mergeThreadFromSupabase(updatedThread, [], []);

      const thread = useStore
        .getState()
        .threads.find((t) => t.id === "thread-1");
      expect(thread?.title).toBe("Updated from DB");
      expect(thread?.title).not.toBe(originalTitle);
    });

    it("should add new thread when ID not found", () => {
      useStore.getState().createThread("thread-1");

      const newThread = {
        id: "thread-from-db",
        title: "DB Thread",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };

      useStore.getState().mergeThreadFromSupabase(newThread, [], []);

      expect(useStore.getState().threads).toHaveLength(2);
    });

    it("should replace existing blocks and add new ones", () => {
      useStore.getState().createThread("thread-1");
      useStore.getState().addUserMessage("Hello");
      const existingBlockId = useStore.getState().blocks[0].id;

      const newBlocks = [
        {
          id: existingBlockId,
          messageId: "msg-1",
          type: "paragraph" as const,
          text: "Updated text",
          edited: false,
          selections: [],
          prevText: null,
          isRewritten: false,
        },
        {
          id: "new-block",
          messageId: "msg-2",
          type: "paragraph" as const,
          text: "New block",
          edited: false,
          selections: [],
          prevText: null,
          isRewritten: false,
        },
      ];

      const thread = {
        id: "thread-1",
        title: "Thread",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };

      useStore.getState().mergeThreadFromSupabase(thread, [], newBlocks);

      const blocks = useStore.getState().blocks;
      const updatedBlock = blocks.find((b) => b.id === existingBlockId);
      expect(updatedBlock?.text).toBe("Updated text");
      expect(blocks.find((b) => b.id === "new-block")).toBeDefined();
    });
  });
});
