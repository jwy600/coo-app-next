"use client";

import { FormEvent } from "react";
import { Composer } from "@/components/composer/Composer";

interface EmptyStateProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  disabled?: boolean;
  needsApiKey?: boolean;
}

export function EmptyState({
  prompt,
  onPromptChange,
  onSubmit,
  disabled = false,
  needsApiKey = false,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Margin notes for GPT
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          coo turns LLM responses into clean blocks you can translate, expand,
          and simplify—right where they appear.
        </p>
      </div>

      <div className="w-full max-w-2xl">
        {needsApiKey && (
          <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground text-center">
            Add your OpenAI API key in <span className="font-medium">Settings</span> to start chatting.
          </div>
        )}
        <Composer
          selectedBlockId={null}
          prompt={prompt}
          onPromptChange={onPromptChange}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
