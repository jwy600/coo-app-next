/**
 * ChatContainerWrapper
 *
 * Prevents hydration mismatch by checking if we already have the thread in store
 * before rendering server-provided data
 */

'use client';

import { useEffect, useState } from 'react';
import { ChatContainer } from './ChatContainer';
import { useStore } from '@/lib/store/useStore';
import type { Thread } from '@/types/thread';
import type { Message } from '@/types/message';
import type { Block } from '@/types/block';

interface ChatContainerWrapperProps {
  threadId: string;
  initialThread?: Thread;
  initialMessages?: Message[];
  initialBlocks?: Block[];
}

export function ChatContainerWrapper(props: ChatContainerWrapperProps) {
  const [mounted, setMounted] = useState(false);
  const existingThread = useStore((state) =>
    state.threads.find((t) => t.id === props.threadId)
  );

  // Only render after hydration to prevent mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // During SSR and initial client render, show loading
    return (
      <div className="max-w-chat mx-auto pb-32 flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // If thread exists in store, use client data only (prevents hydration mismatch)
  if (existingThread) {
    return (
      <ChatContainer
        threadId={props.threadId}
        initialThread={undefined}
        initialMessages={undefined}
        initialBlocks={undefined}
      />
    );
  }

  // Otherwise use server-provided data
  return <ChatContainer {...props} />;
}
