'use client';

import { Block } from '@/types/block';
import { DocBlock } from './DocBlock';
import { getSectionRange } from '@/lib/state/heading';

/**
 * Client Component - Container for multiple blocks
 * Handles section mode display and block selection
 */
interface BlockStackProps {
  blocks: Block[];
  selectedBlockIds: string[];
  sectionHeadingId: string | null;
  onBlockSelect?: (blockId: string) => void;
  onEnterSectionMode?: (headingId: string) => void;
  onRemoveSelection?: (blockId: string, index: number) => void;
  onClearSelections?: (blockId: string) => void;
  onRewrite?: (blockId: string) => void;
}

export function BlockStack({
  blocks,
  selectedBlockIds,
  sectionHeadingId,
  onBlockSelect,
  onEnterSectionMode,
  onRemoveSelection,
  onClearSelections,
  onRewrite,
}: BlockStackProps) {
  // Get section range if in section mode
  const sectionRange = sectionHeadingId
    ? getSectionRange(blocks, sectionHeadingId)
    : null;

  const renderBlock = (block: Block, isInSection: boolean = false) => {
    const isSelected = selectedBlockIds.includes(block.id);
    return (
      <DocBlock
        key={block.id}
        block={block}
        isSelected={isSelected}
        isInSection={isInSection}
        onSelect={onBlockSelect}
        onEnterSectionMode={onEnterSectionMode}
        onRemoveSelection={onRemoveSelection}
        onClearSelections={onClearSelections}
        onRewrite={onRewrite}
      />
    );
  };

  // No section mode - render all blocks normally
  if (!sectionRange) {
    return (
      <div className="block-stack">
        {blocks.map((block) => renderBlock(block, false))}
      </div>
    );
  }

  // Section mode - group the section with a border
  const { startIndex, endIndex } = sectionRange;
  const beforeSection = blocks.slice(0, startIndex);
  const sectionBlocks = blocks.slice(startIndex, endIndex + 1);
  const afterSection = blocks.slice(endIndex + 1);

  return (
    <div className="block-stack">
      {beforeSection.map((block) => renderBlock(block, false))}
      <div className="block-section">
        {sectionBlocks.map((block) => renderBlock(block, true))}
      </div>
      {afterSection.map((block) => renderBlock(block, false))}
    </div>
  );
}
