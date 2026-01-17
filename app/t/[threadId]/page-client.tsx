/**
 * Thread Detail Page (Client-Only Version)
 *
 * Client component that loads thread data client-side to avoid hydration issues
 * when navigating from landing page with existing store data
 */

'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { Orbs } from '@/components/ui/Orbs';

interface ThreadPageClientProps {
  threadId: string;
}

export function ThreadPageClient({ threadId }: ThreadPageClientProps) {
  const [mounted, setMounted] = useState(false);

  // Only render after client-side hydration to prevent mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a simple loading state during SSR and initial hydration
    return (
      <>
        <Orbs />
        <div className="min-h-screen">
          <Header mode="chat" />
          <main className="max-w-chat mx-auto pb-32 flex items-center justify-center min-h-[50vh]">
            <div className="text-gray-500">Loading...</div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Orbs />
      <div className="min-h-screen" suppressHydrationWarning>
        <Header mode="chat" />
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
