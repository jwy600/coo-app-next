import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeleteThreadButton } from '@/components/chat/DeleteThreadButton';
import { createThread, createMessage } from '@/tests/mocks/fixtures';
import { createMockStoreState } from '@/tests/mocks/store';
import {
  mockRouter,
  resetNavigationMock,
} from '@/tests/mocks/next-navigation';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => mockRouter),
}));

const mockState = createMockStoreState();

vi.mock('@/lib/store/useStore', () => ({
  useStore: vi.fn((selector?: (s: typeof mockState) => unknown) => {
    if (selector) return selector(mockState);
    return mockState;
  }),
  selectActiveThread: (state: typeof mockState) =>
    state.threads.find((t) => t.id === state.activeThreadId),
}));

function setActiveThread(thread: ReturnType<typeof createThread> | null) {
  if (thread) {
    mockState.activeThreadId = thread.id;
    mockState.threads = [thread];
  } else {
    mockState.activeThreadId = null;
    mockState.threads = [];
  }
}

describe('DeleteThreadButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNavigationMock();
    mockState.activeThreadId = null;
    mockState.threads = [];
    mockState.deleteThread.mockReturnValue(null);
  });

  it('renders trash icon button', () => {
    render(<DeleteThreadButton />);
    expect(screen.getByLabelText('Delete thread')).toBeTruthy();
  });

  it('opens confirmation dialog on click', () => {
    const thread = createThread({ id: 'thread-1', title: 'My Thread' });
    setActiveThread(thread);
    render(<DeleteThreadButton />);

    fireEvent.click(screen.getByLabelText('Delete thread'));
    expect(screen.getByText('Delete Thread')).toBeTruthy();
    expect(screen.getByText(/My Thread/)).toBeTruthy();
  });

  it('shows message count in dialog', () => {
    const messages = [
      createMessage({ id: 'msg-1' }),
      createMessage({ id: 'msg-2' }),
      createMessage({ id: 'msg-3' }),
    ];
    const thread = createThread({ id: 'thread-1', messages });
    setActiveThread(thread);
    render(<DeleteThreadButton />);

    fireEvent.click(screen.getByLabelText('Delete thread'));
    expect(screen.getByText(/3 messages/)).toBeTruthy();
  });

  it('shows singular "message" for 1 message', () => {
    const thread = createThread({
      id: 'thread-1',
      messages: [createMessage()],
    });
    setActiveThread(thread);
    render(<DeleteThreadButton />);

    fireEvent.click(screen.getByLabelText('Delete thread'));
    expect(screen.getByText(/1 message(?!s)/)).toBeTruthy();
  });

  it('shows "cannot be undone" warning', () => {
    setActiveThread(createThread({ id: 'thread-1' }));
    render(<DeleteThreadButton />);

    fireEvent.click(screen.getByLabelText('Delete thread'));
    expect(screen.getByText(/cannot be undone/)).toBeTruthy();
  });

  it('navigates to next thread after delete', async () => {
    setActiveThread(createThread({ id: 'thread-1' }));
    mockState.deleteThread.mockReturnValue('thread-2');
    render(<DeleteThreadButton />);

    fireEvent.click(screen.getByLabelText('Delete thread'));
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(mockState.deleteThread).toHaveBeenCalledWith('thread-1');
      expect(mockRouter.push).toHaveBeenCalledWith('/t/thread-2');
    });
  });

  it('navigates to "/" when no next thread', async () => {
    setActiveThread(createThread({ id: 'thread-1' }));
    mockState.deleteThread.mockReturnValue(null);
    render(<DeleteThreadButton />);

    fireEvent.click(screen.getByLabelText('Delete thread'));
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });

  it('has Cancel button that closes dialog', () => {
    setActiveThread(createThread({ id: 'thread-1' }));
    render(<DeleteThreadButton />);

    fireEvent.click(screen.getByLabelText('Delete thread'));
    expect(screen.getByText('Delete Thread')).toBeTruthy();

    fireEvent.click(screen.getByText('Cancel'));
    // Dialog content should be removed
    expect(screen.queryByText('Delete Thread')).toBeNull();
  });
});
