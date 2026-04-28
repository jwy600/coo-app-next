import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockActions, mockStreamChat } = vi.hoisted(() => ({
  mockActions: {
    settings: {
      model: 'gpt-4.1',
      reasoningEffort: 'medium',
      responseLanguage: 'en',
      translateLanguage: 'zh-TW',
      webSearchEnabled: false,
    },
    addUserMessage: vi.fn(),
    mode: 'thread' as 'thread' | 'landing',
    setMode: vi.fn(),
    createThread: vi.fn(),
    activeThreadId: 't1' as string | null,
    updateThreadTitle: vi.fn(),
    isAwaitingResponse: false,
    setAwaitingResponse: vi.fn(),
    error: null as string | null,
    setError: vi.fn(),
  },
  mockStreamChat: vi.fn(),
}));

vi.mock('@/lib/store/useStore', () => {
  const useStoreFn = vi.fn((selector: (s: typeof mockActions) => unknown) =>
    selector(mockActions),
  );
  (useStoreFn as unknown as Record<string, unknown>).getState = vi.fn(() => mockActions);

  return { useStore: useStoreFn };
});

vi.mock('@/hooks/useStreaming', () => ({
  useStreaming: () => ({ streamChat: mockStreamChat }),
}));

vi.mock('@/lib/api', () => ({
  generateThreadTitle: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/state', () => ({
  getLastAssistantResponseId: () => 'prev-resp-id',
  getThreadById: vi.fn(() => ({ id: 't1', title: 'fallback' })),
}));

vi.mock('@/lib/utils/errorHandling', () => ({
  getErrorMessage: (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback,
}));

import { useComposer } from '@/hooks/useComposer';

describe('useComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActions.mode = 'thread';
    mockActions.activeThreadId = 't1';
    mockActions.isAwaitingResponse = false;
    mockActions.error = null;
  });

  it('returns an empty prompt and the surrounding submission state', () => {
    const { result } = renderHook(() => useComposer());
    expect(result.current.prompt).toBe('');
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('updates the prompt via setPrompt', () => {
    const { result } = renderHook(() => useComposer());
    act(() => result.current.setPrompt('Hello world'));
    expect(result.current.prompt).toBe('Hello world');
  });

  it('clearPrompt empties the prompt and clears the error', () => {
    const { result } = renderHook(() => useComposer());
    act(() => result.current.setPrompt('text'));
    act(() => result.current.clearPrompt());
    expect(result.current.prompt).toBe('');
    expect(mockActions.setError).toHaveBeenCalledWith(null);
  });

  describe('handleSubmit', () => {
    it('does nothing for an empty prompt', async () => {
      const { result } = renderHook(() => useComposer());
      await act(async () => {
        await result.current.handleSubmit();
      });
      expect(mockActions.addUserMessage).not.toHaveBeenCalled();
      expect(mockStreamChat).not.toHaveBeenCalled();
    });

    it('does nothing while a previous submission is in flight', async () => {
      mockActions.isAwaitingResponse = true;
      const { result } = renderHook(() => useComposer());
      act(() => result.current.setPrompt('Hello'));
      await act(async () => {
        await result.current.handleSubmit();
      });
      expect(mockActions.addUserMessage).not.toHaveBeenCalled();
    });

    it('appends the user message and streams the assistant reply', async () => {
      mockStreamChat.mockResolvedValue(undefined);
      const { result } = renderHook(() => useComposer());

      act(() => result.current.setPrompt('Hello AI'));
      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockActions.setAwaitingResponse).toHaveBeenCalledWith(true);
      expect(mockActions.addUserMessage).toHaveBeenCalledWith('Hello AI');
      expect(mockStreamChat).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: 'Hello AI', threadId: 't1' }),
        expect.any(Object),
      );
    });

    it('creates a thread and seeds a fallback title when starting from landing', async () => {
      mockActions.mode = 'landing';
      mockStreamChat.mockResolvedValue(undefined);

      const { result } = renderHook(() => useComposer());
      act(() => result.current.setPrompt('First message'));
      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockActions.createThread).toHaveBeenCalled();
      expect(mockActions.setMode).toHaveBeenCalledWith('thread');
      expect(mockActions.updateThreadTitle).toHaveBeenCalled();
    });

    it('truncates a long prompt to 50 chars for the fallback title', async () => {
      mockActions.mode = 'landing';
      mockStreamChat.mockResolvedValue(undefined);

      const { result } = renderHook(() => useComposer());
      const longPrompt = 'A'.repeat(60);
      act(() => result.current.setPrompt(longPrompt));
      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockActions.updateThreadTitle).toHaveBeenCalledWith(
        't1',
        'A'.repeat(50) + '...',
      );
    });

    it('sets an error when submission completes with no active thread', async () => {
      mockActions.activeThreadId = null;
      const { result } = renderHook(() => useComposer());
      act(() => result.current.setPrompt('Hello'));
      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockActions.setError).toHaveBeenCalledWith('No active thread');
      expect(mockActions.setAwaitingResponse).toHaveBeenCalledWith(false);
    });
  });
});
