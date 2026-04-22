"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { useComposer } from "@/hooks/useComposer";
import { useStore } from "@/lib/store/useStore";

export function LandingContent() {
  const router = useRouter();
  const mode = useStore((state) => state.mode);
  const activeThreadId = useStore((state) => state.activeThreadId);
  const apiKey = useStore((state) => state.settings.apiKey);

  const { prompt, setPrompt, handleSubmit, isSubmitting } = useComposer();

  // Avoid SSR/client hydration mismatch: treat apiKey as unknown until mounted.
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (mode === "thread" && activeThreadId) {
      router.push(`/t/${activeThreadId}`);
    }
  }, [mode, activeThreadId, router]);

  const needsApiKey = hasMounted && !apiKey;
  const isDisabled = isSubmitting || needsApiKey;

  return (
    <EmptyState
      prompt={prompt}
      onPromptChange={setPrompt}
      onSubmit={handleSubmit}
      disabled={isDisabled}
      needsApiKey={needsApiKey}
    />
  );
}
