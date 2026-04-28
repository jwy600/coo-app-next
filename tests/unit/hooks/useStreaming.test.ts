import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockStoreActions, mockFetchStream } = vi.hoisted(() => ({
  mockStoreActions: {
    addAssistantMessage: vi.fn(),
    appendMessageText: vi.fn(),
    setMessageResponseId: vi.fn(),
    removeMessage: vi.fn(),
    startStreaming: vi.fn(),
    clearStream: vi.fn(),
  },
  mockFetchStream: vi.fn(),
}));

vi.mock('@/lib/store/useStore', () => {
  const storeState = {
    ...mockStoreActions,
    threads: [] as { messages: { id: string; text: string }[] }[],
  };

  const useStoreFn = vi.fn(
    (selector: (s: typeof storeState) => unknown) => selector(storeState),
  );
  (useStoreFn as unknown as Record<string, unknown>).getState = vi.fn(() => storeState);

  return { useStore: useStoreFn };
});

vi.mock('@/lib/api', () => ({
  fetchChatCompletionStream: mockFetchStream,
}));

vi.mock('@/lib/utils/errorHandling', () => ({
  getErrorMessage: (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback,
}));

import { useStreaming } from '@/hooks/useStreaming';
import { useStore } from '@/lib/store/useStore';

const setStoreState = (overrides: Record<string, unknown> = {}) => {
  const merged = {
    ...mockStoreActions,
    threads: [{ messages: [{ id: 'msg-new', text: '' }] }],
    ...overrides,
  };
  (useStore.getState as ReturnType<typeof vi.fn>).mockReturnValue(merged);
};

describe('useStreaming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreActions.addAssistantMessage.mockReturnValue({ id: 'msg-new' });
    setStoreState();
  });

  it('returns a streamChat function', () => {
    const { result } = renderHook(() => useStreaming());
    expect(typeof result.current.streamChat).toBe('function');
  });

  it('creates an empty assistant message and registers it as streaming', async () => {
    mockFetchStream.mockResolvedValue(undefined);
    const { result } = renderHook(() => useStreaming());

    await result.current.streamChat({ prompt: 'Hello', threadId: 't1' });

    expect(mockStoreActions.addAssistantMessage).toHaveBeenCalledWith('');
    expect(mockStoreActions.startStreaming).toHaveBeenCalledWith('msg-new');
  });

  it('appends each token to the live message', async () => {
    mockFetchStream.mockImplementation(
      async (
        _prompt: string,
        callbacks: { onToken: (t: string) => void; onComplete: () => void },
      ) => {
        callbacks.onToken('Hello');
        callbacks.onToken(' world');
        setStoreState({
          threads: [{ messages: [{ id: 'msg-new', text: 'Hello world' }] }],
        });
        callbacks.onComplete();
      },
    );

    const { result } = renderHook(() => useStreaming());
    const onComplete = vi.fn();

    await result.current.streamChat(
      { prompt: 'test', threadId: 't1' },
      { onComplete },
    );

    expect(mockStoreActions.appendMessageText).toHaveBeenNthCalledWith(1, 'msg-new', 'Hello');
    expect(mockStoreActions.appendMessageText).toHaveBeenNthCalledWith(2, 'msg-new', ' world');
    expect(mockStoreActions.clearStream).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith('msg-new', undefined);
  });

  it('forwards the response id to setMessageResponseId and onComplete', async () => {
    mockFetchStream.mockImplementation(
      async (
        _prompt: string,
        callbacks: {
          onResponseId: (id: string) => void;
          onComplete: () => void;
        },
      ) => {
        callbacks.onResponseId('resp-123');
        setStoreState({
          threads: [{ messages: [{ id: 'msg-new', text: 'X' }] }],
        });
        callbacks.onComplete();
      },
    );

    const { result } = renderHook(() => useStreaming());
    const onComplete = vi.fn();

    await result.current.streamChat(
      { prompt: 'test', threadId: 't1' },
      { onComplete },
    );

    expect(mockStoreActions.setMessageResponseId).toHaveBeenCalledWith(
      'msg-new',
      'resp-123',
    );
    expect(onComplete).toHaveBeenCalledWith('msg-new', 'resp-123');
  });

  it('removes the empty placeholder message when the stream produces no tokens', async () => {
    mockFetchStream.mockImplementation(
      async (_prompt: string, callbacks: { onComplete: () => void }) => {
        // text remains '' on the message
        callbacks.onComplete();
      },
    );

    const { result } = renderHook(() => useStreaming());
    await result.current.streamChat({ prompt: 'test', threadId: 't1' });

    expect(mockStoreActions.removeMessage).toHaveBeenCalledWith('msg-new');
  });

  it('handles errors raised through onError', async () => {
    mockFetchStream.mockImplementation(
      async (
        _prompt: string,
        callbacks: { onError: (err: Error) => void },
      ) => {
        callbacks.onError(new Error('Stream failed'));
      },
    );

    const onError = vi.fn();
    const { result } = renderHook(() => useStreaming());
    await result.current.streamChat(
      { prompt: 'test', threadId: 't1' },
      { onError },
    );

    expect(mockStoreActions.removeMessage).toHaveBeenCalledWith('msg-new');
    expect(mockStoreActions.clearStream).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('Stream failed');
  });

  it('handles thrown errors from fetchChatCompletionStream', async () => {
    mockFetchStream.mockRejectedValue(new Error('Network error'));
    const onError = vi.fn();

    const { result } = renderHook(() => useStreaming());
    await result.current.streamChat(
      { prompt: 'test', threadId: 't1' },
      { onError },
    );

    expect(mockStoreActions.removeMessage).toHaveBeenCalledWith('msg-new');
    expect(onError).toHaveBeenCalledWith('Network error');
  });

  it('passes settings and previousResponseId through to fetchChatCompletionStream', async () => {
    mockFetchStream.mockResolvedValue(undefined);
    const { result } = renderHook(() => useStreaming());

    const settings = {
      model: 'gpt-4.1',
      reasoningEffort: 'medium',
      responseLanguage: 'en',
      translateLanguage: 'zh-TW',
      webSearchEnabled: false,
    };

    await result.current.streamChat({
      prompt: 'test',
      threadId: 't1',
      previousResponseId: 'prev-resp',
      settings: settings as never,
    });

    expect(mockFetchStream).toHaveBeenCalledWith(
      'test',
      expect.any(Object),
      't1',
      'prev-resp',
      settings,
    );
  });
});
