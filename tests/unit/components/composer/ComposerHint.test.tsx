import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComposerHint } from '@/components/composer/ComposerHint';
import { useStore } from '@/lib/store/useStore';

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

describe('ComposerHint', () => {
  beforeEach(resetStore);

  it('shows the drag-select hint copy when no editor is active', () => {
    render(<ComposerHint />);
    expect(
      screen.getByText(/Drag-select assistant text to focus on a passage/i),
    ).toBeTruthy();
  });

  it('switches to "Ask about the selected text" when an editor is active', () => {
    useStore.setState({
      focus: {
        messageId: 'm1',
        range: [0, 5],
        buffer: 'Hello',
        prevBuffer: null,
      },
    });
    render(<ComposerHint />);
    expect(screen.getByText(/Ask about the selected text/i)).toBeTruthy();
  });
});
