'use client';

import { memo, useRef, useCallback, useEffect } from 'react';
import { Block } from '@/types/block';
import { BlockContent } from '@/components/content/BlockContent';
import { SelectionChips } from './SelectionChips';

/**
 * Client Component - Individual editable block with selection handle
 *
 * Single-click gutter: Select block for composer/transform
 * Double-click gutter: Create card for display/export
 *
 * Wrapped in React.memo with custom comparator to prevent unnecessary re-renders
 * when parent re-renders with new callback references but same data.
 */
interface DocBlockProps {
  block: Block;
  isSelected: boolean;
  isInCard?: boolean; // Block is inside a card border
  cardId?: string; // ID of the card this block belongs to (if any)
  onSelect?: (blockId: string) => void;
  onAddCard?: (anchorBlockId: string) => void; // Double-click gutter to create card
  onRemoveSelection?: (blockId: string, index: number) => void;
  onRewrite?: (blockId: string) => void;
  onUndo?: (blockId: string) => void;
}

// Delay to distinguish single-click from double-click (in ms)
const CLICK_DELAY = 200;

function DocBlockComponent({
  block,
  isSelected,
  isInCard = false,
  cardId,
  onSelect,
  onAddCard,
  onRemoveSelection,
  onRewrite,
  onUndo,
}: DocBlockProps) {
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // Handle gutter click with delay to distinguish from double-click
  const handleClick = useCallback(() => {
    // Delay single-click to check for double-click
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    clickTimeoutRef.current = setTimeout(() => {
      onSelect?.(block.id);
      clickTimeoutRef.current = null;
    }, CLICK_DELAY);
  }, [block.id, onSelect]);

  // Double-click gutter: create/toggle card
  // If block is already in a card, double-click does nothing
  // If not in a card, creates a new card anchored at this block
  const handleGutterDoubleClick = useCallback(() => {
    // Cancel pending single-click
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    // If block is in a card, do nothing (except if clicking the anchor - handled by store)
    // onAddCard handles the toggle logic
    onAddCard?.(block.id);
  }, [block.id, onAddCard]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // For keyboard, always execute single-click immediately
      onSelect?.(block.id);
    }
  }, [block.id, onSelect]);

  // Determine visual state
  // isSelected = explicitly selected for composer/transform
  // isInCard = inside card border (for display/export)
  const showSelectedBackground = isSelected;
  const showMuted = !isSelected && !isInCard && onSelect;

  return (
    <div
      className={`doc-block ${showSelectedBackground ? 'is-selected' : ''} ${
        showMuted ? 'is-muted' : ''
      }`}
      data-block-id={block.id}
      data-card-id={cardId}
    >
      {/* Gutter handle - 6 dots */}
      <button
        type="button"
        className="gutter-handle"
        onClick={handleClick}
        onDoubleClick={handleGutterDoubleClick}
        onKeyDown={handleKeyDown}
        aria-label={block.type === 'heading' ? 'Select heading' : 'Select block'}
        title="Click to select, double-click to create card"
      >
      </button>

      {/* Block content */}
      <div className="doc-content">
        <BlockContent text={block.text} type={block.type} />

        {/* Selection chips (only show when selected) */}
        {isSelected && (
          <SelectionChips
            block={block}
            onRemoveSelection={(index) => onRemoveSelection?.(block.id, index)}
            onRewrite={() => onRewrite?.(block.id)}
            onUndo={() => onUndo?.(block.id)}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Memoized DocBlock - only re-renders when block data or selection state changes
 * Ignores callback reference changes since they're stable in behavior
 */
export const DocBlock = memo(DocBlockComponent, (prevProps, nextProps) => {
  // Re-render if selection state changed
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.isInCard !== nextProps.isInCard) return false;
  if (prevProps.cardId !== nextProps.cardId) return false;

  // Re-render if block data changed
  const prevBlock = prevProps.block;
  const nextBlock = nextProps.block;

  if (prevBlock.id !== nextBlock.id) return false;
  if (prevBlock.text !== nextBlock.text) return false;
  if (prevBlock.type !== nextBlock.type) return false;
  if (prevBlock.edited !== nextBlock.edited) return false;
  if (prevBlock.isRewritten !== nextBlock.isRewritten) return false;
  if (prevBlock.prevText !== nextBlock.prevText) return false;

  // Check selections array (shallow string comparison)
  if (prevBlock.selections.length !== nextBlock.selections.length) return false;
  for (let i = 0; i < prevBlock.selections.length; i++) {
    if (prevBlock.selections[i] !== nextBlock.selections[i]) {
      return false;
    }
  }

  // No changes detected - skip re-render
  return true;
});
