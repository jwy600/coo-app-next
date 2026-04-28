import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportButton } from '@/components/chat/ExportButton';
import { createThread, createMessage } from '@/tests/mocks/fixtures';
import { createMockStoreState } from '@/tests/mocks/store';

const mockState = createMockStoreState();

vi.mock('@/lib/store/useStore', () => ({
  useStore: vi.fn((selector?: (s: typeof mockState) => unknown) => {
    if (selector) return selector(mockState);
    return mockState;
  }),
  selectActiveThread: (state: typeof mockState) =>
    state.threads.find((t) => t.id === state.activeThreadId),
}));

const mockThreadToMarkdown = vi.fn().mockReturnValue('# Thread');
const mockGenerateExportFilename = vi.fn().mockReturnValue('thread.md');
const mockExportMarkdown = vi.fn().mockReturnValue({ success: true });

vi.mock('@/lib/export', () => ({
  threadToMarkdown: (...args: unknown[]) => mockThreadToMarkdown(...args),
  generateExportFilename: (...args: unknown[]) => mockGenerateExportFilename(...args),
  exportMarkdown: (...args: unknown[]) => mockExportMarkdown(...args),
}));

describe('ExportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.activeThreadId = null;
    mockState.threads = [];
  });

  it('renders "Export Thread" by default', () => {
    const thread = createThread({ id: 'thread-1', messages: [createMessage()] });
    mockState.activeThreadId = thread.id;
    mockState.threads = [thread];

    render(<ExportButton />);
    expect(screen.getByLabelText('Export thread')).toBeTruthy();
    expect(screen.getByText('Export Thread')).toBeTruthy();
  });

  it('disables the button when the thread has no messages', () => {
    const thread = createThread({ id: 'thread-1', messages: [] });
    mockState.activeThreadId = thread.id;
    mockState.threads = [thread];

    render(<ExportButton />);
    const btn = screen.getByLabelText('Export thread') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('calls threadToMarkdown + exportMarkdown on click', () => {
    const message = createMessage({ id: 'msg-1' });
    const thread = createThread({
      id: 'thread-1',
      title: 'My Thread',
      messages: [message],
    });
    mockState.activeThreadId = thread.id;
    mockState.threads = [thread];

    render(<ExportButton />);
    fireEvent.click(screen.getByLabelText('Export thread'));

    expect(mockThreadToMarkdown).toHaveBeenCalledWith(thread, [message]);
    expect(mockExportMarkdown).toHaveBeenCalled();
  });
});
