'use client';

import { FormEvent } from 'react';
import { PromptInput } from './PromptInput';
import { ComposerHint } from './ComposerHint';
import { Button } from '@/components/ui/button';

interface ComposerProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  disabled?: boolean;
}

export function Composer({
  prompt,
  onPromptChange,
  onSubmit,
  disabled = false,
}: ComposerProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="composer bg-background rounded-xl border border-border composer-shadow p-4 max-h-[50vh] flex flex-col overflow-hidden w-full"
    >
      <div className="flex gap-2 items-stretch flex-1 min-h-0">
        <div className="flex-1 min-h-0 min-w-0">
          <PromptInput
            value={prompt}
            onChange={onPromptChange}
            onSubmit={() => onSubmit(new Event('submit') as unknown as FormEvent)}
            disabled={disabled}
          />
        </div>
        <Button
          type="submit"
          variant="default"
          disabled={disabled}
          className="flex-shrink-0 self-end"
        >
          <span>Send</span>
          <span aria-hidden="true" className="ml-1">
            →
          </span>
        </Button>
      </div>

      <ComposerHint />
    </form>
  );
}
