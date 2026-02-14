import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardControls } from '@/components/chat/CardControls';
import { createBlock, createThread } from '@/tests/mocks/fixtures';
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

const mockBlocksToCardMarkdown = vi.fn().mockReturnValue('# Card\ncontent');
const mockGenerateCardFilename = vi.fn().mockReturnValue('card.md');
const mockDownloadMarkdown = vi.fn();

vi.mock('@/lib/export', () => ({
  blocksToCardMarkdown: (...args: unknown[]) => mockBlocksToCardMarkdown(...args),
  generateCardFilename: (...args: unknown[]) => mockGenerateCardFilename(...args),
  downloadMarkdown: (...args: unknown[]) => mockDownloadMarkdown(...args),
}));

// Stub ExportCardDialog to capture props
vi.mock('@/components/chat/ExportCardDialog', () => ({
  ExportCardDialog: ({ open, onConfirm, selectedBlockCount }: {
    open: boolean;
    onConfirm: (title: string) => void;
    selectedBlockCount: number;
  }) => open ? (
    <div data-testid="export-dialog" data-block-count={selectedBlockCount}>
      <button onClick={() => onConfirm('Test Title')}>Confirm Export</button>
    </div>
  ) : null,
}));

describe('CardControls', () => {
  const blocks = [
    createBlock({ id: 'b1', text: 'First block' }),
    createBlock({ id: 'b2', text: 'Second block' }),
  ];

  const baseProps = {
    cardId: 'card-1',
    cardBlocks: blocks,
    onRemove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const thread = createThread({ id: 'thread-1', title: 'Test Thread' });
    mockState.activeThreadId = thread.id;
    mockState.threads = [thread];
  });

  it('renders Export and Remove buttons', () => {
    render(<CardControls {...baseProps} />);
    expect(screen.getByLabelText('Export card')).toBeTruthy();
    expect(screen.getByLabelText('Remove card')).toBeTruthy();
  });

  it('shows block count in export button title', () => {
    render(<CardControls {...baseProps} />);
    const exportBtn = screen.getByLabelText('Export card');
    expect(exportBtn.getAttribute('title')).toBe('Export 2 blocks as card');
  });

  it('shows singular "block" for 1 block', () => {
    render(<CardControls {...baseProps} cardBlocks={[blocks[0]]} />);
    const exportBtn = screen.getByLabelText('Export card');
    expect(exportBtn.getAttribute('title')).toBe('Export 1 block as card');
  });

  it('calls onRemove when Remove button is clicked', () => {
    render(<CardControls {...baseProps} />);
    fireEvent.click(screen.getByLabelText('Remove card'));
    expect(baseProps.onRemove).toHaveBeenCalled();
  });

  it('opens ExportCardDialog on Export click', () => {
    render(<CardControls {...baseProps} />);
    expect(screen.queryByTestId('export-dialog')).toBeNull();

    fireEvent.click(screen.getByLabelText('Export card'));
    expect(screen.getByTestId('export-dialog')).toBeTruthy();
    expect(screen.getByTestId('export-dialog').getAttribute('data-block-count')).toBe('2');
  });

  it('calls export utilities when dialog confirms', () => {
    render(<CardControls {...baseProps} />);
    fireEvent.click(screen.getByLabelText('Export card'));
    fireEvent.click(screen.getByText('Confirm Export'));

    expect(mockBlocksToCardMarkdown).toHaveBeenCalledWith(
      'Test Title',
      'Test Thread',
      blocks,
    );
    expect(mockGenerateCardFilename).toHaveBeenCalledWith('Test Title');
    expect(mockDownloadMarkdown).toHaveBeenCalledWith('# Card\ncontent', 'card.md');
  });
});
