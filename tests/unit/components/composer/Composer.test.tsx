import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useStore } from '@/lib/store/useStore';
import type { FormEvent } from 'react';

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

  it('does not render focus-mode shortcut buttons even when an editor is active', () => {
    useStore.getState().createThread('t1');
    const message = useStore.getState().addAssistantMessage('Hello world');
    useStore.getState().openEditor(message.id, [0, 5]);

    render(<Composer {...baseProps} />);

    expect(screen.queryByRole('button', { name: /Translate/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /ELI5/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Summarize/i })).toBeNull();
  });
});
