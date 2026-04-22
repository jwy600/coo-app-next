import { describe, it, expect, beforeEach, vi } from "vitest";
import { useStore } from "@/lib/store/useStore";

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

describe("uiSlice", () => {
  beforeEach(() => {
    useStore.setState({
      threads: [],
      blocks: [],
      activeThreadId: "",
      mode: "landing",
      selectedBlockId: null,
      cards: [],
      isAwaitingResponse: false,
      error: null,
      streamingMessage: null,
    });
  });

  describe("setError", () => {
    it("should set error message", () => {
      useStore.getState().setError("Something went wrong");
      expect(useStore.getState().error).toBe("Something went wrong");
    });

    it("should clear error with null", () => {
      useStore.getState().setError("Error");
      useStore.getState().setError(null);
      expect(useStore.getState().error).toBeNull();
    });
  });

  describe("selectBlock", () => {
    let blockId1: string;
    let blockId2: string;

    beforeEach(() => {
      const store = useStore.getState();
      store.createThread("thread-1");
      store.setMode("thread");
      store.addAssistantMessage([
        { text: "Block 1 text", type: "paragraph" },
        { text: "Block 2 text", type: "paragraph" },
      ]);
      const blocks = useStore.getState().blocks;
      blockId1 = blocks[0].id;
      blockId2 = blocks[1].id;
    });

    it("should clear session state of old block when switching", () => {
      // Add selections to block 1
      useStore.getState().addSelection(blockId1, "selected text");
      useStore.getState().selectBlock(blockId1);

      // Switch to block 2 - should clear block 1's session state
      useStore.getState().selectBlock(blockId2);

      const block1 = useStore
        .getState()
        .blocks.find((b) => b.id === blockId1);
      expect(block1?.selections).toEqual([]);
      expect(block1?.isRewritten).toBe(false);
      expect(useStore.getState().selectedBlockId).toBe(blockId2);
    });

    it("should clear session state when selecting a new block", () => {
      // Rewrite block 1, then select it
      useStore.getState().rewriteBlock(blockId1, "Rewritten");

      // Select block 1 - should clear its session state
      useStore.getState().selectBlock(blockId1);

      const block1 = useStore
        .getState()
        .blocks.find((b) => b.id === blockId1);
      expect(block1?.isRewritten).toBe(false);
      expect(block1?.prevText).toBeNull();
    });
  });

  describe("reset", () => {
    it("should reset all state except settings", () => {
      // Set up various state
      useStore.getState().createThread("thread-1");
      useStore.getState().setMode("thread");
      useStore.getState().addAssistantMessage([
        { text: "Block text", type: "paragraph" },
      ]);
      useStore.getState().setAwaitingResponse(true);
      useStore.getState().setError("error");
      useStore.getState().updateModel("gpt-5.4");

      // Reset
      useStore.getState().reset();

      const state = useStore.getState();
      expect(state.threads).toEqual([]);
      expect(state.blocks).toEqual([]);
      expect(state.cards).toEqual([]);
      expect(state.activeThreadId).toBeNull();
      expect(state.mode).toBe("landing");
      expect(state.selectedBlockId).toBeNull();
      expect(state.isAwaitingResponse).toBe(false);
      expect(state.error).toBeNull();
      expect(state.streamingMessage).toBeNull();

      // Settings should be preserved
      expect(state.settings.model).toBe("gpt-5.4");
    });
  });
});
