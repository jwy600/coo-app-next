'use client';

import { useRef, useEffect } from 'react';
import { Message } from '@/types/message';
import { Block } from '@/types/block';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { PendingMessage } from './PendingMessage';
import { ErrorMessage } from './ErrorMessage';

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
  onBlockSelect,
  onRemoveSelection,
  onClearSelections,
  onRewrite,
  onRetry,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (containerRef.current) {
      const lastChild = containerRef.current.lastElementChild;
      if (lastChild) {
        requestAnimationFrame(() => {
          lastChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
      }
    }
  }, [messages.length, isPending, error]);

  // Create block lookup map
  const blockLookup = new Map(blocks.map((block) => [block.id, block]));

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

      {isPending && <PendingMessage />}
      {error && <ErrorMessage error={error} onRetry={onRetry} />}
    </div>
  );
}
