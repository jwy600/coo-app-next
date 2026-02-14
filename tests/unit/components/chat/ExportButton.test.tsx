import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportButton } from '@/components/chat/ExportButton';
import { createThread, createMessage, createBlock, createCard } from '@/tests/mocks/fixtures';
import { createMockStoreState } from '@/tests/mocks/store';
import { Block } from '@/types/block';
import { Card } from '@/types/card';

// Build mock state with helpers
const mockState = createMockStoreState();
let mockBlocks: Block[] = [];
let mockCards: Card[] = [];
let mockCardBlocks: Block[] = [];

vi.mock('zustand/react/shallow', () => ({
  useShallow: (fn: Function) => fn,
}));

vi.mock('@/lib/store/useStore', () => ({
  useStore: vi.fn((selector?: (s: typeof mockState) => unknown) => {
    if (selector) return selector(mockState);
    return mockState;
  }),
  selectActiveThread: (state: typeof mockState) =>
    state.threads.find((t) => t.id === state.activeThreadId),
  selectActiveThreadBlocks: () => mockBlocks,
  selectCards: (state: typeof mockState) => mockCards,
  selectAllCardBlocks: () => mockCardBlocks,
}));

const mockThreadToMarkdown = vi.fn().mockReturnValue('# Thread');
const mockGenerateExportFilename = vi.fn().mockReturnValue('thread.md');
const mockBlocksToCardMarkdown = vi.fn().mockReturnValue('# Cards');
const mockGenerateCardFilename = vi.fn().mockReturnValue('cards.md');
const mockDownloadMarkdown = vi.fn();

vi.mock('@/lib/export', () => ({
  threadToMarkdown: (...args: unknown[]) => mockThreadToMarkdown(...args),
  generateExportFilename: (...args: unknown[]) => mockGenerateExportFilename(...args),
  blocksToCardMarkdown: (...args: unknown[]) => mockBlocksToCardMarkdown(...args),
  generateCardFilename: (...args: unknown[]) => mockGenerateCardFilename(...args),
  downloadMarkdown: (...args: unknown[]) => mockDownloadMarkdown(...args),
}));

// Stub ExportCardDialog
vi.mock('@/components/chat/ExportCardDialog', () => ({
  ExportCardDialog: ({ open, onConfirm, selectedBlockCount }: {
    open: boolean;
    onConfirm: (title: string) => void;
    selectedBlockCount: number;
  }) => open ? (
    <div data-testid="export-dialog" data-block-count={selectedBlockCount}>
      <button onClick={() => onConfirm('All Cards')}>Confirm</button>
    </div>
  ) : null,
}));

describe('ExportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBlocks = [];
    mockCards = [];
    mockCardBlocks = [];
    mockState.activeThreadId = null;
    mockState.threads = [];
    mockState.cards = [];
  });

  describe('no cards mode', () => {
    it('renders "Export Thread" button when no cards', () => {
      const thread = createThread({
        id: 'thread-1',
        messages: [createMessage()],
      });
      mockState.activeThreadId = thread.id;
      mockState.threads = [thread];
      mockCards = [];

      render(<ExportButton />);
      expect(screen.getByLabelText('Export thread')).toBeTruthy();
      expect(screen.getByText('Export Thread')).toBeTruthy();
    });

    it('disables button when no messages', () => {
      const thread = createThread({ id: 'thread-1', messages: [] });
      mockState.activeThreadId = thread.id;
      mockState.threads = [thread];
      mockCards = [];

      render(<ExportButton />);
      const btn = screen.getByLabelText('Export thread') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('calls threadToMarkdown on click', () => {
      const msg = createMessage({ id: 'msg-1' });
      const thread = createThread({ id: 'thread-1', title: 'My Thread', messages: [msg] });
      mockState.activeThreadId = thread.id;
      mockState.threads = [thread];
      mockBlocks = [createBlock({ id: 'b1', messageId: 'msg-1' })];
      mockCards = [];

      render(<ExportButton />);
      fireEvent.click(screen.getByLabelText('Export thread'));

      expect(mockThreadToMarkdown).toHaveBeenCalled();
      expect(mockDownloadMarkdown).toHaveBeenCalled();
    });
  });

  describe('with cards mode', () => {
    const setupWithCards = () => {
      const msg = createMessage({ id: 'msg-1' });
      const thread = createThread({ id: 'thread-1', title: 'My Thread', messages: [msg] });
      const block = createBlock({ id: 'b1', messageId: 'msg-1' });
      const card = createCard({ id: 'card-1', blockIds: ['b1'] });

      mockState.activeThreadId = thread.id;
      mockState.threads = [thread];
      mockBlocks = [block];
      mockCards = [card];
      mockCardBlocks = [block];
      mockState.cards = [card];
    };

    it('renders "Export Cards" when cards exist', () => {
      setupWithCards();
      render(<ExportButton />);
      expect(screen.getByLabelText('Export all cards')).toBeTruthy();
      expect(screen.getByText('Export Cards')).toBeTruthy();
    });

    it('renders dropdown with "More export options"', () => {
      setupWithCards();
      render(<ExportButton />);
      expect(screen.getByLabelText('More export options')).toBeTruthy();
    });

    it('opens ExportCardDialog on "Export Cards" click', () => {
      setupWithCards();
      render(<ExportButton />);

      expect(screen.queryByTestId('export-dialog')).toBeNull();
      fireEvent.click(screen.getByLabelText('Export all cards'));
      expect(screen.getByTestId('export-dialog')).toBeTruthy();
    });

    it('calls blocksToCardMarkdown when dialog confirms', () => {
      setupWithCards();
      render(<ExportButton />);

      fireEvent.click(screen.getByLabelText('Export all cards'));
      fireEvent.click(screen.getByText('Confirm'));

      expect(mockBlocksToCardMarkdown).toHaveBeenCalled();
      expect(mockDownloadMarkdown).toHaveBeenCalled();
    });
  });
});
