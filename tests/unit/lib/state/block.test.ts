import { describe, it, expect } from "vitest";
import { rewriteBlock, undoRewrite, toggleRewrite } from "@/lib/state/block";
import type { AppState } from "@/types/state";
import type { Block } from "@/types/block";

const makeBlock = (overrides: Partial<Block> = {}): Block => ({
  id: "b1",
  messageId: "msg-1",
  type: "paragraph",
  text: "Original text",
  edited: false,
  selections: [],
  prevText: null,
  isRewritten: false,
  ...overrides,
});

const makeState = (blocks: Block[]): AppState =>
  ({
    blocks,
    threads: [],
    cards: [],
    activeThreadId: null,
    mode: "thread",
    selectedBlockId: null,
    isAwaitingResponse: false,
    error: null,
  }) as AppState;

describe("rewriteBlock", () => {
  it("replaces text and stores previous", () => {
    const state = makeState([makeBlock()]);
    const result = rewriteBlock(state, "b1", "New text");
    expect(result.block?.text).toBe("New text");
    expect(result.block?.prevText).toBe("Original text");
    expect(result.block?.isRewritten).toBe(true);
    expect(result.block?.edited).toBe(true);
  });

  it("supports chained rewrites (prev becomes current)", () => {
    const block = makeBlock({
      text: "Second text",
      prevText: "First text",
      isRewritten: true,
    });
    const state = makeState([block]);
    const result = rewriteBlock(state, "b1", "Third text");
    expect(result.block?.text).toBe("Third text");
    expect(result.block?.prevText).toBe("Second text");
  });

  it("preserves heading prefix when rewrite lacks one", () => {
    const block = makeBlock({
      type: "heading",
      text: "## Original heading",
    });
    const state = makeState([block]);
    const result = rewriteBlock(state, "b1", "New heading");
    expect(result.block?.text).toBe("## New heading");
  });

  it("does not double prefix when rewrite already has heading", () => {
    const block = makeBlock({
      type: "heading",
      text: "## Original heading",
    });
    const state = makeState([block]);
    const result = rewriteBlock(state, "b1", "### Different level");
    expect(result.block?.text).toBe("### Different level");
  });

  it("preserves list prefix when rewrite lacks one", () => {
    const block = makeBlock({
      type: "list",
      text: "- List item",
    });
    const state = makeState([block]);
    const result = rewriteBlock(state, "b1", "Updated item");
    expect(result.block?.text).toBe("- Updated item");
  });

  it("does not double prefix when rewrite already has list marker", () => {
    const block = makeBlock({
      type: "list",
      text: "- List item",
    });
    const state = makeState([block]);
    const result = rewriteBlock(state, "b1", "* Different marker");
    expect(result.block?.text).toBe("* Different marker");
  });

  it("preserves numbered list prefix", () => {
    const block = makeBlock({
      type: "list",
      text: "1. First item",
    });
    const state = makeState([block]);
    const result = rewriteBlock(state, "b1", "Updated first");
    expect(result.block?.text).toBe("1. Updated first");
  });

  it("returns null block when blockId not found", () => {
    const state = makeState([makeBlock()]);
    const result = rewriteBlock(state, "missing", "text");
    expect(result.block).toBeNull();
  });

  it("maintains immutability", () => {
    const original = makeBlock();
    const state = makeState([original]);
    const result = rewriteBlock(state, "b1", "New");
    expect(state.blocks[0].text).toBe("Original text");
    expect(result.state.blocks[0].text).toBe("New");
  });
});

describe("undoRewrite", () => {
  it("restores previous text", () => {
    const block = makeBlock({
      text: "Rewritten",
      prevText: "Original text",
      isRewritten: true,
    });
    const state = makeState([block]);
    const result = undoRewrite(state, "b1");
    expect(result.block?.text).toBe("Original text");
    expect(result.block?.prevText).toBeNull();
    expect(result.block?.isRewritten).toBe(false);
    expect(result.block?.edited).toBe(true);
  });

  it("does nothing when not rewritten", () => {
    const block = makeBlock();
    const state = makeState([block]);
    const result = undoRewrite(state, "b1");
    expect(result.block?.text).toBe("Original text");
    expect(result.block?.isRewritten).toBe(false);
  });

  it("does nothing when prevText is null", () => {
    const block = makeBlock({ isRewritten: true, prevText: null });
    const state = makeState([block]);
    const result = undoRewrite(state, "b1");
    expect(result.block?.text).toBe("Original text");
  });
});

describe("toggleRewrite (deprecated)", () => {
  it("applies rewrite when not yet rewritten", () => {
    const state = makeState([makeBlock()]);
    const result = toggleRewrite(state, "b1", "Rewritten text");
    expect(result.block?.text).toBe("Rewritten text");
    expect(result.block?.prevText).toBe("Original text");
    expect(result.block?.isRewritten).toBe(true);
  });

  it("undoes rewrite when already rewritten", () => {
    const block = makeBlock({
      text: "Rewritten",
      prevText: "Original text",
      isRewritten: true,
    });
    const state = makeState([block]);
    const result = toggleRewrite(state, "b1", "ignored");
    expect(result.block?.text).toBe("Original text");
    expect(result.block?.isRewritten).toBe(false);
  });

  it("preserves heading prefix in toggle", () => {
    const block = makeBlock({ type: "heading", text: "## Original" });
    const state = makeState([block]);
    const result = toggleRewrite(state, "b1", "New heading");
    expect(result.block?.text).toBe("## New heading");
  });

  it("preserves list prefix in toggle", () => {
    const block = makeBlock({ type: "list", text: "- List item" });
    const state = makeState([block]);
    const result = toggleRewrite(state, "b1", "Updated item");
    expect(result.block?.text).toBe("- Updated item");
  });
});
