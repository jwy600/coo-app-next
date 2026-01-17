/**
 * LandingContainer Component
 *
 * Client Component - Orchestrates landing page with Hero, ThreadList, and Composer
 * Handles new thread creation when user submits from landing page
 *
 * Reference: legacy/index.html structure
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ThreadList } from './ThreadList';
import { Composer } from '@/components/composer/Composer';
import { useComposer } from '@/hooks/useComposer';
import { useStore } from '@/lib/store/useStore';
import type { Thread } from '@/types/thread';

interface LandingContainerProps {
  threads: Thread[];
}

export function LandingContainer({ threads }: LandingContainerProps) {
  const router = useRouter();
  const mode = useStore((state) => state.mode);
  const activeThreadId = useStore((state) => state.activeThreadId);
  const hasInitialResponse = useStore((state) => state.hasInitialResponse);

  // Composer hook (handles submission and thread creation)
  const { prompt, setPrompt, handleSubmit, isSubmitting } = useComposer();

  // Redirect to thread page immediately when thread is created (mode changes to chat)
  // Don't wait for response - this allows user to see their question appear first
  useEffect(() => {
    if (mode === 'chat' && activeThreadId) {
      // Navigate immediately after user message is added
      // The thread page will show the user's question, then the response will stream in
      router.push(`/t/${activeThreadId}`);
    }
  }, [mode, activeThreadId, router]);

  return (
    <div className="landing-layout">
      <div className="landing-content">
        <ThreadList threads={threads} />
      </div>

      <Composer
        mode="landing"
        selectedBlockId={null}
        prompt={prompt}
        onPromptChange={setPrompt}
        onSubmit={handleSubmit}
        disabled={isSubmitting}
      />
    </div>
  );
}
