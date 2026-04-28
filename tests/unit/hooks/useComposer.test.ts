import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStore } from '@/lib/store/useStore';

const { mockStreamChat, mockFetchBlockAction } = vi.hoisted(() => ({
  mockStreamChat: vi.fn(),
  mockFetchBlockAction: vi.fn(),
}));

vi.mock('@/hooks/useStreaming', () => ({
  useStreaming: () => ({ streamChat: mockStreamChat }),
}));

vi.mock('@/lib/api', () => ({
  generateThreadTitle: vi.fn().mockResolvedValue(null),
  fetchBlockAction: mockFetchBlockAction,
}));

import { useComposer } from '@/hooks/useComposer';

function resetStore() {
  useStore.setState({
    threads: [],
    activeThreadId: null,
    mode: 'thread',
    isAwaitingResponse: false,
    error: null,
    streamingMessageId: null,
    focus: null,
    composerPrompt: '',
  });
  useStore.getState().createThread('t1');
}

describe('useComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  it('returns the composer prompt and surrounding state from the store', () => {
    const { result } = renderHook(() => useComposer());
    expect(result.current.prompt).toBe('');
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('setPrompt updates the store-backed prompt', () => {
    const { result } = renderHook(() => useComposer());
    act(() => result.current.setPrompt('Hello world'));
    expect(useStore.getState().composerPrompt).toBe('Hello world');
  });

  it('clearPrompt empties the prompt and clears the error', () => {
    useStore.setState({ composerPrompt: 'something', error: 'bad' });
    const { result } = renderHook(() => useComposer());
    act(() => result.current.clearPrompt());
    expect(useStore.getState().composerPrompt).toBe('');
    expect(useStore.getState().error).toBeNull();
  });

  describe('handleSubmit', () => {
    it('does nothing for an empty prompt', async () => {
      const { result } = renderHook(() => useComposer());
      await act(async () => {
        await result.current.handleSubmit();
      });
      expect(useStore.getState().threads[0].messages).toHaveLength(0);
      expect(mockStreamChat).not.toHaveBeenCalled();
    });

    it('does nothing while a previous submission is in flight', async () => {
      useStore.setState({ isAwaitingResponse: true, composerPrompt: 'Hello' });
      const { result } = renderHook(() => useComposer());
      await act(async () => {
        await result.current.handleSubmit();
      });
      expect(useStore.getState().threads[0].messages).toHaveLength(0);
    });

    it('appends the user message and streams the assistant reply', async () => {
      mockStreamChat.mockResolvedValue(undefined);
      useStore.setState({ composerPrompt: 'Hello AI' });
      const { result } = renderHook(() => useComposer());

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(useStore.getState().threads[0].messages[0].text).toBe('Hello AI');
      expect(mockStreamChat).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: 'Hello AI', threadId: 't1' }),
        expect.any(Object),
      );
      // Composer is cleared after submission.
      expect(useStore.getState().composerPrompt).toBe('');
    });

    it('creates a thread and seeds a fallback title when starting from landing', async () => {
      mockStreamChat.mockResolvedValue(undefined);
      useStore.setState({
        threads: [],
        activeThreadId: null,
        mode: 'landing',
        composerPrompt: 'First message',
      });
      const { result } = renderHook(() => useComposer());

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(useStore.getState().mode).toBe('thread');
      expect(useStore.getState().threads).toHaveLength(1);
      expect(useStore.getState().threads[0].title).toBe('First message');
    });

    describe('focus mode (ask flow)', () => {
      function openFocus() {
        const message = useStore.getState().addAssistantMessage(
          'Hello world from the assistant.',
        );
        useStore.getState().openEditor(message.id, [0, 5]);
      }

      it('routes the prompt through fetchBlockAction("ask") when an editor is active', async () => {
        openFocus();
        mockFetchBlockAction.mockResolvedValue({
          text: 'It greets the world.',
          responseId: 'resp-ask-1',
        });
        useStore.setState({ composerPrompt: 'what does this mean?' });

        const { result } = renderHook(() => useComposer());
        await act(async () => {
          await result.current.handleSubmit();
        });

        expect(mockFetchBlockAction).toHaveBeenCalledWith(
          'ask',
          'Hello',
          'what does this mean?',
          undefined,
          expect.any(Object),
        );
        // Answer replaces the composer prompt.
        expect(useStore.getState().composerPrompt).toBe('It greets the world.');
        // No new thread messages.
        expect(useStore.getState().threads[0].messages).toHaveLength(1); // just the seed
        // streaming hook is not used.
        expect(mockStreamChat).not.toHaveBeenCalled();
      });

      it('clears isAwaitingResponse when the ask returns', async () => {
        openFocus();
        mockFetchBlockAction.mockResolvedValue({
          text: 'answer',
          responseId: 'r',
        });
        useStore.setState({ composerPrompt: 'q' });
        const { result } = renderHook(() => useComposer());

        await act(async () => {
          await result.current.handleSubmit();
        });

        expect(useStore.getState().isAwaitingResponse).toBe(false);
      });

      it('surfaces an error when the ask request fails', async () => {
        openFocus();
        mockFetchBlockAction.mockRejectedValue(new Error('upstream down'));
        useStore.setState({ composerPrompt: 'q' });
        const { result } = renderHook(() => useComposer());

        await act(async () => {
          await result.current.handleSubmit();
        });

        expect(useStore.getState().error).toContain('upstream down');
        // Prompt is preserved on error so the user can retry.
        expect(useStore.getState().composerPrompt).toBe('q');
        expect(useStore.getState().isAwaitingResponse).toBe(false);
      });
    });
  });
});
