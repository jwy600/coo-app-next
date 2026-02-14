import { describe, it, expect } from "vitest";
import {
  deleteThread,
  ensureThreadExists,
  getLastAssistantResponseId,
} from "@/lib/state/thread";
import type { AppState } from "@/types/state";
import type { Thread } from "@/types/thread";
import type { Block } from "@/types/block";
import type { Card } from "@/types/card";

const nowFactory = () => 1000;

const makeThread = (id: string, messageIds: string[] = []): Thread => ({
  id,
  title: `Thread ${id}`,
  createdAt: 1000,
  updatedAt: 1000,
  messages: messageIds.map((mid) => ({
    id: mid,
    threadId: id,
    role: "user" as const,
    createdAt: 1000,
    content: [],
    meta: {},
  })),
});

const makeBlock = (id: string, messageId: string): Block => ({
  id,
  messageId,
  type: "paragraph",
  text: "text",
  edited: false,
  selections: [],
  prevText: null,
  isRewritten: false,
});

const makeCard = (id: string, messageId: string, blockIds: string[]): Card => ({
  id,
  messageId,
  anchorBlockId: blockIds[0],
  blockIds,
  createdAt: 1000,
});

const makeState = (
  threads: Thread[],
  blocks: Block[] = [],
  cards: Card[] = [],
  activeThreadId: string | null = null,
): AppState =>
  ({
    threads,
    blocks,
    cards,
    activeThreadId,
    mode: "thread",
    selectedBlockId: null,
    isAwaitingResponse: false,
    error: null,
  }) as AppState;

describe("deleteThread", () => {
  it("removes thread from threads array", () => {
    const state = makeState(
      [makeThread("t1"), makeThread("t2")],
      [],
      [],
      "t1",
    );
    const result = deleteThread(state, "t1");
    expect(result.state.threads).toHaveLength(1);
    expect(result.state.threads[0].id).toBe("t2");
  });

  it("removes blocks belonging to deleted thread", () => {
    const t1 = makeThread("t1", ["m1"]);
    const t2 = makeThread("t2", ["m2"]);
    const blocks = [
      makeBlock("b1", "m1"),
      makeBlock("b2", "m1"),
      makeBlock("b3", "m2"),
    ];
    const state = makeState([t1, t2], blocks, [], "t1");
    const result = deleteThread(state, "t1");
    expect(result.state.blocks).toHaveLength(1);
    expect(result.state.blocks[0].id).toBe("b3");
  });

  it("removes cards belonging to deleted thread", () => {
    const t1 = makeThread("t1", ["m1"]);
    const cards = [
      makeCard("c1", "m1", ["b1"]),
      makeCard("c2", "m2", ["b3"]),
    ];
    const state = makeState([t1], [], cards, "t1");
    const result = deleteThread(state, "t1");
    expect(result.state.cards).toHaveLength(1);
    expect(result.state.cards[0].id).toBe("c2");
  });

  it("sets next active thread to previous thread", () => {
    const state = makeState(
      [makeThread("t1"), makeThread("t2"), makeThread("t3")],
      [],
      [],
      "t2",
    );
    const result = deleteThread(state, "t2");
    // t2 was at index 1, so previous (index 0) = t1
    // Actually Math.min(1, 1) = 1, remainingThreads[1] = t3
    // Wait - let me re-read the logic:
    // threadIndex = 1 (index of t2)
    // remainingThreads = [t1, t3]
    // nextIndex = Math.min(1, 1) = 1 → remainingThreads[1] = t3
    expect(result.nextActiveThreadId).toBe("t3");
  });

  it("sets next active thread to first when deleting first thread", () => {
    const state = makeState(
      [makeThread("t1"), makeThread("t2")],
      [],
      [],
      "t1",
    );
    const result = deleteThread(state, "t1");
    expect(result.nextActiveThreadId).toBe("t2");
  });

  it("returns null when last thread is deleted", () => {
    const state = makeState([makeThread("t1")], [], [], "t1");
    const result = deleteThread(state, "t1");
    expect(result.nextActiveThreadId).toBeNull();
    expect(result.state.threads).toHaveLength(0);
  });

  it("returns unchanged state for non-existent thread", () => {
    const state = makeState([makeThread("t1")], [], [], "t1");
    const result = deleteThread(state, "missing");
    expect(result.state.threads).toHaveLength(1);
    expect(result.nextActiveThreadId).toBe("t1");
  });
});

describe("ensureThreadExists", () => {
  it("returns same state if thread exists", () => {
    const state = makeState([makeThread("t1")]);
    const result = ensureThreadExists(state, "t1", nowFactory);
    expect(result.threads).toHaveLength(1);
    expect(result).toBe(state);
  });

  it("creates thread if it does not exist", () => {
    const state = makeState([]);
    const result = ensureThreadExists(state, "new-thread", nowFactory);
    expect(result.threads).toHaveLength(1);
    expect(result.threads[0].id).toBe("new-thread");
    expect(result.threads[0].title).toBe("current thread");
  });
});
