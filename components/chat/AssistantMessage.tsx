'use client';

import { memo } from 'react';
import { Message } from '@/types/message';
import { MarkdownContent } from '@/components/content/MarkdownContent';

interface AssistantMessageProps {
  message: Message;
}

export const AssistantMessage = memo(function AssistantMessage({
  message,
}: AssistantMessageProps) {
  return (
    <div className="assistant-message" data-message-id={message.id}>
      <span className="assistant-label">Coo</span>
      <MarkdownContent text={message.text} />
    </div>
  );
});
