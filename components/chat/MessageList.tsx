'use client';

import { useRef, useEffect, useMemo } from 'react';
import { Message } from '@/types/message';
import { Block, BlockData } from '@/types/block';
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

/**
 * Client Component - Container for all messages in a thread
 * Reference: legacy/index.html line 44, legacy/app.js lines 409-424
 * Needs 'use client' for scroll handling and state
 */
interface MessageListProps {
  messages: Message[];
  blocks: Block[];
  selectedBlockId?: string | null;
  isPending?: boolean;
  error?: string | null;
  streamingMessage?: StreamingMessageData | null;
  onBlockSelect?: (blockId: string) => void;
  onRemoveSelection?: (blockId: string, index: number) => void;
  onClearSelections?: (blockId: string) => void;
  onRewrite?: (blockId: string) => void;
  onRetry?: () => void;
}

export function MessageList({
  messages,
  blocks,
  selectedBlockId = null,
  isPending = false,
  error = null,
  streamingMessage = null,
  onBlockSelect,
  onRemoveSelection,
  onClearSelections,
  onRewrite,
  onRetry,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  // Skip auto-scroll in block mode (when a block is selected) so user can see the selected block
  // Note: Auto-scroll is disabled during streaming to prevent jumping
  useEffect(() => {
    // Don't scroll if in block mode
    if (selectedBlockId) return;

    if (containerRef.current) {
      const lastChild = containerRef.current.lastElementChild;
      if (lastChild) {
        requestAnimationFrame(() => {
          lastChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, isPending, error]);

  // Memoize block lookup map to avoid recreation on every render
  const blockLookup = useMemo(
    () => new Map(blocks.map((block) => [block.id, block])),
    [blocks]
  );

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

        // Assistant message - collect all blocks for this message
        const messageBlocks = message.content
          .map((item) => blockLookup.get(item.blockId))
          .filter((block): block is Block => block !== undefined);

        return (
          <AssistantMessage
            key={message.id}
            message={message}
            blocks={messageBlocks}
            selectedBlockId={selectedBlockId}
            onBlockSelect={onBlockSelect}
            onRemoveSelection={onRemoveSelection}
            onClearSelections={onClearSelections}
            onRewrite={onRewrite}
          />
        );
      })}

      {/* Streaming message (in-progress response) */}
      {streamingMessage && streamingMessage.blocks.length > 0 && (
        <AssistantMessage
          key="streaming"
          message={{
            id: streamingMessage.messageId,
            threadId: streamingMessage.threadId,
            role: 'assistant',
            createdAt: Date.now(),
            content: streamingMessage.blocks.map((_, i) => ({ blockId: `stream-${i}` })),
            meta: {},
          }}
          blocks={streamingMessage.blocks.map((blockData, i) => ({
            id: `stream-${i}`,
            messageId: streamingMessage.messageId,
            type: blockData.type,
            text: blockData.text,
            edited: false,
            selections: [],
            prevText: null,
            isRewritten: false,
          }))}
          selectedBlockId={null}
        />
      )}

      {isPending && !streamingMessage && <PendingMessage />}
      {error && <ErrorMessage error={error} onRetry={onRetry} />}
    </div>
  );
}
