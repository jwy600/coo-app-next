'use client';

import { Block } from '@/types/block';
import { BlockContent } from '@/components/content/BlockContent';
import { SelectionChips } from './SelectionChips';

/**
 * Client Component - Individual editable block with selection handle
 * Reference: legacy/app.js lines 500-573
 * Needs 'use client' for click handlers and selection state
 */
interface DocBlockProps {
  block: Block;
  isSelected: boolean;
  onSelect?: (blockId: string) => void;
  onRemoveSelection?: (blockId: string, index: number) => void;
  onClearSelections?: (blockId: string) => void;
  onRewrite?: (blockId: string) => void;
}

export function DocBlock({
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
