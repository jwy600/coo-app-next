'use client';

import { memo, useRef } from 'react';
import { Message } from '@/types/message';
import { MarkdownContent } from '@/components/content/MarkdownContent';
import { FocusEditor } from '@/components/editor/FocusEditor';
import { useStore } from '@/lib/store/useStore';
import { useFocusSelection } from '@/hooks/useFocusSelection';

interface AssistantMessageProps {
  message: Message;
}

export const AssistantMessage = memo(function AssistantMessage({
  message,
}: AssistantMessageProps) {
  const focus = useStore((s) => s.focus);
  const streamingMessageId = useStore((s) => s.streamingMessageId);
  const containerRef = useRef<HTMLDivElement>(null);

  const isStreaming = streamingMessageId === message.id;
  const isFocused = focus?.messageId === message.id;

  useFocusSelection({
    messageId: message.id,
    containerRef,
    enabled: !isStreaming && !isFocused,
  });

  const renderBody = () => {
    if (!isFocused || !focus) {
      return <MarkdownContent text={message.text} />;
    }
    const before = message.text.slice(0, focus.range[0]);
    const after = message.text.slice(focus.range[1]);
    return (
      <>
        {before && <MarkdownContent text={before} />}
        <FocusEditor />
        {after && <MarkdownContent text={after} />}
      </>
    );
  };

  return (
    <div
      ref={containerRef}
      className="assistant-message"
      data-testid="assistant-message"
      data-message-id={message.id}
    >
      <span className="assistant-label">Coo</span>
      {message.meta?.source === 'import' && (
        <div className="doc-source-marker">
          from{' '}
          {typeof message.meta?.fileName === 'string'
            ? message.meta.fileName
            : 'file'}
          {message.meta?.registerState === 'registering' && ' · Embedding…'}
        </div>
      )}
      {renderBody()}
    </div>
  );
});
