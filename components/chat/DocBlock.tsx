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
      className={`relative group flex gap-2 ${isSelected ? 'is-selected' : ''} ${
        !isSelected && onSelect ? 'is-muted' : ''
      }`}
      data-block-id={block.id}
    >
      {/* Gutter handle - 6 dots */}
      <button
        type="button"
        className="w-6 h-6 opacity-0 group-hover:opacity-100 transition flex-shrink-0 cursor-pointer border-none bg-transparent"
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        aria-label="Select paragraph"
        title="Select paragraph"
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-gray-400 hover:text-gray-600"
        >
          <circle cx="8" cy="6" r="1.5" />
          <circle cx="16" cy="6" r="1.5" />
          <circle cx="8" cy="12" r="1.5" />
          <circle cx="16" cy="12" r="1.5" />
          <circle cx="8" cy="18" r="1.5" />
          <circle cx="16" cy="18" r="1.5" />
        </svg>
      </button>

      {/* Block content */}
      <div className="flex-1">
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
