'use client';

import { Message } from '@/types/message';
import { Block } from '@/types/block';
import { Card } from '@/types/card';
import { BlockStack } from './BlockStack';

/**
 * Client Component - Assistant message with blocks
 * Needs 'use client' for block selection and card state
 */
interface AssistantMessageProps {
  message: Message;
  blocks: Block[];
  selectedBlockId?: string | null;
  cards?: Card[];
  onBlockSelect?: (blockId: string) => void;
  onAddCard?: (anchorBlockId: string) => void;
  onRemoveCard?: (cardId: string) => void;
  onRemoveSelection?: (blockId: string, index: number) => void;
  onClearSelections?: (blockId: string) => void;
  onRewrite?: (blockId: string) => void;
  onUndo?: (blockId: string) => void;
}

export function AssistantMessage({
  message,
  blocks,
  selectedBlockId = null,
  cards = [],
  onBlockSelect,
  onAddCard,
  onRemoveCard,
  onRemoveSelection,
  onClearSelections,
  onRewrite,
  onUndo,
}: AssistantMessageProps) {
  // Filter cards to only those belonging to this message
  const messageCards = cards.filter((c) => c.messageId === message.id);

  return (
    <div className="assistant-message">
      <span className="assistant-label">Coo</span>
      <BlockStack
        blocks={blocks}
        selectedBlockId={selectedBlockId}
        cards={messageCards}
        onBlockSelect={onBlockSelect}
        onAddCard={onAddCard}
        onRemoveCard={onRemoveCard}
        onRemoveSelection={onRemoveSelection}
        onClearSelections={onClearSelections}
        onRewrite={onRewrite}
        onUndo={onUndo}
      />
    </div>
  );
}
