import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "@/lib/store/useStore";

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
  });

  describe("updateThreadTitle", () => {
    it("should update the title on the thread", () => {
      useStore.getState().createThread("thread-1");

      useStore.getState().updateThreadTitle("thread-1", "New Title");

      const thread = useStore
        .getState()
        .threads.find((t) => t.id === "thread-1");
      expect(thread?.title).toBe("New Title");
    });
  });
});
