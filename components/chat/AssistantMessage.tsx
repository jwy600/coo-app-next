'use client';

import { memo, useMemo } from 'react';
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
  onRewrite?: (blockId: string) => void;
  onUndo?: (blockId: string) => void;
}

export const AssistantMessage = memo(function AssistantMessage({
  message,
  blocks,
  selectedBlockId = null,
  cards = [],
  onBlockSelect,
  onAddCard,
  onRemoveCard,
  onRemoveSelection,
  onRewrite,
  onUndo,
}: AssistantMessageProps) {
  // Cards only change on explicit user action, not during streaming, so
  // memoizing keeps the BlockStack's `cards` prop referentially stable
  // across every streaming token.
  const messageCards = useMemo(
    () => cards.filter((c) => c.messageId === message.id),
    [cards, message.id],
  );

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
        onRewrite={onRewrite}
        onUndo={onUndo}
      />
    </div>
  );
});
