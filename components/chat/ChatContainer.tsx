'use client';

import { useEffect, useCallback } from 'react';
import { MessageList } from './MessageList';
import { Composer } from '@/components/composer/Composer';
import { DeleteThreadButton } from './DeleteThreadButton';
import { ExportButton } from './ExportButton';
import { useComposer } from '@/hooks/useComposer';
import { useDocRegistration } from '@/hooks/useDocRegistration';
import { useShallow } from 'zustand/react/shallow';
import { useStore, selectMessagesByThread, selectIsRegistering } from '@/lib/store/useStore';

interface ChatContainerProps {
  threadId: string;
}

export function ChatContainer({ threadId }: ChatContainerProps) {
  const setMode = useStore((state) => state.setMode);
  const setActiveThread = useStore((state) => state.setActiveThread);
  const messages = useStore(useShallow(selectMessagesByThread(threadId)));
  const streamingMessageId = useStore((state) => state.streamingMessageId);

  useEffect(() => {
    if (threadId) {
      setActiveThread(threadId);
      setMode('thread');
    }
  }, [threadId, setActiveThread, setMode]);

  const { prompt, setPrompt, handleSubmit, isSubmitting } = useComposer();
  useDocRegistration(threadId);
  const isRegistering = useStore(selectIsRegistering);

  const error = useStore((state) => state.error);

  const handleRetry = useCallback(() => {
    // After a failed doc upload the thread is empty — Retry means "go back and
    // reattach" rather than re-running an empty chat submit.
    const state = useStore.getState();
    const thread = state.threads.find((t) => t.id === threadId);
    if (!thread || thread.messages.length === 0) {
      state.setMode('landing');
      return;
    }
    handleSubmit();
  }, [handleSubmit, threadId]);

  return (
    <div className="flex flex-col h-full">
      <div className="chat-toolbar relative flex items-center justify-center px-4 border-b border-border/50 min-h-[52px]">
        <div className="absolute right-4 flex items-center gap-2">
          <DeleteThreadButton />
          <ExportButton />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-chat mx-auto">
          <MessageList
            messages={messages}
            isPending={isSubmitting}
            error={error}
            streamingMessageId={streamingMessageId}
            onRetry={handleRetry}
          />
        </div>
      </div>

      <div className="flex-shrink-0 p-4 pb-6">
        <div className="max-w-chat mx-auto">
          <Composer
            prompt={prompt}
            onPromptChange={setPrompt}
            onSubmit={handleSubmit}
            disabled={isSubmitting || isRegistering}
          />
        </div>
      </div>
    </div>
  );
}
