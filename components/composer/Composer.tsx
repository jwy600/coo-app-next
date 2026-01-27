'use client';

import { FormEvent } from 'react';
import { PromptInput } from './PromptInput';
import { ComposerHint } from './ComposerHint';
import { BlockControls, UIBlockAction } from '@/components/chat/BlockControls';
import { Button } from '@/components/ui/button';

/**
 * Client Component - Main composer form
 * Needs 'use client' for form submission and state
 */
interface ComposerProps {
  selectedBlockId: string | null;
  isInSectionMode?: boolean;
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onSelectionCapture?: (element: HTMLElement | null) => void;
  onBlockAction?: (action: UIBlockAction) => void;
  disabled?: boolean;
}

export function Composer({
  selectedBlockId,
  isInSectionMode = false,
  prompt,
  onPromptChange,
  onSubmit,
  onSelectionCapture,
  onBlockAction,
  disabled = false,
}: ComposerProps) {
  // Show block controls when block selected OR in section mode
  const hasBlockSelected = !!selectedBlockId || isInSectionMode;

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
            onSelectionCapture={onSelectionCapture}
            onSubmit={() => onSubmit(new Event('submit') as any)}
            disabled={disabled}
            hasBlockSelected={hasBlockSelected}
          />
        </div>
        <Button type="submit" variant="default" disabled={disabled} className="flex-shrink-0 self-end">
          <span>Send</span>
          <span aria-hidden="true" className="ml-1">
            →
          </span>
        </Button>
      </div>

      {hasBlockSelected && (
        <div className="mt-2 flex-shrink-0">
          <BlockControls onAction={onBlockAction} disabled={disabled} />
        </div>
      )}

      <ComposerHint hidden={hasBlockSelected} />
    </form>
  );
}
