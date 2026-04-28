import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useStore } from '@/lib/store/useStore';
import type { FormEvent } from 'react';

const { mockFetchBlockAction } = vi.hoisted(() => ({
  mockFetchBlockAction: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  fetchBlockAction: mockFetchBlockAction,
}));

vi.mock('@/components/composer/PromptInput', () => ({
  PromptInput: ({ value, disabled }: { value: string; disabled: boolean }) => (
    <div data-testid="prompt-input" data-value={value} data-disabled={disabled} />
  ),
}));

vi.mock('@/components/composer/ComposerHint', () => ({
  ComposerHint: () => <div data-testid="composer-hint">Hint</div>,
}));

import { Composer } from '@/components/composer/Composer';

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
}

function openFocus() {
  useStore.getState().createThread('t1');
  const message = useStore.getState().addAssistantMessage('Hello world');
  useStore.getState().openEditor(message.id, [0, 5]);
  return message.id;
}

const baseProps = {
  prompt: '',
  onPromptChange: vi.fn(),
  onSubmit: vi.fn(),
};

describe('Composer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  describe('basics', () => {
    it('renders PromptInput, Send button, and the hint', () => {
      render(<Composer {...baseProps} />);
      expect(screen.getByTestId('prompt-input')).toBeTruthy();
      expect(screen.getByText('Send')).toBeTruthy();
      expect(screen.getByTestId('composer-hint')).toBeTruthy();
    });

    it('disables the Send button and forwards disabled to PromptInput', () => {
      render(<Composer {...baseProps} disabled />);
      const button = screen.getByText('Send').closest('button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(screen.getByTestId('prompt-input').getAttribute('data-disabled')).toBe('true');
    });

    it('calls onSubmit when the form submits', () => {
      const onSubmit = vi.fn((e: FormEvent) => e.preventDefault());
      render(<Composer {...baseProps} onSubmit={onSubmit} />);
      fireEvent.submit(screen.getByTestId('prompt-input').closest('form')!);
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe('focus-mode shortcut buttons', () => {
    it('does not render shortcut buttons when no editor is active', () => {
      render(<Composer {...baseProps} />);
      expect(screen.queryByRole('button', { name: /Translate/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /ELI5/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Summarize/i })).toBeNull();
    });

    it('renders Translate, ELI5, Summarize buttons when an editor is active', () => {
      openFocus();
      render(<Composer {...baseProps} />);
      expect(screen.getByRole('button', { name: /Translate/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /ELI5/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Summarize/i })).toBeTruthy();
    });

    it('clicking ELI5 calls fetchBlockAction with the editor buffer and writes the result to the composer prompt', async () => {
      openFocus();
      mockFetchBlockAction.mockResolvedValue({
        text: 'simpler version',
        responseId: 'r1',
      });

      render(<Composer {...baseProps} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /ELI5/i }));
      });

      await waitFor(() => {
        expect(useStore.getState().composerPrompt).toBe('simpler version');
      });
      expect(mockFetchBlockAction).toHaveBeenCalledWith(
        'eli5',
        'Hello',
        undefined,
        undefined,
        expect.any(Object),
      );
      expect(useStore.getState().focus?.buffer).toBe('Hello');
    });

    it('Translate passes the configured language', async () => {
      openFocus();
      mockFetchBlockAction.mockResolvedValue({
        text: 'hola mundo',
        responseId: 'r2',
      });

      render(<Composer {...baseProps} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Translate/i }));
      });

      await waitFor(() => {
        expect(useStore.getState().composerPrompt).toBe('hola mundo');
      });
      const settings = useStore.getState().settings;
      expect(mockFetchBlockAction).toHaveBeenCalledWith(
        'translate',
        'Hello',
        undefined,
        settings.translateLanguage,
        expect.any(Object),
      );
    });

    it('Summarize uses the summarize action', async () => {
      openFocus();
      mockFetchBlockAction.mockResolvedValue({
        text: 'short version',
        responseId: 'r3',
      });

      render(<Composer {...baseProps} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Summarize/i }));
      });

      await waitFor(() => {
        expect(useStore.getState().composerPrompt).toBe('short version');
      });
      expect(mockFetchBlockAction).toHaveBeenCalledWith(
        'summarize',
        'Hello',
        undefined,
        undefined,
        expect.any(Object),
      );
    });
  });

  describe('drag-select inside the composer → appendNote', () => {
    function selectNodeText(node: Node, start: number, end: number) {
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, end);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }

    it('appends the highlighted text to focus.notes when an editor is active', () => {
      openFocus();
      const { container } = render(
        <Composer {...baseProps}>
          <span data-testid="composer-text">deliberate emphasis</span>
        </Composer>,
      );
      const target = container.querySelector(
        '[data-testid="composer-text"]',
      ) as HTMLElement;
      const textNode = target.firstChild as Text;

      act(() => {
        selectNodeText(textNode, 0, 'deliberate'.length);
        fireEvent.mouseUp(target);
      });

      expect(useStore.getState().focus?.notes).toContain('deliberate');
    });

    it('does nothing when no editor is active', () => {
      const { container } = render(
        <Composer {...baseProps}>
          <span data-testid="composer-text">some words</span>
        </Composer>,
      );
      const target = container.querySelector(
        '[data-testid="composer-text"]',
      ) as HTMLElement;
      const textNode = target.firstChild as Text;

      act(() => {
        const range = document.createRange();
        range.setStart(textNode, 0, );
        range.setEnd(textNode, 4);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        fireEvent.mouseUp(target);
      });

      // No focus → nothing to append to.
      expect(useStore.getState().focus).toBeNull();
    });
  });
});
