'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { useComposer } from '@/hooks/useComposer';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/lib/store/useStore';

export function LandingContent() {
  const router = useRouter();
  const mode = useStore((state) => state.mode);
  const activeThreadId = useStore((state) => state.activeThreadId);
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const { prompt, setPrompt, handleSubmit, isSubmitting } = useComposer();

  // Redirect to thread page when thread is created
  useEffect(() => {
    if (mode === 'thread' && activeThreadId) {
      router.push(`/t/${activeThreadId}`);
    }
  }, [mode, activeThreadId, router]);

  // Disable send when not authenticated or submitting
  const isDisabled = isSubmitting || isAuthLoading || !isAuthenticated;

  return (
    <EmptyState
      prompt={prompt}
      onPromptChange={setPrompt}
      onSubmit={handleSubmit}
      disabled={isDisabled}
    />
  );
}
