'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { Message } from '@/types/message';
import { Block, BlockData } from '@/types/block';
import { Card } from '@/types/card';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { PendingMessage } from './PendingMessage';
import { ErrorMessage } from './ErrorMessage';

/**
 * Streaming message data for in-progress responses
 */
interface StreamingMessageData {
  messageId: string;
  threadId: string;
  blocks: BlockData[];
}

// Stable empty array so AssistantMessage's `cards` prop keeps identity
// across streaming re-renders (new [] per render would defeat memo).
const EMPTY_CARDS: Card[] = [];
const EMPTY_BLOCKS: Block[] = [];

/**
 * Client Component - Container for all messages in a thread
 * Needs 'use client' for scroll handling and state
 */
interface MessageListProps {
  messages: Message[];
  blocks: Block[];
  selectedBlockId?: string | null;
  cards?: Card[];
  isPending?: boolean;
  error?: string | null;
  streamingMessage?: StreamingMessageData | null;
  onBlockSelect?: (blockId: string) => void;
  onAddCard?: (anchorBlockId: string) => void;
  onRemoveCard?: (cardId: string) => void;
  onRemoveSelection?: (blockId: string, index: number) => void;
  onRewrite?: (blockId: string) => void;
  onUndo?: (blockId: string) => void;
  onRetry?: () => void;
}

export function MessageList({
  messages,
  blocks,
  selectedBlockId = null,
  cards = [],
  isPending = false,
  error = null,
  streamingMessage = null,
  onBlockSelect,
  onAddCard,
  onRemoveCard,
  onRemoveSelection,
  onRewrite,
  onUndo,
  onRetry,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Capture timestamp when streaming starts for stable render
  const [streamingTimestamp, setStreamingTimestamp] = useState<number | null>(null);

  // Auto-scroll to bottom when streaming starts for a new chat message
  // Block transformations and rewrite don't use streaming, so they won't trigger this
  const streamingMessageId = streamingMessage?.messageId;
  useEffect(() => {
    if (!streamingMessageId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset timestamp when streaming ends
      setStreamingTimestamp(null);
      return;
    }

    // Capture timestamp when streaming starts
    setStreamingTimestamp(Date.now());

    if (containerRef.current) {
      const lastChild = containerRef.current.lastElementChild;
      if (lastChild) {
        requestAnimationFrame(() => {
          lastChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
      }
    }
  }, [streamingMessageId]);

  // Memoize block lookup map to avoid recreation on every render
  const blockLookup = useMemo(
    () => new Map(blocks.map((block) => [block.id, block])),
    [blocks]
  );

  // Per-message block arrays, keyed by messageId. Recomputed only when the
  // messages array or the block lookup changes — so `AssistantMessage` sees
  // the same `blocks` reference across streaming tokens for every finished
  // message.
  const blocksByMessage = useMemo(() => {
    const map = new Map<string, Block[]>();
    for (const message of messages) {
      if (message.role !== 'assistant') continue;
      const messageBlocks = message.content
        .map((item) => blockLookup.get(item.blockId))
        .filter((block): block is Block => block !== undefined);
      map.set(message.id, messageBlocks);
    }
    return map;
  }, [messages, blockLookup]);

  // Streaming message + its synthesized blocks change identity on every
  // token otherwise, forcing AssistantMessage + BlockStack to re-render
  // even for unchanged blocks.
  const streamingAssistantMessage = useMemo(() => {
    if (!streamingMessage) return null;
    return {
      id: streamingMessage.messageId,
      threadId: streamingMessage.threadId,
      role: 'assistant' as const,
      createdAt: streamingTimestamp ?? 0,
      content: streamingMessage.blocks.map((_, i) => ({ blockId: `stream-${i}` })),
      meta: {},
    };
  }, [streamingMessage, streamingTimestamp]);

  const streamingBlocks = useMemo<Block[]>(() => {
    if (!streamingMessage) return [];
    return streamingMessage.blocks.map((blockData, i) => ({
      id: `stream-${i}`,
      messageId: streamingMessage.messageId,
      type: blockData.type,
      text: blockData.text,
      edited: false,
      selections: [],
      prevText: null,
      isRewritten: false,
    }));
  }, [streamingMessage]);

  return (
    <div
      ref={containerRef}
      className="thread"
      aria-live="polite"
    >
      {messages.map((message) => {
        if (message.role === 'user') {
          const blockRef = message.content?.[0];
          const block = blockRef ? blockLookup.get(blockRef.blockId) : undefined;
          return <UserMessage key={message.id} message={message} block={block} />;
        }

        // Assistant message — use the memoized per-message block array so
        // AssistantMessage's `blocks` prop stays referentially stable.
        const messageBlocks = blocksByMessage.get(message.id) ?? EMPTY_BLOCKS;

        return (
          <AssistantMessage
            key={message.id}
            message={message}
            blocks={messageBlocks}
            selectedBlockId={selectedBlockId}
            cards={cards}
            onBlockSelect={onBlockSelect}
            onAddCard={onAddCard}
            onRemoveCard={onRemoveCard}
            onRemoveSelection={onRemoveSelection}
            onRewrite={onRewrite}
            onUndo={onUndo}
          />
        );
      })}

      {/* Streaming message (in-progress response) */}
      {streamingAssistantMessage && streamingBlocks.length > 0 && (
        <AssistantMessage
          key="streaming"
          message={streamingAssistantMessage}
          blocks={streamingBlocks}
          selectedBlockId={null}
          cards={EMPTY_CARDS}
        />
      )}

      {isPending && !selectedBlockId && cards.length === 0 && (!streamingMessage || streamingMessage.blocks.length === 0) && <PendingMessage />}
      {error && <ErrorMessage error={error} onRetry={onRetry} />}
    </div>
  );
}
