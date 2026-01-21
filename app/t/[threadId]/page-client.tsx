/**
 * Thread Detail Page (Client-Only Version)
 *
 * Client component that loads thread data client-side to avoid hydration issues
 * when navigating from landing page with existing store data
 */

'use client';

import { Header } from '@/components/layout/Header';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { Orbs } from '@/components/ui/Orbs';

interface ThreadPageClientProps {
  threadId: string;
}

export function ThreadPageClient({ threadId }: ThreadPageClientProps) {
  // Removed mounted state check - we're navigating client-side from landing page,
  // so there's no SSR hydration mismatch to worry about
  // This eliminates the "Loading..." flash on first question

  return (
    <>
      <Orbs />
      <div className="min-h-screen" suppressHydrationWarning>
        <Header mode="thread" />
        <main suppressHydrationWarning>
          <ChatContainer
            threadId={threadId}
            // Let ChatContainer fetch data client-side via useThreadSync
            initialThread={undefined}
            initialMessages={undefined}
            initialBlocks={undefined}
          />
        </main>
      </div>
    </>
  );
}
