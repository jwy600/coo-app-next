'use client';

import { useMemo } from 'react';
import { Block } from '@/types/block';
import { Card } from '@/types/card';
import { DocBlock } from './DocBlock';
import { CardControls } from './CardControls';

/**
 * Segment represents a group of consecutive blocks
 * Either in a card (with cardId) or not (cardId = null)
 */
interface BlockSegment {
  cardId: string | null;
  blocks: Block[];
}

/**
 * Group blocks into segments based on card membership
 * Maintains document order while grouping consecutive blocks in the same card
 */
function groupBlocksIntoSegments(blocks: Block[], cards: Card[]): BlockSegment[] {
  // Build lookup: blockId → cardId
  const blockToCard = new Map<string, string>();
  cards.forEach((card) => {
    card.blockIds.forEach((blockId) => blockToCard.set(blockId, card.id));
  });

  const segments: BlockSegment[] = [];
  let currentSegment: BlockSegment | null = null;

  for (const block of blocks) {
    const cardId = blockToCard.get(block.id) || null;

    if (!currentSegment || currentSegment.cardId !== cardId) {
      // Start a new segment
      currentSegment = { cardId, blocks: [block] };
      segments.push(currentSegment);
    } else {
      // Add to current segment
      currentSegment.blocks.push(block);
    }
  }

  return segments;
}

/**
 * Client Component - Container for multiple blocks
 * Handles card display and block selection
 */
interface BlockStackProps {
  blocks: Block[];
  selectedBlockId: string | null;
  cards: Card[];
  onBlockSelect?: (blockId: string) => void;
  onAddCard?: (anchorBlockId: string) => void;
  onRemoveCard?: (cardId: string) => void;
  onRemoveSelection?: (blockId: string, index: number) => void;
  onRewrite?: (blockId: string) => void;
  onUndo?: (blockId: string) => void;
}

export function BlockStack({
  blocks,
  selectedBlockId,
  cards,
  onBlockSelect,
  onAddCard,
  onRemoveCard,
  onRemoveSelection,
  onRewrite,
  onUndo,
}: BlockStackProps) {
  // Build lookup for card membership
  const blockToCard = useMemo(() => {
    const map = new Map<string, string>();
    cards.forEach((card) => {
      card.blockIds.forEach((blockId) => map.set(blockId, card.id));
    });
    return map;
  }, [cards]);

  // Group blocks into segments
  const segments = useMemo(
    () => groupBlocksIntoSegments(blocks, cards),
    [blocks, cards]
  );

  const renderBlock = (block: Block, isInCard: boolean = false) => {
    const isSelected = selectedBlockId === block.id;
    const cardId = blockToCard.get(block.id);

    return (
      <DocBlock
        key={block.id}
        block={block}
        isSelected={isSelected}
        isInCard={isInCard}
        cardId={cardId}
        onSelect={onBlockSelect}
        onAddCard={onAddCard}
        onRemoveSelection={onRemoveSelection}
        onRewrite={onRewrite}
        onUndo={onUndo}
      />
    );
  };

  // No cards - render all blocks normally
  if (cards.length === 0) {
    return (
      <div className="block-stack">
        {blocks.map((block) => renderBlock(block, false))}
      </div>
    );
  }

  // Render segments (cards and non-card blocks)
  return (
    <div className="block-stack">
      {segments.map((segment, index) => {
        if (segment.cardId) {
          // Card segment - render with border and controls
          return (
            <div key={segment.cardId} className="block-card">
              <CardControls
                cardId={segment.cardId}
                cardBlocks={segment.blocks}
                onRemove={() => onRemoveCard?.(segment.cardId!)}
              />
              {segment.blocks.map((block) => renderBlock(block, true))}
            </div>
          );
        }

        // Non-card segment - render blocks normally
        return (
          <div key={`segment-${index}`} className="block-segment">
            {segment.blocks.map((block) => renderBlock(block, false))}
          </div>
        );
      })}
    </div>
  );
}
