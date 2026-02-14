import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlockStack } from '@/components/chat/BlockStack';
import { createBlock, createCard } from '@/tests/mocks/fixtures';

// Stub DocBlock to verify props passed through
vi.mock('@/components/chat/DocBlock', () => ({
  DocBlock: ({ block, isSelected, isInCard, cardId }: {
    block: { id: string; text: string };
    isSelected: boolean;
    isInCard: boolean;
    cardId?: string;
  }) => (
    <div
      data-testid={`doc-block-${block.id}`}
      data-selected={isSelected}
      data-in-card={isInCard}
      data-card-id={cardId || ''}
    >
      {block.text}
    </div>
  ),
}));

// Stub CardControls
vi.mock('@/components/chat/CardControls', () => ({
  CardControls: ({ cardId, cardBlocks }: { cardId: string; cardBlocks: { id: string }[] }) => (
    <div data-testid={`card-controls-${cardId}`} data-block-count={cardBlocks.length}>
      Card Controls
    </div>
  ),
}));

describe('BlockStack', () => {
  describe('no cards', () => {
    it('renders all blocks when no cards', () => {
      const blocks = [
        createBlock({ id: 'b1', text: 'Block 1' }),
        createBlock({ id: 'b2', text: 'Block 2' }),
      ];
      render(<BlockStack blocks={blocks} selectedBlockId={null} cards={[]} />);
      expect(screen.getByTestId('doc-block-b1')).toBeTruthy();
      expect(screen.getByTestId('doc-block-b2')).toBeTruthy();
    });

    it('passes isInCard=false when no cards', () => {
      const blocks = [createBlock({ id: 'b1' })];
      render(<BlockStack blocks={blocks} selectedBlockId={null} cards={[]} />);
      expect(screen.getByTestId('doc-block-b1').getAttribute('data-in-card')).toBe('false');
    });

    it('marks the selected block', () => {
      const blocks = [
        createBlock({ id: 'b1' }),
        createBlock({ id: 'b2' }),
      ];
      render(<BlockStack blocks={blocks} selectedBlockId="b1" cards={[]} />);
      expect(screen.getByTestId('doc-block-b1').getAttribute('data-selected')).toBe('true');
      expect(screen.getByTestId('doc-block-b2').getAttribute('data-selected')).toBe('false');
    });
  });

  describe('with cards', () => {
    it('renders CardControls for card segments', () => {
      const blocks = [
        createBlock({ id: 'b1', messageId: 'msg-1' }),
        createBlock({ id: 'b2', messageId: 'msg-1' }),
      ];
      const cards = [
        createCard({ id: 'card-1', messageId: 'msg-1', anchorBlockId: 'b1', blockIds: ['b1', 'b2'] }),
      ];
      render(<BlockStack blocks={blocks} selectedBlockId={null} cards={cards} />);
      expect(screen.getByTestId('card-controls-card-1')).toBeTruthy();
      expect(screen.getByTestId('card-controls-card-1').getAttribute('data-block-count')).toBe('2');
    });

    it('marks blocks inside card with isInCard=true', () => {
      const blocks = [createBlock({ id: 'b1' })];
      const cards = [createCard({ id: 'c1', blockIds: ['b1'] })];
      render(<BlockStack blocks={blocks} selectedBlockId={null} cards={cards} />);
      expect(screen.getByTestId('doc-block-b1').getAttribute('data-in-card')).toBe('true');
    });

    it('sets cardId on blocks in card', () => {
      const blocks = [createBlock({ id: 'b1' })];
      const cards = [createCard({ id: 'c1', blockIds: ['b1'] })];
      render(<BlockStack blocks={blocks} selectedBlockId={null} cards={cards} />);
      expect(screen.getByTestId('doc-block-b1').getAttribute('data-card-id')).toBe('c1');
    });

    it('separates card and non-card blocks into segments', () => {
      const blocks = [
        createBlock({ id: 'b1' }),
        createBlock({ id: 'b2' }),
        createBlock({ id: 'b3' }),
      ];
      const cards = [createCard({ id: 'c1', blockIds: ['b2'] })];
      render(<BlockStack blocks={blocks} selectedBlockId={null} cards={cards} />);

      // b1 is not in card
      expect(screen.getByTestId('doc-block-b1').getAttribute('data-in-card')).toBe('false');
      // b2 is in card
      expect(screen.getByTestId('doc-block-b2').getAttribute('data-in-card')).toBe('true');
      // b3 is not in card
      expect(screen.getByTestId('doc-block-b3').getAttribute('data-in-card')).toBe('false');
    });
  });

  describe('empty states', () => {
    it('handles empty blocks array', () => {
      const { container } = render(<BlockStack blocks={[]} selectedBlockId={null} cards={[]} />);
      expect(container.querySelector('.block-stack')).toBeTruthy();
    });
  });
});
