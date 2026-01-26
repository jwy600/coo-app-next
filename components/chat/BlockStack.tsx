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

function getHeadingLevel(text: string): number {
  const match = text.match(/^(#{1,6})\s/);
  return match ? match[1].length : 0;
}

function getSelectedHeadingSectionRange(
  blocks: Block[],
  selectedBlockIds: string[]
): { startIndex: number; endIndex: number } | null {
  // Find if any selected block is a heading
  const selectedHeadingIndex = blocks.findIndex(
    (block) => block.type === 'heading' && selectedBlockIds.includes(block.id)
  );

  if (selectedHeadingIndex === -1) return null;

  const selectedHeading = blocks[selectedHeadingIndex];
  const headingLevel = getHeadingLevel(selectedHeading.text);

  // Find end of section: next heading of same or higher level (lower number)
  let endIndex = blocks.length - 1;
  for (let i = selectedHeadingIndex + 1; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type === 'heading') {
      const level = getHeadingLevel(block.text);
      if (level <= headingLevel) {
        endIndex = i - 1;
        break;
      }
    }
  }

  return { startIndex: selectedHeadingIndex, endIndex };
}

export function BlockStack({
  blocks,
  selectedBlockIds,
  onBlockSelect,
  onRemoveSelection,
  onClearSelections,
  onRewrite,
}: BlockStackProps) {
  const sectionRange = getSelectedHeadingSectionRange(blocks, selectedBlockIds);

  const renderBlock = (block: Block) => {
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
  };

  // No heading selected - render all blocks normally
  if (!sectionRange) {
    return (
      <div className="block-stack">
        {blocks.map(renderBlock)}
      </div>
    );
  }

  // Heading selected - group the section with a border
  const { startIndex, endIndex } = sectionRange;
  const beforeSection = blocks.slice(0, startIndex);
  const sectionBlocks = blocks.slice(startIndex, endIndex + 1);
  const afterSection = blocks.slice(endIndex + 1);

  return (
    <div className="block-stack">
      {beforeSection.map(renderBlock)}
      <div className="block-section">
        {sectionBlocks.map(renderBlock)}
      </div>
      {afterSection.map(renderBlock)}
    </div>
  );
}
