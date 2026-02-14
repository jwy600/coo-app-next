import { describe, it, expect, beforeEach, vi } from "vitest";
import { useStore } from "@/lib/store/useStore";
import * as supabaseBlocks from "@/lib/supabase/blocks";

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

describe("blockSlice", () => {
  let blockId: string;

  beforeEach(() => {
    // Reset store
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

    // Setup: create thread with an assistant block
    const store = useStore.getState();
    store.createThread("thread-1");
    store.addAssistantMessage([
      { text: "Original block text", type: "paragraph" },
    ]);
    blockId = useStore.getState().blocks[0].id;
    vi.clearAllMocks(); // Clear setup persistence calls
  });

  describe("rewriteBlock", () => {
    it("should rewrite block text", () => {
      useStore.getState().rewriteBlock(blockId, "New text");

      const block = useStore.getState().blocks.find((b) => b.id === blockId);
      expect(block?.text).toBe("New text");
      expect(block?.prevText).toBe("Original block text");
      expect(block?.isRewritten).toBe(true);
    });

    it("should persist rewrite to Supabase", async () => {
      useStore.getState().rewriteBlock(blockId, "Rewritten");

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(supabaseBlocks.persistBlockUpdate).toHaveBeenCalled();
    });

    it("should maintain immutability", () => {
      const blocksBefore = useStore.getState().blocks;
      useStore.getState().rewriteBlock(blockId, "New text");
      const blocksAfter = useStore.getState().blocks;

      expect(blocksAfter).not.toBe(blocksBefore);
    });
  });

  describe("undoRewrite", () => {
    it("should undo a rewrite and restore original text", () => {
      useStore.getState().rewriteBlock(blockId, "Rewritten text");
      useStore.getState().undoRewrite(blockId);

      const block = useStore.getState().blocks.find((b) => b.id === blockId);
      expect(block?.text).toBe("Original block text");
      expect(block?.isRewritten).toBe(false);
    });

    it("should persist undo to Supabase", async () => {
      useStore.getState().rewriteBlock(blockId, "Rewritten text");
      vi.clearAllMocks();

      useStore.getState().undoRewrite(blockId);

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(supabaseBlocks.persistBlockUpdate).toHaveBeenCalled();
    });
  });

  describe("addSelection", () => {
    it("should add a text selection to a block", () => {
      useStore.getState().addSelection(blockId, "selected");

      const block = useStore.getState().blocks.find((b) => b.id === blockId);
      expect(block?.selections).toContain("selected");
    });
  });

  describe("removeSelection", () => {
    it("should remove a selection by index", () => {
      useStore.getState().addSelection(blockId, "first");
      useStore.getState().addSelection(blockId, "second");
      useStore.getState().removeSelection(blockId, 0);

      const block = useStore.getState().blocks.find((b) => b.id === blockId);
      expect(block?.selections).toEqual(["second"]);
    });
  });

  describe("clearSelections", () => {
    it("should clear all selections from a block", () => {
      useStore.getState().addSelection(blockId, "first");
      useStore.getState().addSelection(blockId, "second");
      useStore.getState().clearSelections(blockId);

      const block = useStore.getState().blocks.find((b) => b.id === blockId);
      expect(block?.selections).toEqual([]);
    });
  });
});
