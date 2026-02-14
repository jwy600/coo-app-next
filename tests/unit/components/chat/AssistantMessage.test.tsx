import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssistantMessage } from "@/components/chat/AssistantMessage";
import { createMessage, createBlock, createCard } from "@/tests/mocks/fixtures";

// Stub BlockStack to verify props
vi.mock("@/components/chat/BlockStack", () => ({
  BlockStack: ({
    blocks,
    selectedBlockId,
    cards,
  }: {
    blocks: { id: string }[];
    selectedBlockId: string | null;
    cards: { id: string }[];
  }) => (
    <div
      data-testid="block-stack"
      data-block-count={blocks.length}
      data-selected={selectedBlockId}
      data-card-count={cards.length}
    >
      BlockStack
    </div>
  ),
}));

describe("AssistantMessage", () => {
  it('renders "Coo" label', () => {
    const message = createMessage({ id: "msg-1" });
    render(<AssistantMessage message={message} blocks={[]} />);
    expect(screen.getByText("Coo")).toBeTruthy();
  });

  it("renders with assistant-message class", () => {
    const message = createMessage({ id: "msg-1" });
    const { container } = render(
      <AssistantMessage message={message} blocks={[]} />,
    );
    expect(container.querySelector(".assistant-message")).toBeTruthy();
  });

  it("passes blocks to BlockStack", () => {
    const message = createMessage({ id: "msg-1" });
    const blocks = [
      createBlock({ id: "b1", messageId: "msg-1" }),
      createBlock({ id: "b2", messageId: "msg-1" }),
    ];
    render(<AssistantMessage message={message} blocks={blocks} />);
    expect(
      screen.getByTestId("block-stack").getAttribute("data-block-count"),
    ).toBe("2");
  });

  it("filters cards to only those belonging to this message", () => {
    const message = createMessage({ id: "msg-1" });
    const blocks = [createBlock({ id: "b1", messageId: "msg-1" })];
    const cards = [
      createCard({ id: "c1", messageId: "msg-1" }),
      createCard({ id: "c2", messageId: "msg-other" }),
    ];
    render(
      <AssistantMessage message={message} blocks={blocks} cards={cards} />,
    );
    // Only 1 card should be passed (msg-1), not the one for msg-other
    expect(
      screen.getByTestId("block-stack").getAttribute("data-card-count"),
    ).toBe("1");
  });

  it("passes selectedBlockId to BlockStack", () => {
    const message = createMessage({ id: "msg-1" });
    render(
      <AssistantMessage message={message} blocks={[]} selectedBlockId="b1" />,
    );
    expect(
      screen.getByTestId("block-stack").getAttribute("data-selected"),
    ).toBe("b1");
  });

  it("defaults selectedBlockId to null", () => {
    const message = createMessage({ id: "msg-1" });
    render(<AssistantMessage message={message} blocks={[]} />);
    // null prop means attribute is not set, getAttribute returns null
    expect(
      screen.getByTestId("block-stack").getAttribute("data-selected"),
    ).toBeNull();
  });
});
