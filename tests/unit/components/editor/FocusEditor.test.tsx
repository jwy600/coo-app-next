import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { FocusEditor } from '@/components/editor/FocusEditor';
import { useStore } from '@/lib/store/useStore';

function resetStore() {
  useStore.setState({
    threads: [],
    activeThreadId: null,
    mode: 'landing',
    isAwaitingResponse: false,
    error: null,
    streamingMessageId: null,
    focus: null,
  });
}

function seedFocus(text = 'Hello world', range: [number, number] = [0, 5]) {
  resetStore();
  useStore.getState().createThread('thread-1');
  const message = useStore.getState().addAssistantMessage(text);
  useStore.getState().openEditor(message.id, range);
  return { messageId: message.id };
}

describe('FocusEditor', () => {
  beforeEach(resetStore);

  it('renders nothing when no editor is active', () => {
    const { container } = render(<FocusEditor />);
    expect(container.querySelector('[data-testid="focus-editor"]')).toBeNull();
  });

  it('renders a textarea seeded with the active buffer', () => {
    seedFocus();
    const { container } = render(<FocusEditor />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Hello');
  });

  it('selects all of the buffer text on mount', () => {
    seedFocus();
    const { container } = render(<FocusEditor />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.selectionStart).toBe(0);
    expect(textarea.selectionEnd).toBe('Hello'.length);
    expect(document.activeElement).toBe(textarea);
  });

  it('typing in the textarea calls updateBuffer', () => {
    seedFocus();
    const { container } = render(<FocusEditor />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Howdy' } });
    expect(useStore.getState().focus?.buffer).toBe('Howdy');
  });

  it('clicking outside the editor calls closeEditor (auto-save)', () => {
    const { messageId } = seedFocus();
    render(
      <div>
        <span data-testid="outside">outside</span>
        <FocusEditor />
      </div>,
    );
    const outside = document.querySelector('[data-testid="outside"]') as HTMLElement;
    act(() => {
      fireEvent.mouseDown(outside);
    });
    expect(useStore.getState().focus).toBeNull();
    // Buffer was unchanged, so the message text round-trips.
    const message = useStore
      .getState()
      .threads[0].messages.find((m) => m.id === messageId);
    expect(message?.text).toBe('Hello world');
  });

  it('clicking inside the editor does NOT close it', () => {
    seedFocus();
    const { container } = render(<FocusEditor />);
    const root = container.querySelector('[data-testid="focus-editor"]') as HTMLElement;
    act(() => {
      fireEvent.mouseDown(root);
    });
    expect(useStore.getState().focus).not.toBeNull();
  });

  it('clicking inside the composer does NOT close the editor', () => {
    seedFocus();
    render(
      <div>
        <form className="composer">
          <input data-testid="composer-input" />
        </form>
        <FocusEditor />
      </div>,
    );
    const composerInput = document.querySelector(
      '[data-testid="composer-input"]',
    ) as HTMLElement;
    act(() => {
      fireEvent.mouseDown(composerInput);
    });
    expect(useStore.getState().focus).not.toBeNull();
  });

  it('shows ask answers as raw markdown inside the textarea (no separate notes section)', () => {
    seedFocus();
    useStore.getState().appendNoteToBuffer('first note');
    useStore.getState().appendNoteToBuffer('second');
    const { container } = render(<FocusEditor />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toContain('> **Note:** first note');
    expect(textarea.value).toContain('> **Note:** second');
    expect(container.querySelectorAll('blockquote')).toHaveLength(0);
  });

  it('shows a loading indicator and disables the textarea when disabled', () => {
    seedFocus();
    const { container } = render(<FocusEditor disabled />);
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
    expect(container.querySelector('[data-testid="focus-editor-loading"]')).toBeTruthy();
  });
});
