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
  selectedBlockId: string | null;
  onBlockSelect?: (blockId: string) => void;
  onRemoveSelection?: (blockId: string, index: number) => void;
  onClearSelections?: (blockId: string) => void;
  onRewrite?: (blockId: string) => void;
}

export function BlockStack({
  blocks,
  selectedBlockId,
  onBlockSelect,
  onRemoveSelection,
  onClearSelections,
  onRewrite,
}: BlockStackProps) {
  return (
    <div className="space-y-4">
      {blocks.map((block) => {
        const isSelected = selectedBlockId === block.id;
        const isMuted = selectedBlockId !== null && !isSelected;

        return (
          <div
            key={block.id}
            className={isMuted ? 'opacity-40' : ''}
          >
            <DocBlock
              block={block}
              isSelected={isSelected}
              onSelect={onBlockSelect}
              onRemoveSelection={onRemoveSelection}
              onClearSelections={onClearSelections}
              onRewrite={onRewrite}
            />
          </div>
        );
      })}
    </div>
  );
}
