'use client';

import { memo } from 'react';
import { Block } from '@/types/block';
import { BlockContent } from '@/components/content/BlockContent';
import { SelectionChips } from './SelectionChips';

/**
 * Client Component - Individual editable block with selection handle
 * Reference: legacy/app.js lines 500-573
 * Needs 'use client' for click handlers and selection state
 *
 * Wrapped in React.memo with custom comparator to prevent unnecessary re-renders
 * when parent re-renders with new callback references but same data.
 */
interface DocBlockProps {
  block: Block;
  isSelected: boolean;
  onSelect?: (blockId: string) => void;
  onRemoveSelection?: (blockId: string, index: number) => void;
  onClearSelections?: (blockId: string) => void;
  onRewrite?: (blockId: string) => void;
}

function DocBlockComponent({
  block,
  isSelected,
  onSelect,
  onRemoveSelection,
  onClearSelections,
  onRewrite,
}: DocBlockProps) {
  const handleSelect = () => {
    onSelect?.(block.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect();
    }
  };

  return (
    <div
      className={`doc-block ${isSelected ? 'is-selected' : ''} ${
        !isSelected && onSelect ? 'is-muted' : ''
      }`}
      data-block-id={block.id}
    >
      {/* Gutter handle - 6 dots */}
      <button
        type="button"
        className="gutter-handle"
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        aria-label="Select paragraph"
        title="Select paragraph"
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
            onClearSelections={() => onClearSelections?.(block.id)}
            onRewrite={() => onRewrite?.(block.id)}
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
