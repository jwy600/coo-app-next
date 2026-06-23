"use client";

import { FormEvent } from "react";
import { Composer } from "@/components/composer/Composer";

interface EmptyStateProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  disabled?: boolean;
}

export function EmptyState({
  prompt,
  onPromptChange,
  onSubmit,
  disabled = false,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          When a line trips you up, get it untangled in place.
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Treat LLM response like your own writing -- edit it, summarize it, ask about it, and delete it if you still don't like it.
        </p>
      </div>

      <div className="w-full max-w-2xl">
        <Composer
          prompt={prompt}
          onPromptChange={onPromptChange}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
