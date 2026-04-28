'use client';

import { useRef, useEffect } from 'react';
import { Message } from '@/types/message';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { PendingMessage } from './PendingMessage';
import { ErrorMessage } from './ErrorMessage';

interface MessageListProps {
  messages: Message[];
  isPending?: boolean;
  error?: string | null;
  streamingMessageId?: string | null;
  onRetry?: () => void;
}

export function MessageList({
  messages,
  isPending = false,
  error = null,
  streamingMessageId = null,
  onRetry,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!streamingMessageId || !containerRef.current) return;
    const lastChild = containerRef.current.lastElementChild;
    if (lastChild) {
      requestAnimationFrame(() => {
        lastChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
  }, [streamingMessageId]);

  const showPending =
    isPending && !streamingMessageId;

  return (
    <div ref={containerRef} className="thread" aria-live="polite">
      {messages.map((message) =>
        message.role === 'user' ? (
          <UserMessage key={message.id} message={message} />
        ) : (
          <AssistantMessage key={message.id} message={message} />
        ),
      )}

      {showPending && <PendingMessage />}
      {error && <ErrorMessage error={error} onRetry={onRetry} />}
    </div>
  );
}
