'use client';

import { Block } from '@/types/block';
import { DocBlock } from './DocBlock';

/**
 * Client Component - Container for multiple blocks
 * Applies muted styling to non-selected blocks when one is selected
 * Reference: legacy/app.js lines 575-595
 */
interface BlockStackProps {
  blocks: Block[];
  selectedBlockIds: string[];
  onBlockSelect?: (blockId: string) => void;
  onRemoveSelection?: (blockId: string, index: number) => void;
  onClearSelections?: (blockId: string) => void;
  onRewrite?: (blockId: string) => void;
}

export function BlockStack({
  blocks,
  selectedBlockIds,
  onBlockSelect,
  onRemoveSelection,
  onClearSelections,
  onRewrite,
}: BlockStackProps) {
  return (
    <div className="block-stack">
      {blocks.map((block) => {
        const isSelected = selectedBlockIds.includes(block.id);

        return (
          <DocBlock
            key={block.id}
            block={block}
            isSelected={isSelected}
            onSelect={onBlockSelect}
            onRemoveSelection={onRemoveSelection}
            onClearSelections={onClearSelections}
            onRewrite={onRewrite}
          />
        );
      })}
    </div>
  );
}
