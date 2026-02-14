import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Hoist mock state
const { mockState } = vi.hoisted(() => ({
  mockState: {
    addSelection: vi.fn(),
    removeSelection: vi.fn(),
    blocks: [] as { id: string; selections: string[] }[],
  },
}));

vi.mock("@/lib/store/useStore", () => ({
  useStore: vi.fn(
    (selector: (s: typeof mockState) => unknown) => selector(mockState),
  ),
}));

import { useTextSelection } from "@/hooks/useTextSelection";

describe("useTextSelection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.blocks = [];
  });

  describe("selections", () => {
    it("returns empty selections when blockId is null", () => {
      const { result } = renderHook(() => useTextSelection(null));
      expect(result.current.selections).toEqual([]);
    });

    it("returns empty selections when block not found", () => {
      mockState.blocks = [
        { id: "other-block", selections: ["some text"] },
      ];
      const { result } = renderHook(() => useTextSelection("missing-block"));
      expect(result.current.selections).toEqual([]);
    });

    it("returns selections from the matching block", () => {
      mockState.blocks = [
        { id: "block-1", selections: ["hello", "world"] },
        { id: "block-2", selections: ["other"] },
      ];
      const { result } = renderHook(() => useTextSelection("block-1"));
      expect(result.current.selections).toEqual(["hello", "world"]);
    });
  });

  describe("addSelectionText", () => {
    it("calls addSelection with blockId and trimmed text", () => {
      const { result } = renderHook(() => useTextSelection("block-1"));

      act(() => {
        result.current.addSelectionText("  hello world  ");
      });

      expect(mockState.addSelection).toHaveBeenCalledWith(
        "block-1",
        "hello world",
      );
    });

    it("does nothing when blockId is null", () => {
      const { result } = renderHook(() => useTextSelection(null));

      act(() => {
        result.current.addSelectionText("hello");
      });

      expect(mockState.addSelection).not.toHaveBeenCalled();
    });

    it("does nothing when text is empty or whitespace", () => {
      const { result } = renderHook(() => useTextSelection("block-1"));

      act(() => {
        result.current.addSelectionText("   ");
      });

      expect(mockState.addSelection).not.toHaveBeenCalled();
    });
  });

  describe("removeSelection", () => {
    it("calls removeSelection with blockId and index", () => {
      const { result } = renderHook(() => useTextSelection("block-1"));

      act(() => {
        result.current.removeSelection(2);
      });

      expect(mockState.removeSelection).toHaveBeenCalledWith("block-1", 2);
    });

    it("does nothing when blockId is null", () => {
      const { result } = renderHook(() => useTextSelection(null));

      act(() => {
        result.current.removeSelection(0);
      });

      expect(mockState.removeSelection).not.toHaveBeenCalled();
    });
  });

  describe("captureSelection", () => {
    it("does nothing when blockId is null", () => {
      const { result } = renderHook(() => useTextSelection(null));

      act(() => {
        result.current.captureSelection(document.createElement("div"));
      });

      expect(mockState.addSelection).not.toHaveBeenCalled();
    });

    it("does nothing when inputElement is null", () => {
      const { result } = renderHook(() => useTextSelection("block-1"));

      act(() => {
        result.current.captureSelection(null);
      });

      expect(mockState.addSelection).not.toHaveBeenCalled();
    });

    it("does nothing when no selection exists", () => {
      vi.spyOn(window, "getSelection").mockReturnValue(null);

      const { result } = renderHook(() => useTextSelection("block-1"));
      const el = document.createElement("div");

      act(() => {
        result.current.captureSelection(el);
      });

      expect(mockState.addSelection).not.toHaveBeenCalled();
    });

    it("does nothing when selection is collapsed", () => {
      const el = document.createElement("div");
      const textNode = document.createTextNode("hello world");
      el.appendChild(textNode);

      const mockRange = {
        collapsed: true,
        commonAncestorContainer: textNode,
      };

      vi.spyOn(window, "getSelection").mockReturnValue({
        rangeCount: 1,
        getRangeAt: () => mockRange,
        anchorNode: textNode,
        focusNode: textNode,
        toString: () => "",
        removeAllRanges: vi.fn(),
      } as unknown as Selection);

      const { result } = renderHook(() => useTextSelection("block-1"));

      act(() => {
        result.current.captureSelection(el);
      });

      expect(mockState.addSelection).not.toHaveBeenCalled();
    });

    it("does nothing when selected text is too short", () => {
      const el = document.createElement("div");
      const textNode = document.createTextNode("hello world");
      el.appendChild(textNode);

      const mockFragment = document.createDocumentFragment();
      mockFragment.appendChild(document.createTextNode("a"));

      const mockRange = {
        collapsed: false,
        commonAncestorContainer: textNode,
        extractContents: () => mockFragment,
        insertNode: vi.fn(),
      };

      vi.spyOn(window, "getSelection").mockReturnValue({
        rangeCount: 1,
        getRangeAt: () => mockRange,
        anchorNode: textNode,
        focusNode: textNode,
        toString: () => "a",
        removeAllRanges: vi.fn(),
      } as unknown as Selection);

      const { result } = renderHook(() => useTextSelection("block-1"));

      act(() => {
        result.current.captureSelection(el);
      });

      expect(mockState.addSelection).not.toHaveBeenCalled();
    });

    it("captures valid text selection and creates mark element", () => {
      const el = document.createElement("div");
      const textNode = document.createTextNode("hello world");
      el.appendChild(textNode);

      const mockFragment = document.createDocumentFragment();
      mockFragment.appendChild(document.createTextNode("hello"));

      const removeAllRanges = vi.fn();
      const insertNode = vi.fn();
      const extractContents = vi.fn().mockReturnValue(mockFragment);

      const mockRange = {
        collapsed: false,
        commonAncestorContainer: textNode,
        extractContents,
        insertNode,
      };

      vi.spyOn(window, "getSelection").mockReturnValue({
        rangeCount: 1,
        getRangeAt: () => mockRange,
        anchorNode: textNode,
        focusNode: textNode,
        toString: () => "hello",
        removeAllRanges,
      } as unknown as Selection);

      const { result } = renderHook(() => useTextSelection("block-1"));

      act(() => {
        result.current.captureSelection(el);
      });

      // Should insert a mark element
      expect(insertNode).toHaveBeenCalledWith(
        expect.objectContaining({
          tagName: "MARK",
          className: "anno",
        }),
      );

      // Should clear browser selection
      expect(removeAllRanges).toHaveBeenCalled();

      // Should add to store
      expect(mockState.addSelection).toHaveBeenCalledWith("block-1", "hello");
    });

    it("does nothing when selection is outside input element", () => {
      const el = document.createElement("div");
      const outsideNode = document.createTextNode("outside");

      vi.spyOn(window, "getSelection").mockReturnValue({
        rangeCount: 1,
        getRangeAt: () => ({
          collapsed: false,
          commonAncestorContainer: outsideNode,
        }),
        anchorNode: outsideNode,
        focusNode: outsideNode,
        toString: () => "outside",
        removeAllRanges: vi.fn(),
      } as unknown as Selection);

      const { result } = renderHook(() => useTextSelection("block-1"));

      act(() => {
        result.current.captureSelection(el);
      });

      expect(mockState.addSelection).not.toHaveBeenCalled();
    });
  });
});
