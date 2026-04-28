import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useStore } from '@/lib/store/useStore';

const { mockFetchRewrite, mockFetchBlockAction } = vi.hoisted(() => ({
  mockFetchRewrite: vi.fn(),
  mockFetchBlockAction: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  fetchRewrite: mockFetchRewrite,
  fetchBlockAction: mockFetchBlockAction,
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

  it('renders Revert, Rewrite, Translate, ELI5, Summarize buttons', () => {
    render(<EditorControls />);
    expect(screen.getByRole('button', { name: /Revert/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Rewrite/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Translate/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /ELI5/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Summarize/i })).toBeTruthy();
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

  it('clicking ELI5 appends the result to the editor notes (NOT the composer)', async () => {
    mockFetchBlockAction.mockResolvedValue({
      text: 'simpler version',
      responseId: 'r2',
    });

    render(<EditorControls />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /ELI5/i }));
    });

    await waitFor(() => {
      expect(useStore.getState().focus?.notes).toContain('simpler version');
    });
    expect(mockFetchBlockAction).toHaveBeenCalledWith(
      'eli5',
      'Hello',
      undefined,
      undefined,
      expect.any(Object),
    );
    // Composer prompt must NOT be touched.
    expect(useStore.getState().composerPrompt).toBe('');
    // Editor buffer must NOT change.
    expect(useStore.getState().focus?.buffer).toBe('Hello');
  });

  it('clicking Translate routes through the translate language and appends to notes', async () => {
    mockFetchBlockAction.mockResolvedValue({
      text: 'hola mundo',
      responseId: 'r3',
    });

    render(<EditorControls />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Translate/i }));
    });

    await waitFor(() => {
      expect(useStore.getState().focus?.notes).toContain('hola mundo');
    });
    const settings = useStore.getState().settings;
    expect(mockFetchBlockAction).toHaveBeenCalledWith(
      'translate',
      'Hello',
      undefined,
      settings.translateLanguage,
      expect.any(Object),
    );
    expect(useStore.getState().composerPrompt).toBe('');
  });

  it('clicking Summarize appends the summary to notes', async () => {
    mockFetchBlockAction.mockResolvedValue({
      text: 'short version',
      responseId: 'r4',
    });

    render(<EditorControls />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Summarize/i }));
    });

    await waitFor(() => {
      expect(useStore.getState().focus?.notes).toContain('short version');
    });
    expect(mockFetchBlockAction).toHaveBeenCalledWith(
      'summarize',
      'Hello',
      undefined,
      undefined,
      expect.any(Object),
    );
    expect(useStore.getState().composerPrompt).toBe('');
  });
});
