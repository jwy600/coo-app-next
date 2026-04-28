import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useStore } from '@/lib/store/useStore';

const { mockFetchRewrite } = vi.hoisted(() => ({
  mockFetchRewrite: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  fetchRewrite: mockFetchRewrite,
}));

import { EditorControls } from '@/components/editor/EditorControls';

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
  const message = useStore.getState().addAssistantMessage('Hello world');
  useStore.getState().openEditor(message.id, [0, 5]);
}

describe('EditorControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  it('renders only Revert and Rewrite (shortcut actions live on the composer)', () => {
    render(<EditorControls />);
    expect(screen.getByRole('button', { name: /Revert/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Rewrite/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Translate/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /ELI5/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Summarize/i })).toBeNull();
  });

  it('disables Revert when no rewrite is pending', () => {
    render(<EditorControls />);
    const revert = screen.getByRole('button', {
      name: /Revert/i,
    }) as HTMLButtonElement;
    expect(revert.disabled).toBe(true);
  });

  it('enables Revert after a rewrite has happened', () => {
    useStore.getState().setRewriteResult('Hi');
    render(<EditorControls />);
    const revert = screen.getByRole('button', {
      name: /Revert/i,
    }) as HTMLButtonElement;
    expect(revert.disabled).toBe(false);
  });

  it('clicking Revert restores the prior buffer via revertRewrite', () => {
    useStore.getState().setRewriteResult('Hi');
    render(<EditorControls />);
    fireEvent.click(screen.getByRole('button', { name: /Revert/i }));
    expect(useStore.getState().focus?.buffer).toBe('Hello');
    expect(useStore.getState().focus?.prevBuffer).toBeNull();
  });

  it('clicking Rewrite calls fetchRewrite with buffer + notes and applies the result', async () => {
    useStore.getState().appendNote('tighten it');
    mockFetchRewrite.mockResolvedValue({ text: 'Howdy', responseId: 'r1' });

    render(<EditorControls />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Rewrite/i }));
    });

    await waitFor(() => {
      expect(useStore.getState().focus?.buffer).toBe('Howdy');
    });
    expect(mockFetchRewrite).toHaveBeenCalledWith(
      'Hello',
      ['tighten it'],
      expect.objectContaining({ apiKey: expect.any(String) }),
    );
    expect(useStore.getState().focus?.prevBuffer).toBe('Hello');
  });

});
