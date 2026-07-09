import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStore } from '@/lib/store/useStore';

const { mockStreamChat } = vi.hoisted(() => ({
  mockStreamChat: vi.fn(),
}));

vi.mock('@/hooks/useStreaming', () => ({
  useStreaming: () => ({ streamChat: mockStreamChat }),
}));

vi.mock('@/lib/api', () => ({
  generateThreadTitle: vi.fn().mockResolvedValue(null),
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
    composerAttachment: null,
    landingComposerMode: 'chat',
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

    it('still streams a chat reply when an editor is active (no ask short-circuit)', async () => {
      const message = useStore.getState().addAssistantMessage(
        'Hello world from the assistant.',
      );
      useStore.getState().openEditor(message.id, [0, 5]);
      useStore.setState({ composerPrompt: 'follow-up question' });

      const { result } = renderHook(() => useComposer());
      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockStreamChat).toHaveBeenCalledTimes(1);
      const messages = useStore.getState().threads[0].messages;
      expect(messages.some((m) => m.role === 'user' && m.text === 'follow-up question')).toBe(true);
    });

  });

  describe('handleSubmit (upload / Read mode)', () => {
    it('creates a fresh thread with the doc as its first message, titled by file name', async () => {
      mockStreamChat.mockResolvedValue(undefined);
      useStore.setState({
        threads: [],
        activeThreadId: null,
        mode: 'landing',
        landingComposerMode: 'read',
        composerAttachment: { fileName: 'notes.md', text: '# Notes' },
      });
      const { result } = renderHook(() => useComposer());

      await act(async () => {
        await result.current.handleSubmit();
      });

      const state = useStore.getState();
      expect(state.mode).toBe('thread');
      expect(state.threads).toHaveLength(1);
      const msg = state.threads[0].messages[0];
      expect(msg.role).toBe('assistant');
      expect(msg.text).toBe('# Notes');
      expect(msg.meta).toMatchObject({
        source: 'import',
        fileName: 'notes.md',
        registerState: 'registering',
      });
      expect(state.threads[0].title).toBe('notes.md');
      expect(state.composerAttachment).toBeNull();
      expect(mockStreamChat).not.toHaveBeenCalled();
    });

    it('does nothing in Read mode when no file is staged', async () => {
      useStore.setState({
        threads: [],
        activeThreadId: null,
        mode: 'landing',
        landingComposerMode: 'read',
        composerAttachment: null,
      });
      const { result } = renderHook(() => useComposer());

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(useStore.getState().threads).toHaveLength(0);
      expect(mockStreamChat).not.toHaveBeenCalled();
    });
  });
});
