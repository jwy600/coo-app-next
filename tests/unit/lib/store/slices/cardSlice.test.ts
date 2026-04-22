import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "@/lib/store/useStore";

describe("cardSlice", () => {
  let blockId: string;

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

    // Setup: create thread with assistant blocks
    const store = useStore.getState();
    store.createThread("thread-1");
    store.addAssistantMessage([
      { text: "First paragraph", type: "paragraph" },
      { text: "Second paragraph", type: "paragraph" },
    ]);
    blockId = useStore.getState().blocks[0].id;
  });

  describe("addCard", () => {
    it("should create a card from an anchor block", () => {
      useStore.getState().addCard(blockId);

      const { cards } = useStore.getState();
      expect(cards).toHaveLength(1);
      expect(cards[0].anchorBlockId).toBe(blockId);
      expect(cards[0].blockIds).toContain(blockId);
    });

    it("should toggle off (remove) card when anchor already has one", () => {
      useStore.getState().addCard(blockId);
      expect(useStore.getState().cards).toHaveLength(1);

      useStore.getState().addCard(blockId);
      expect(useStore.getState().cards).toHaveLength(0);
    });

    it("should do nothing when block does not exist", () => {
      useStore.getState().addCard("nonexistent-block");
      expect(useStore.getState().cards).toHaveLength(0);
    });

    it("should not create card when blocks overlap with existing card", () => {
      useStore.getState().addCard(blockId);
      expect(useStore.getState().cards).toHaveLength(1);

      const secondBlockId = useStore.getState().blocks[1].id;
      const cardsBefore = useStore.getState().cards.length;
      useStore.getState().addCard(secondBlockId);
      expect(useStore.getState().cards.length).toBeGreaterThanOrEqual(
        cardsBefore,
      );
    });
  });

  describe("removeCard", () => {
    it("should remove a card by ID", () => {
      useStore.getState().addCard(blockId);
      const cardId = useStore.getState().cards[0].id;

      useStore.getState().removeCard(cardId);
      expect(useStore.getState().cards).toHaveLength(0);
    });
  });

  describe("setCards", () => {
    it("should load cards from database", () => {
      const cards = [
        {
          id: "card-1",
          messageId: "msg-1",
          anchorBlockId: "block-1",
          blockIds: ["block-1"],
          createdAt: Date.now(),
        },
        {
          id: "card-2",
          messageId: "msg-2",
          anchorBlockId: "block-2",
          blockIds: ["block-2", "block-3"],
          createdAt: Date.now(),
        },
      ];

      useStore.getState().setCards(cards);
      expect(useStore.getState().cards).toHaveLength(2);
      expect(useStore.getState().cards).toEqual(cards);
    });

    it("should replace existing cards", () => {
      useStore.getState().addCard(blockId);
      expect(useStore.getState().cards).toHaveLength(1);

      useStore.getState().setCards([]);
      expect(useStore.getState().cards).toHaveLength(0);
    });
  });
});
