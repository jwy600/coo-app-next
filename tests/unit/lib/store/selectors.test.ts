import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  useStore,
  selectActiveThread,
  selectSelectedBlock,
  selectContentForTransform,
  selectCards,
  selectAllCardBlocks,
  selectMessagesByThread,
  selectActiveThreadBlocks,
  selectBlocksByThread,
} from "@/lib/store/useStore";
import type { StoreState } from "@/lib/store/useStore";

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

describe("Store Selectors", () => {
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

  describe("selectContentForTransform", () => {
    it("should return empty array when no block selected", () => {
      const state = useStore.getState() as StoreState;
      expect(selectContentForTransform(state)).toEqual([]);
    });

    it("should return selected block in an array", () => {
      useStore.getState().createThread("thread-1");
      useStore.getState().setMode("thread");
      useStore.getState().addAssistantMessage([
        { text: "Test text", type: "paragraph" },
      ]);
      const blockId = useStore.getState().blocks[0].id;
      useStore.getState().selectBlock(blockId);

      const state = useStore.getState() as StoreState;
      const result = selectContentForTransform(state);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(blockId);
    });

    it("should return empty array when selected block does not exist", () => {
      useStore.setState({ selectedBlockId: "nonexistent" });
      const state = useStore.getState() as StoreState;
      expect(selectContentForTransform(state)).toEqual([]);
    });
  });

  describe("selectCards", () => {
    it("should return cards belonging to the active thread", () => {
      useStore.getState().createThread("thread-1");
      useStore.getState().addAssistantMessage([
        { text: "Block 1", type: "paragraph" },
      ]);

      const state = useStore.getState();
      const messageId = state.threads.find((t) => t.id === "thread-1")!
        .messages[0].id;

      const cards = [
        {
          id: "card-1",
          messageId,
          anchorBlockId: "b1",
          blockIds: ["b1"],
          createdAt: Date.now(),
        },
      ];
      useStore.setState({ cards });

      const result = selectCards(useStore.getState() as StoreState);
      expect(result).toEqual(cards);
    });

    it("should return empty array when no cards", () => {
      const state = useStore.getState() as StoreState;
      expect(selectCards(state)).toEqual([]);
    });
  });

  describe("selectAllCardBlocks", () => {
    it("should return blocks that belong to any card", () => {
      useStore.getState().createThread("thread-1");
      useStore.getState().addAssistantMessage([
        { text: "Block 1", type: "paragraph" },
        { text: "Block 2", type: "paragraph" },
        { text: "Block 3", type: "paragraph" },
      ]);

      const state = useStore.getState();
      const blocks = state.blocks;
      const messageId = state.threads.find((t) => t.id === "thread-1")!
        .messages[0].id;
      // Manually set cards referencing block IDs
      useStore.setState({
        cards: [
          {
            id: "card-1",
            messageId,
            anchorBlockId: blocks[0].id,
            blockIds: [blocks[0].id, blocks[1].id],
            createdAt: Date.now(),
          },
        ],
      });

      const updatedState = useStore.getState() as StoreState;
      const cardBlocks = selectAllCardBlocks(updatedState);
      expect(cardBlocks).toHaveLength(2);
      expect(cardBlocks.map((b) => b.id)).toContain(blocks[0].id);
      expect(cardBlocks.map((b) => b.id)).toContain(blocks[1].id);
      expect(cardBlocks.map((b) => b.id)).not.toContain(blocks[2].id);
    });

    it("should return empty array when no cards exist", () => {
      const state = useStore.getState() as StoreState;
      expect(selectAllCardBlocks(state)).toEqual([]);
    });
  });

  describe("selectMessagesByThread", () => {
    it("should return messages for specified thread", () => {
      useStore.getState().createThread("thread-1");
      useStore.getState().addUserMessage("Hello");
      useStore.getState().addAssistantMessage([
        { text: "Hi", type: "paragraph" },
      ]);

      const state = useStore.getState() as StoreState;
      const messages = selectMessagesByThread("thread-1")(state);
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("user");
      expect(messages[1].role).toBe("assistant");
    });

    it("should return empty array for nonexistent thread", () => {
      const state = useStore.getState() as StoreState;
      const messages = selectMessagesByThread("nonexistent")(state);
      expect(messages).toEqual([]);
    });
  });

  describe("selectActiveThreadBlocks", () => {
    it("should return blocks for the active thread only", () => {
      useStore.getState().createThread("thread-1");
      useStore.getState().addUserMessage("Thread 1 msg");

      useStore.getState().createThread("thread-2");
      useStore.getState().addUserMessage("Thread 2 msg");

      // Active thread is thread-2
      const state = useStore.getState() as StoreState;
      const activeBlocks = selectActiveThreadBlocks(state);

      // Should only include blocks from thread-2
      expect(activeBlocks).toHaveLength(1);
      expect(activeBlocks[0].text).toBe("Thread 2 msg");
    });

    it("should return empty array when no active thread", () => {
      useStore.setState({ activeThreadId: null });
      const state = useStore.getState() as StoreState;
      expect(selectActiveThreadBlocks(state)).toEqual([]);
    });
  });

  describe("selectBlocksByThread", () => {
    it("should return blocks for specified thread", () => {
      useStore.getState().createThread("thread-1");
      useStore.getState().addUserMessage("T1 message");

      useStore.getState().createThread("thread-2");
      useStore.getState().addUserMessage("T2 message");

      const state = useStore.getState() as StoreState;
      const t1Blocks = selectBlocksByThread("thread-1")(state);
      expect(t1Blocks).toHaveLength(1);
      expect(t1Blocks[0].text).toBe("T1 message");
    });

    it("should return empty array for nonexistent thread", () => {
      const state = useStore.getState() as StoreState;
      expect(selectBlocksByThread("nonexistent")(state)).toEqual([]);
    });
  });

  describe("selectActiveThread", () => {
    it("should return undefined when no threads", () => {
      useStore.setState({ activeThreadId: null, threads: [] });
      const state = useStore.getState() as StoreState;
      expect(selectActiveThread(state)).toBeUndefined();
    });
  });

  describe("selectSelectedBlock", () => {
    it("should return null when selectedBlockId is set but block not found", () => {
      useStore.setState({ selectedBlockId: "ghost-block" });
      const state = useStore.getState() as StoreState;
      expect(selectSelectedBlock(state)).toBeNull();
    });
  });
});
