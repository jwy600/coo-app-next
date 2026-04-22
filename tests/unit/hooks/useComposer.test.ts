import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Hoist mock data
const { mockActions, mockStreamChat, mockFetchBlockAction } = vi.hoisted(
  () => ({
    mockActions: {
      settings: {
        model: "gpt-4.1",
        reasoningEffort: "medium",
        responseLanguage: "en",
        translateLanguage: "zh-TW",
        webSearchEnabled: false,
      },
      selectedBlockId: null as string | null,
      selectedBlockText: "Block text content",
      selectedBlockIsRewritten: false,
      selectedBlockSelections: [] as string[],
      rewriteBlock: vi.fn(),
      addUserMessage: vi.fn(),
      addAssistantMessage: vi.fn(),
      clearSelection: vi.fn(),
      mode: "thread" as string,
      setMode: vi.fn(),
      createThread: vi.fn(),
      activeThreadId: "t1" as string | null,
      updateThreadTitle: vi.fn(),
      isAwaitingResponse: false,
      setAwaitingResponse: vi.fn(),
      error: null as string | null,
      setError: vi.fn(),
    },
    mockStreamChat: vi.fn(),
    mockFetchBlockAction: vi.fn(),
  }),
);

// Mock useStore with selector pattern
vi.mock("@/lib/store/useStore", () => {
  const useStoreFn = vi.fn((selector: (s: typeof mockActions) => unknown) =>
    selector(mockActions),
  );
  (useStoreFn as Record<string, unknown>).getState = vi.fn(() => mockActions);

  return {
    useStore: useStoreFn,
    selectSelectedBlock: (state: typeof mockActions) => {
      if (!state.selectedBlockId) return null;
      return {
        id: state.selectedBlockId,
        text: state.selectedBlockText,
        selections: state.selectedBlockSelections,
        isRewritten: state.selectedBlockIsRewritten,
      };
    },
    selectContentForTransform: (state: typeof mockActions) => {
      if (!state.selectedBlockId) return [];
      return [{ id: state.selectedBlockId, text: "Block text for transform" }];
    },
  };
});

vi.mock("zustand/react/shallow", () => ({
  useShallow: (fn: unknown) => fn,
}));

vi.mock("@/hooks/useStreaming", () => ({
  useStreaming: () => ({ streamChat: mockStreamChat }),
}));

vi.mock("@/lib/api", () => ({
  fetchBlockAction: mockFetchBlockAction,
  generateThreadTitle: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/state", () => ({
  getLastAssistantResponseId: () => "prev-resp-id",
  getThreadById: vi.fn(() => ({ id: "t1", title: "fallback" })),
}));

vi.mock("@/lib/utils/errorHandling", () => ({
  getErrorMessage: (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback,
}));

vi.mock("@/lib/utils/idFactory", () => ({
  idFactory: () => "generated-id",
}));

import { useComposer } from "@/hooks/useComposer";

describe("useComposer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActions.selectedBlockId = null;
    mockActions.selectedBlockText = "Block text content";
    mockActions.selectedBlockIsRewritten = false;
    mockActions.selectedBlockSelections = [];
    mockActions.mode = "thread";
    mockActions.activeThreadId = "t1";
    mockActions.isAwaitingResponse = false;
    mockActions.error = null;
  });

  describe("initial state", () => {
    it("returns empty prompt", () => {
      const { result } = renderHook(() => useComposer());
      expect(result.current.prompt).toBe("");
    });

    it("returns chat composer mode when no block selected", () => {
      const { result } = renderHook(() => useComposer());
      expect(result.current.composerMode).toBe("chat");
    });

    it("returns isSubmitting from store", () => {
      const { result } = renderHook(() => useComposer());
      expect(result.current.isSubmitting).toBe(false);
    });

    it("returns error from store", () => {
      const { result } = renderHook(() => useComposer());
      expect(result.current.error).toBeNull();
    });
  });

  describe("setPrompt", () => {
    it("updates prompt value", () => {
      const { result } = renderHook(() => useComposer());

      act(() => {
        result.current.setPrompt("Hello world");
      });

      expect(result.current.prompt).toBe("Hello world");
    });
  });

  describe("clearPrompt", () => {
    it("clears prompt and error", () => {
      const { result } = renderHook(() => useComposer());

      act(() => {
        result.current.setPrompt("some text");
      });

      act(() => {
        result.current.clearPrompt();
      });

      expect(result.current.prompt).toBe("");
      expect(mockActions.setError).toHaveBeenCalledWith(null);
    });
  });

  describe("composerMode", () => {
    it("switches to ask mode when block is selected", async () => {
      const { result, rerender } = renderHook(() => useComposer());

      mockActions.selectedBlockId = "b1";
      rerender();

      await waitFor(() => {
        expect(result.current.composerMode).toBe("ask");
      });
    });

    it("switches back to chat mode when block is deselected", async () => {
      mockActions.selectedBlockId = "b1";
      const { result, rerender } = renderHook(() => useComposer());

      await waitFor(() => {
        expect(result.current.composerMode).toBe("ask");
      });

      mockActions.selectedBlockId = null;
      rerender();

      await waitFor(() => {
        expect(result.current.composerMode).toBe("chat");
      });
    });

    it("allows manual mode change via setComposerMode", () => {
      mockActions.selectedBlockId = "b1";
      const { result } = renderHook(() => useComposer());

      act(() => {
        result.current.setComposerMode("edit");
      });

      expect(result.current.composerMode).toBe("edit");
    });
  });

  describe("populateWithBlockText", () => {
    it("sets prompt to selected block text", () => {
      mockActions.selectedBlockId = "b1";
      const { result } = renderHook(() => useComposer());

      act(() => {
        result.current.populateWithBlockText();
      });

      expect(result.current.prompt).toBe("Block text content");
    });

    it("does nothing when no block selected", () => {
      mockActions.selectedBlockId = null;
      const { result } = renderHook(() => useComposer());

      act(() => {
        result.current.populateWithBlockText();
      });

      expect(result.current.prompt).toBe("");
    });
  });

  describe("handleSubmit", () => {
    it("does nothing when prompt is empty", async () => {
      const { result } = renderHook(() => useComposer());

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockActions.addUserMessage).not.toHaveBeenCalled();
      expect(mockStreamChat).not.toHaveBeenCalled();
    });

    it("does nothing when already submitting", async () => {
      mockActions.isAwaitingResponse = true;
      const { result } = renderHook(() => useComposer());

      act(() => {
        result.current.setPrompt("Hello");
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockActions.addUserMessage).not.toHaveBeenCalled();
    });

    it("prevents default on form event", async () => {
      const { result } = renderHook(() => useComposer());
      const preventDefault = vi.fn();

      act(() => {
        result.current.setPrompt("Hello");
      });

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault,
        } as unknown as React.FormEvent);
      });

      expect(preventDefault).toHaveBeenCalled();
    });

    describe("chat mode", () => {
      it("adds user message and streams response", async () => {
        mockStreamChat.mockResolvedValue(undefined);
        const { result } = renderHook(() => useComposer());

        act(() => {
          result.current.setPrompt("Hello AI");
        });

        await act(async () => {
          await result.current.handleSubmit();
        });

        expect(mockActions.setAwaitingResponse).toHaveBeenCalledWith(true);
        expect(mockActions.addUserMessage).toHaveBeenCalledWith("Hello AI");
        expect(mockStreamChat).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: "Hello AI",
            threadId: "t1",
            messageId: "generated-id",
          }),
          expect.any(Object),
        );
      });

      it("creates thread when in landing mode", async () => {
        mockActions.mode = "landing";
        mockStreamChat.mockResolvedValue(undefined);

        const { result } = renderHook(() => useComposer());

        act(() => {
          result.current.setPrompt("First message");
        });

        await act(async () => {
          await result.current.handleSubmit();
        });

        expect(mockActions.createThread).toHaveBeenCalled();
        expect(mockActions.setMode).toHaveBeenCalledWith("thread");
        expect(mockActions.updateThreadTitle).toHaveBeenCalled();
      });

      it("truncates thread title to 50 chars", async () => {
        mockActions.mode = "landing";
        mockStreamChat.mockResolvedValue(undefined);

        const { result } = renderHook(() => useComposer());
        const longPrompt = "A".repeat(60);

        act(() => {
          result.current.setPrompt(longPrompt);
        });

        await act(async () => {
          await result.current.handleSubmit();
        });

        expect(mockActions.updateThreadTitle).toHaveBeenCalledWith(
          "t1",
          "A".repeat(50) + "...",
        );
      });

      it("clears prompt after submission", async () => {
        mockStreamChat.mockResolvedValue(undefined);
        const { result } = renderHook(() => useComposer());

        act(() => {
          result.current.setPrompt("Hello");
        });

        await act(async () => {
          await result.current.handleSubmit();
        });

        expect(result.current.prompt).toBe("");
      });

      it("sets error when no active thread", async () => {
        mockActions.activeThreadId = null;
        const { result } = renderHook(() => useComposer());

        act(() => {
          result.current.setPrompt("Hello");
        });

        await act(async () => {
          await result.current.handleSubmit();
        });

        expect(mockActions.setError).toHaveBeenCalledWith("No active thread");
        expect(mockActions.setAwaitingResponse).toHaveBeenCalledWith(false);
      });
    });

    describe("edit mode", () => {
      it("calls rewriteBlock with prompt text", async () => {
        mockActions.selectedBlockId = "b1";
        const { result } = renderHook(() => useComposer());

        act(() => {
          result.current.setComposerMode("edit");
        });

        act(() => {
          result.current.setPrompt("New block text");
        });

        await act(async () => {
          await result.current.handleSubmit();
        });

        expect(mockActions.rewriteBlock).toHaveBeenCalledWith(
          "b1",
          "New block text",
        );
        // Should NOT call streaming API
        expect(mockStreamChat).not.toHaveBeenCalled();
      });
    });

    describe("ask mode (block selected)", () => {
      it("delegates to handleBlockAction with ask", async () => {
        mockActions.selectedBlockId = "b1";
        mockFetchBlockAction.mockResolvedValue({
          text: "AI response about block",
          responseId: "resp-1",
        });

        const { result } = renderHook(() => useComposer());

        act(() => {
          result.current.setPrompt("What does this mean?");
        });

        await act(async () => {
          await result.current.handleSubmit();
        });

        expect(mockFetchBlockAction).toHaveBeenCalledWith(
          "ask",
          "Block text for transform",
          "What does this mean?",
          undefined,
          expect.any(Object),
          undefined,
        );
        // Should NOT call streaming API
        expect(mockStreamChat).not.toHaveBeenCalled();
      });
    });
  });

  describe("handleBlockAction", () => {
    it("sets error when no content selected", async () => {
      mockActions.selectedBlockId = null;
      const { result } = renderHook(() => useComposer());

      await act(async () => {
        await result.current.handleBlockAction("eli5");
      });

      expect(mockActions.setError).toHaveBeenCalledWith("No content selected");
    });

    it("sets error when ask action has no prompt", async () => {
      mockActions.selectedBlockId = "b1";
      const { result } = renderHook(() => useComposer());

      await act(async () => {
        await result.current.handleBlockAction("ask");
      });

      expect(mockActions.setError).toHaveBeenCalledWith(
        "Please enter a question",
      );
    });

    it("calls fetchBlockAction and sets prompt to result", async () => {
      mockActions.selectedBlockId = "b1";
      mockFetchBlockAction.mockResolvedValue({
        text: "Simplified version",
        responseId: "resp-1",
      });

      const { result } = renderHook(() => useComposer());

      await act(async () => {
        await result.current.handleBlockAction("eli5");
      });

      expect(mockFetchBlockAction).toHaveBeenCalledWith(
        "eli5",
        "Block text for transform",
        undefined,
        undefined,
        expect.any(Object),
        undefined,
      );
      expect(result.current.prompt).toBe("Simplified version");
      expect(mockActions.setAwaitingResponse).toHaveBeenCalledWith(false);
    });

    it("passes translate language for translate action", async () => {
      mockActions.selectedBlockId = "b1";
      mockFetchBlockAction.mockResolvedValue({
        text: "Translated",
        responseId: "resp-1",
      });

      const { result } = renderHook(() => useComposer());

      await act(async () => {
        await result.current.handleBlockAction("translate");
      });

      expect(mockFetchBlockAction).toHaveBeenCalledWith(
        "translate",
        "Block text for transform",
        undefined,
        "zh-TW",
        expect.any(Object),
        undefined,
      );
    });

    it("passes prompt for ask action", async () => {
      mockActions.selectedBlockId = "b1";
      mockFetchBlockAction.mockResolvedValue({
        text: "Answer",
        responseId: "resp-1",
      });

      const { result } = renderHook(() => useComposer());

      act(() => {
        result.current.setPrompt("My question");
      });

      await act(async () => {
        await result.current.handleBlockAction("ask");
      });

      expect(mockFetchBlockAction).toHaveBeenCalledWith(
        "ask",
        "Block text for transform",
        "My question",
        undefined,
        expect.any(Object),
        undefined,
      );
    });

    it("chains follow-up ask with previous responseId for same block", async () => {
      mockActions.selectedBlockId = "b1";
      mockFetchBlockAction
        .mockResolvedValueOnce({ text: "warp means abc", responseId: "resp-1" })
        .mockResolvedValueOnce({ text: "abc is ...", responseId: "resp-2" });

      const { result } = renderHook(() => useComposer());

      act(() => {
        result.current.setPrompt("what does warp mean?");
      });
      await act(async () => {
        await result.current.handleBlockAction("ask");
      });

      act(() => {
        result.current.setPrompt("what is abc?");
      });
      await act(async () => {
        await result.current.handleBlockAction("ask");
      });

      expect(mockFetchBlockAction).toHaveBeenNthCalledWith(
        1,
        "ask",
        "Block text for transform",
        "what does warp mean?",
        undefined,
        expect.any(Object),
        undefined,
      );
      expect(mockFetchBlockAction).toHaveBeenNthCalledWith(
        2,
        "ask",
        "Block text for transform",
        "what is abc?",
        undefined,
        expect.any(Object),
        "resp-1",
      );
    });

    it("does not chain previousResponseId for non-ask actions", async () => {
      mockActions.selectedBlockId = "b1";
      mockFetchBlockAction
        .mockResolvedValueOnce({ text: "answer", responseId: "resp-1" })
        .mockResolvedValueOnce({ text: "simpler", responseId: "resp-2" });

      const { result } = renderHook(() => useComposer());

      act(() => {
        result.current.setPrompt("a question");
      });
      await act(async () => {
        await result.current.handleBlockAction("ask");
      });

      await act(async () => {
        await result.current.handleBlockAction("eli5");
      });

      expect(mockFetchBlockAction).toHaveBeenNthCalledWith(
        2,
        "eli5",
        "Block text for transform",
        undefined,
        undefined,
        expect.any(Object),
        undefined,
      );
    });

    it("resets ask chain when a different block is selected", async () => {
      mockActions.selectedBlockId = "b1";
      mockFetchBlockAction
        .mockResolvedValueOnce({ text: "first answer", responseId: "resp-1" })
        .mockResolvedValueOnce({ text: "second answer", responseId: "resp-2" });

      const { result, rerender } = renderHook(() => useComposer());

      act(() => {
        result.current.setPrompt("first question");
      });
      await act(async () => {
        await result.current.handleBlockAction("ask");
      });

      mockActions.selectedBlockId = "b2";
      rerender();

      act(() => {
        result.current.setPrompt("question on new block");
      });
      await act(async () => {
        await result.current.handleBlockAction("ask");
      });

      expect(mockFetchBlockAction).toHaveBeenNthCalledWith(
        2,
        "ask",
        "Block text for transform",
        "question on new block",
        undefined,
        expect.any(Object),
        undefined,
      );
    });

    it("invalidates chain when the selected block's text changes (edit)", async () => {
      mockActions.selectedBlockId = "b1";
      mockFetchBlockAction
        .mockResolvedValueOnce({ text: "first answer", responseId: "resp-1" })
        .mockResolvedValueOnce({ text: "second answer", responseId: "resp-2" });

      const { result, rerender } = renderHook(() => useComposer());

      act(() => {
        result.current.setPrompt("first question");
      });
      await act(async () => {
        await result.current.handleBlockAction("ask");
      });

      // Simulate the user editing the block text while it remains selected.
      mockActions.selectedBlockText = "Block text AFTER edit";
      mockActions.selectedBlockIsRewritten = true;
      rerender();

      act(() => {
        result.current.setPrompt("follow-up question");
      });
      await act(async () => {
        await result.current.handleBlockAction("ask");
      });

      // Chain must NOT carry the stale previousResponseId into the post-edit ask.
      expect(mockFetchBlockAction).toHaveBeenNthCalledWith(
        2,
        "ask",
        "Block text for transform",
        "follow-up question",
        undefined,
        expect.any(Object),
        undefined,
      );
    });

    it("invalidates chain when the selected block's selections change (strikethrough)", async () => {
      mockActions.selectedBlockId = "b1";
      mockFetchBlockAction
        .mockResolvedValueOnce({ text: "first answer", responseId: "resp-1" })
        .mockResolvedValueOnce({ text: "second answer", responseId: "resp-2" });

      const { result, rerender } = renderHook(() => useComposer());

      act(() => {
        result.current.setPrompt("first question");
      });
      await act(async () => {
        await result.current.handleBlockAction("ask");
      });

      // Simulate a strikethrough adding a selection.
      mockActions.selectedBlockSelections = ["phrase"];
      rerender();

      act(() => {
        result.current.setPrompt("follow-up question");
      });
      await act(async () => {
        await result.current.handleBlockAction("ask");
      });

      expect(mockFetchBlockAction).toHaveBeenNthCalledWith(
        2,
        "ask",
        "Block text for transform",
        "follow-up question",
        undefined,
        expect.any(Object),
        undefined,
      );
    });

    it("drops response and preserves chain when block switches mid-request", async () => {
      mockActions.selectedBlockId = "b1";
      let resolveAsk: ((value: unknown) => void) | null = null;
      mockFetchBlockAction.mockImplementationOnce(
        () =>
          new Promise((res) => {
            resolveAsk = res;
          }),
      );

      const { result, rerender } = renderHook(() => useComposer());

      act(() => {
        result.current.setPrompt("question on b1");
      });

      let askPromise: Promise<void>;
      act(() => {
        askPromise = result.current.handleBlockAction("ask");
      });

      // User switches block BEFORE the ask resolves.
      mockActions.selectedBlockId = "b2";
      rerender();

      await act(async () => {
        resolveAsk!({ text: "answer for b1", responseId: "resp-1" });
        await askPromise!;
      });

      // Prompt on the new block should NOT be overwritten by b1's stale answer.
      expect(result.current.prompt).not.toBe("answer for b1");

      // Asking on b2 should start a fresh chain — no previousResponseId leaked.
      mockFetchBlockAction.mockResolvedValueOnce({
        text: "answer for b2",
        responseId: "resp-2",
      });
      act(() => {
        result.current.setPrompt("question on b2");
      });
      await act(async () => {
        await result.current.handleBlockAction("ask");
      });

      expect(mockFetchBlockAction).toHaveBeenNthCalledWith(
        2,
        "ask",
        "Block text for transform",
        "question on b2",
        undefined,
        expect.any(Object),
        undefined,
      );
    });

    it("handles API error without clearing prompt", async () => {
      mockActions.selectedBlockId = "b1";
      mockFetchBlockAction.mockRejectedValue(new Error("API failed"));

      const { result } = renderHook(() => useComposer());

      act(() => {
        result.current.setPrompt("Keep this on error");
      });

      await act(async () => {
        await result.current.handleBlockAction("eli5");
      });

      expect(mockActions.setError).toHaveBeenCalledWith("API failed");
      // Prompt should NOT be cleared on error
      expect(result.current.prompt).toBe("Keep this on error");
      expect(mockActions.setAwaitingResponse).toHaveBeenCalledWith(false);
    });
  });
});
