import { describe, it, expect } from "vitest";
import {
  addUserMessage,
  addAssistantMessage,
  addAssistantMessageToThread,
} from "@/lib/state/message";
import type { AppState } from "@/types/state";

const makeState = (overrides: Partial<AppState> = {}): AppState =>
  ({
    threads: [
      {
        id: "thread-1",
        title: "Test",
        createdAt: 1000,
        updatedAt: 1000,
        messages: [],
      },
    ],
    blocks: [],
    cards: [],
    activeThreadId: "thread-1",
    mode: "thread",
    selectedBlockId: null,
    isAwaitingResponse: false,
    error: null,
    ...overrides,
  }) as AppState;

let idCounter = 0;
const testIdFactory = () => `id-${idCounter++}`;
const testNowFactory = () => 1700000000000;

describe("addUserMessage", () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it("should throw when no active thread", () => {
    const state = makeState({ activeThreadId: null });
    expect(() =>
      addUserMessage(state, "Hello", testIdFactory, testNowFactory),
    ).toThrow("Cannot add message: no active thread");
  });

  it("should add a user message with block", () => {
    const state = makeState();
    const result = addUserMessage(
      state,
      "Hello world",
      testIdFactory,
      testNowFactory,
    );

    expect(result.message.role).toBe("user");
    expect(result.message.threadId).toBe("thread-1");
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].text).toBe("Hello world");
    expect(result.blocks[0].type).toBe("paragraph");
    expect(result.state.blocks).toHaveLength(1);
  });
});

describe("addAssistantMessage", () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it("should throw when no active thread", () => {
    const state = makeState({ activeThreadId: null });
    expect(() =>
      addAssistantMessage(
        state,
        [{ type: "paragraph", text: "Hi" }],
        testIdFactory,
        testNowFactory,
      ),
    ).toThrow("Cannot add message: no active thread");
  });

  it("should add an assistant message with blocks", () => {
    const state = makeState();
    const result = addAssistantMessage(
      state,
      [
        { type: "paragraph", text: "First block" },
        { type: "heading", text: "## Title" },
      ],
      testIdFactory,
      testNowFactory,
    );

    expect(result.message.role).toBe("assistant");
    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[0].text).toBe("First block");
    expect(result.blocks[1].text).toBe("## Title");
    expect(result.blocks[1].type).toBe("heading");
  });

  it("should store responseId in meta", () => {
    const state = makeState();
    const result = addAssistantMessage(
      state,
      [{ type: "paragraph", text: "Hello" }],
      testIdFactory,
      testNowFactory,
      "resp-123",
    );

    expect(result.message.meta?.openaiResponseId).toBe("resp-123");
  });

  it("should have empty meta when no responseId", () => {
    const state = makeState();
    const result = addAssistantMessage(
      state,
      [{ type: "paragraph", text: "Hello" }],
      testIdFactory,
      testNowFactory,
    );

    expect(result.message.meta).toEqual({});
  });
});
