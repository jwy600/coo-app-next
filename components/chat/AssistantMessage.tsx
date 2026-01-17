'use client';

import { Message } from '@/types/message';
import { Block } from '@/types/block';
import { BlockStack } from './BlockStack';

/**
 * Client Component - Assistant message with blocks
 * Reference: legacy/app.js lines 575-595
 * Needs 'use client' for block selection state
 */
interface AssistantMessageProps {
  message: Message;
  blocks: Block[];
  selectedBlockId?: string | null;
  onBlockSelect?: (blockId: string) => void;
  onRemoveSelection?: (blockId: string, index: number) => void;
  onClearSelections?: (blockId: string) => void;
  onRewrite?: (blockId: string) => void;
}

export function AssistantMessage({
  message,
  blocks,
  selectedBlockId = null,
  onBlockSelect,
  onRemoveSelection,
  onClearSelections,
  onRewrite,
}: AssistantMessageProps) {
  return (
    <div className="flex gap-3">
      <span className="text-sm font-medium text-gray-700">Coo</span>
      <div className="flex-1 assistant-response">
        <BlockStack
          blocks={blocks}
          selectedBlockId={selectedBlockId}
          onBlockSelect={onBlockSelect}
          onRemoveSelection={onRemoveSelection}
          onClearSelections={onClearSelections}
          onRewrite={onRewrite}
        />
      </div>
    </div>
  );
}
