/**
 * Thread Detail Page (Server Component)
 *
 * Loads thread data server-side and passes to ChatContainer client component.
 * Handles 404 for invalid thread IDs.
 *
 * Reference: legacy routing hash-based system (#/t/{id})
 * Phase 8: Pages & Routing Implementation
 */

import { notFound } from 'next/navigation';
import { loadThreadFromSupabase } from '@/lib/supabase/threads';
import { loadMessagesForThread } from '@/lib/supabase/messages';
import { loadBlocksForThread } from '@/lib/supabase/blocks';
import { Header } from '@/components/layout/Header';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { Orbs } from '@/components/ui/Orbs';
import type { Thread } from '@/types/thread';

export const dynamic = 'force-dynamic'; // Always fetch fresh data

interface ThreadPageProps {
  params: Promise<{
    threadId: string;
  }>;
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { threadId } = await params;

  // Load thread data server-side
  const threadData = await loadThreadFromSupabase(threadId);

  if (!threadData) {
    // Thread doesn't exist - show 404
    notFound();
  }

  // Load messages and blocks for this thread
  const messages = await loadMessagesForThread(threadId);
  const blocks = await loadBlocksForThread(threadId);

  // Build complete thread object with messages
  const completeThread: Thread = {
    id: threadData.id,
    title: threadData.title,
    createdAt: threadData.createdAt,
    updatedAt: threadData.updatedAt,
    messages: messages.map((msg) => ({
      id: msg.id,
      threadId: msg.threadId,
      role: msg.role,
      createdAt: msg.createdAt,
      content: blocks
        .filter((b) => b.messageId === msg.id)
        .map((b) => ({ blockId: b.id })),
      meta: msg.meta || {},
    })),
  };

  return (
    <>
      <Orbs />
      <div className="min-h-screen">
        <Header mode="chat" />
        <main>
          <ChatContainer
            threadId={threadId}
            initialThread={completeThread}
            initialMessages={messages}
            initialBlocks={blocks}
          />
        </main>
      </div>
    </>
  );
}
