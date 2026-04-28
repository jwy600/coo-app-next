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

  it('renders shortcuts, ask input, Revert, and Rewrite in a single row', () => {
    render(<EditorControls />);
    expect(screen.getByRole('button', { name: /Translate/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /ELI5/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Summarize/i })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: /Ask about this passage/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Revert/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Rewrite/i })).toBeTruthy();
  });

  it('disables Revert when no buffer mutation is pending', () => {
    render(<EditorControls />);
    const revert = screen.getByRole('button', { name: /Revert/i });
    expect(revert.getAttribute('aria-disabled')).toBe('true');
  });

  it('clicking a shortcut transforms the whole buffer (notes included) and replaces it with the result', async () => {
    useStore.getState().appendNoteToBuffer('keep me');
    mockFetchBlockAction.mockResolvedValue({
      text: 'Hola\n\n> **Nota:** mantenme',
      responseId: 'r1',
    });

    render(<EditorControls />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Translate/i }));
    });

    await waitFor(() => {
      expect(useStore.getState().focus?.buffer).toBe(
        'Hola\n\n> **Nota:** mantenme',
      );
    });
    expect(useStore.getState().focus?.prevBuffer).toBe(
      'Hello\n\n> **Note:** keep me',
    );
    expect(mockFetchBlockAction).toHaveBeenCalledWith(
      'translate',
      'Hello\n\n> **Note:** keep me',
      undefined,
      expect.any(String),
      expect.objectContaining({ apiKey: expect.any(String) }),
      undefined,
      undefined,
    );
  });

  it('clicking Revert restores the buffer set by a shortcut', async () => {
    mockFetchBlockAction.mockResolvedValue({ text: 'Hola', responseId: 'r1' });
    render(<EditorControls />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Translate/i }));
    });
    await waitFor(() => {
      expect(useStore.getState().focus?.buffer).toBe('Hola');
    });

    fireEvent.click(screen.getByRole('button', { name: /Revert/i }));
    expect(useStore.getState().focus?.buffer).toBe('Hello');
    expect(useStore.getState().focus?.prevBuffer).toBeNull();
  });

  it('submitting the ask input appends the answer as inline `> **Note:** ...` markdown and clears the input', async () => {
    mockFetchBlockAction.mockResolvedValue({
      text: 'It is a greeting.',
      responseId: 'r1',
    });

    render(<EditorControls />);
    const input = screen.getByRole('textbox', {
      name: /Ask about this passage/i,
    }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'What does this mean?' } });

    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });

    await waitFor(() => {
      expect(useStore.getState().focus?.buffer).toBe(
        'Hello\n\n> **Note:** It is a greeting.',
      );
    });
    expect(input.value).toBe('');
    expect(mockFetchBlockAction).toHaveBeenCalledWith(
      'ask',
      'Hello',
      'What does this mean?',
      undefined,
      expect.objectContaining({ apiKey: expect.any(String) }),
      undefined,
      undefined,
    );
  });

  it('does not submit ask when the input is empty', async () => {
    render(<EditorControls />);
    const input = screen.getByRole('textbox', {
      name: /Ask about this passage/i,
    }) as HTMLInputElement;

    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });

    expect(mockFetchBlockAction).not.toHaveBeenCalled();
  });

  it('asking a question after a shortcut leaves prevBuffer intact and appends the answer to the transformed buffer', async () => {
    mockFetchBlockAction
      .mockResolvedValueOnce({ text: 'Hola', responseId: 'r1' })
      .mockResolvedValueOnce({ text: 'It is a greeting.', responseId: 'r2' });

    render(<EditorControls />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Translate/i }));
    });
    await waitFor(() => {
      expect(useStore.getState().focus?.buffer).toBe('Hola');
    });
    expect(useStore.getState().focus?.prevBuffer).toBe('Hello');

    const input = screen.getByRole('textbox', {
      name: /Ask about this passage/i,
    }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'meaning?' } });
    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });

    await waitFor(() => {
      expect(useStore.getState().focus?.buffer).toBe(
        'Hola\n\n> **Note:** It is a greeting.',
      );
    });
    // Ask must NOT touch prevBuffer — Revert should still undo the shortcut.
    expect(useStore.getState().focus?.prevBuffer).toBe('Hello');
  });

  it('clicking Rewrite splits inline notes from the buffer and sends passage + notes to fetchRewrite', async () => {
    useStore.getState().appendNoteToBuffer('tighten it');
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
    expect(useStore.getState().focus?.prevBuffer).toBe(
      'Hello\n\n> **Note:** tighten it',
    );
  });
});
