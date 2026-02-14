import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageList } from "@/components/chat/MessageList";
import { createMessage, createBlock } from "@/tests/mocks/fixtures";

// jsdom doesn't implement scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Stub child components to isolate MessageList logic
vi.mock("@/components/chat/UserMessage", () => ({
  UserMessage: ({ message }: { message: { id: string } }) => (
    <div data-testid={`user-msg-${message.id}`}>User</div>
  ),
}));

vi.mock("@/components/chat/AssistantMessage", () => ({
  AssistantMessage: ({
    message,
    blocks,
  }: {
    message: { id: string };
    blocks: { id: string }[];
  }) => (
    <div
      data-testid={`assistant-msg-${message.id}`}
      data-block-count={blocks.length}
    >
      Assistant
    </div>
  ),
}));

vi.mock("@/components/chat/PendingMessage", () => ({
  PendingMessage: () => <div data-testid="pending">Thinking...</div>,
}));

vi.mock("@/components/chat/ErrorMessage", () => ({
  ErrorMessage: ({
    error,
    onRetry,
  }: {
    error: string;
    onRetry?: () => void;
  }) => (
    <div data-testid="error-msg">
      {error}
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

describe("MessageList", () => {
  it("renders user messages", () => {
    const messages = [
      createMessage({
        id: "msg-1",
        role: "user",
        content: [{ blockId: "b1" }],
      }),
    ];
    const blocks = [createBlock({ id: "b1", messageId: "msg-1" })];
    render(<MessageList messages={messages} blocks={blocks} />);
    expect(screen.getByTestId("user-msg-msg-1")).toBeTruthy();
  });

  it("renders assistant messages", () => {
    const messages = [
      createMessage({
        id: "msg-1",
        role: "assistant",
        content: [{ blockId: "b1" }, { blockId: "b2" }],
      }),
    ];
    const blocks = [
      createBlock({ id: "b1", messageId: "msg-1" }),
      createBlock({ id: "b2", messageId: "msg-1" }),
    ];
    render(<MessageList messages={messages} blocks={blocks} />);
    expect(screen.getByTestId("assistant-msg-msg-1")).toBeTruthy();
    expect(
      screen
        .getByTestId("assistant-msg-msg-1")
        .getAttribute("data-block-count"),
    ).toBe("2");
  });

  it("renders mixed user and assistant messages in order", () => {
    const messages = [
      createMessage({
        id: "msg-1",
        role: "user",
        content: [{ blockId: "b1" }],
      }),
      createMessage({
        id: "msg-2",
        role: "assistant",
        content: [{ blockId: "b2" }],
      }),
    ];
    const blocks = [
      createBlock({ id: "b1", messageId: "msg-1" }),
      createBlock({ id: "b2", messageId: "msg-2" }),
    ];
    render(<MessageList messages={messages} blocks={blocks} />);
    expect(screen.getByTestId("user-msg-msg-1")).toBeTruthy();
    expect(screen.getByTestId("assistant-msg-msg-2")).toBeTruthy();
  });

  it("shows PendingMessage when isPending and no selection/cards/streaming", () => {
    render(<MessageList messages={[]} blocks={[]} isPending />);
    expect(screen.getByTestId("pending")).toBeTruthy();
  });

  it("hides PendingMessage when block is selected", () => {
    render(
      <MessageList messages={[]} blocks={[]} isPending selectedBlockId="b1" />,
    );
    expect(screen.queryByTestId("pending")).toBeNull();
  });

  it("hides PendingMessage when cards exist", () => {
    render(
      <MessageList
        messages={[]}
        blocks={[]}
        isPending
        cards={[
          {
            id: "c1",
            messageId: "msg-1",
            anchorBlockId: "b1",
            blockIds: ["b1"],
            createdAt: Date.now(),
          },
        ]}
      />,
    );
    expect(screen.queryByTestId("pending")).toBeNull();
  });

  it("shows ErrorMessage when error exists", () => {
    render(
      <MessageList messages={[]} blocks={[]} error="Something went wrong" />,
    );
    expect(screen.getByTestId("error-msg")).toBeTruthy();
    expect(screen.getByText("Something went wrong")).toBeTruthy();
  });

  it("renders streaming message when present", () => {
    render(
      <MessageList
        messages={[]}
        blocks={[]}
        streamingMessage={{
          messageId: "stream-msg",
          threadId: "thread-1",
          blocks: [{ type: "paragraph", text: "Streaming..." }],
        }}
      />,
    );
    expect(screen.getByTestId("assistant-msg-stream-msg")).toBeTruthy();
  });

  it("does not render streaming message when blocks are empty", () => {
    render(
      <MessageList
        messages={[]}
        blocks={[]}
        streamingMessage={{
          messageId: "stream-msg",
          threadId: "thread-1",
          blocks: [],
        }}
      />,
    );
    expect(screen.queryByTestId("assistant-msg-stream-msg")).toBeNull();
  });

  it('has aria-live="polite" for accessibility', () => {
    const { container } = render(<MessageList messages={[]} blocks={[]} />);
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy();
  });

  it("renders empty state without errors", () => {
    const { container } = render(<MessageList messages={[]} blocks={[]} />);
    expect(container.querySelector(".thread")).toBeTruthy();
  });
});
