import { describe, it, expect } from "vitest";
import {
  getCardBlockIds,
  canCreateCard,
  findCardByAnchor,
  removeCard,
  addCard,
} from "@/lib/state/card";
import type { Block } from "@/types/block";
import type { Card } from "@/types/card";

const makeBlock = (overrides: Partial<Block> = {}): Block => ({
  id: "b1",
  messageId: "msg-1",
  type: "paragraph",
  text: "Some text",
  edited: false,
  selections: [],
  prevText: null,
  isRewritten: false,
  ...overrides,
});

const makeCard = (overrides: Partial<Card> = {}): Card => ({
  id: "card-1",
  messageId: "msg-1",
  anchorBlockId: "b1",
  blockIds: ["b1"],
  createdAt: 1000,
  ...overrides,
});

describe("getCardBlockIds", () => {
  it("should return empty array when block not found", () => {
    expect(getCardBlockIds([], "missing", "msg-1")).toEqual([]);
  });

  it("should return single block for non-heading", () => {
    const blocks = [makeBlock({ id: "b1", messageId: "msg-1" })];
    const result = getCardBlockIds(blocks, "b1", "msg-1");
    expect(result).toEqual(["b1"]);
  });

  it("should return empty when block not in message", () => {
    const blocks = [makeBlock({ id: "b1", messageId: "msg-other" })];
    const result = getCardBlockIds(blocks, "b1", "msg-1");
    expect(result).toEqual([]);
  });

  it("should return heading range for heading blocks", () => {
    const blocks = [
      makeBlock({ id: "h1", messageId: "msg-1", type: "heading", text: "## Title" }),
      makeBlock({ id: "p1", messageId: "msg-1", type: "paragraph", text: "Content" }),
      makeBlock({ id: "h2", messageId: "msg-1", type: "heading", text: "## Next" }),
    ];
    const result = getCardBlockIds(blocks, "h1", "msg-1");
    // Should include heading and its content until next same-level heading
    expect(result).toContain("h1");
    expect(result).toContain("p1");
    expect(result).not.toContain("h2");
  });
});

describe("canCreateCard", () => {
  it("should return true when no overlap", () => {
    const cards = [makeCard({ blockIds: ["b2"] })];
    expect(canCreateCard(["b1"], cards)).toBe(true);
  });

  it("should return false when blocks overlap", () => {
    const cards = [makeCard({ blockIds: ["b1", "b2"] })];
    expect(canCreateCard(["b1"], cards)).toBe(false);
  });

  it("should return true with no existing cards", () => {
    expect(canCreateCard(["b1"], [])).toBe(true);
  });
});

describe("findCardByAnchor", () => {
  it("should find card by anchor block", () => {
    const cards = [makeCard({ anchorBlockId: "b1" })];
    expect(findCardByAnchor(cards, "b1")).toBeDefined();
  });

  it("should return undefined when not found", () => {
    const cards = [makeCard({ anchorBlockId: "b1" })];
    expect(findCardByAnchor(cards, "missing")).toBeUndefined();
  });
});

describe("removeCard", () => {
  it("should remove a card by id", () => {
    const cards = [makeCard({ id: "card-1" }), makeCard({ id: "card-2" })];
    const result = removeCard(cards, "card-1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("card-2");
  });
});

describe("addCard", () => {
  it("should add a card to the array", () => {
    const cards = [makeCard({ id: "card-1" })];
    const newCard = makeCard({ id: "card-2" });
    const result = addCard(cards, newCard);
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe("card-2");
  });
});
