'use client';

import { FormEvent } from 'react';
import { PromptInput } from './PromptInput';
import { ComposerLabel } from './ComposerLabel';
import { ComposerHint } from './ComposerHint';
import { BlockControls, BlockAction } from '@/components/chat/BlockControls';
import { Button } from '@/components/ui/Button';

/**
 * Client Component - Main composer form
 * Reference: legacy/index.html lines 46-73
 * Needs 'use client' for form submission and state
 */
interface ComposerProps {
  mode: 'landing' | 'thread';
  selectedBlockId: string | null;
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onSelectionCapture?: (element: HTMLElement | null) => void;
  onBlockAction?: (action: BlockAction) => void;
  disabled?: boolean;
}

export function Composer({
  mode,
  selectedBlockId,
  prompt,
  onPromptChange,
  onSubmit,
  onSelectionCapture,
  onBlockAction,
  disabled = false,
}: ComposerProps) {
  const hasBlockSelected = !!selectedBlockId;

  return (
    <form
      onSubmit={onSubmit}
      className="composer fixed left-1/2 -translate-x-1/2 bottom-6 z-[5] bg-white rounded-xl border border-border composer-shadow p-4 w-[min(768px,calc(100%-48px))] max-h-[50vh] flex flex-col overflow-hidden"
    >
      <ComposerLabel mode={mode} hasBlockSelected={hasBlockSelected} />

      <div className="flex gap-2 items-stretch flex-1 min-h-0">
        <div className="flex-1 min-h-0 min-w-0">
          <PromptInput
            value={prompt}
            onChange={onPromptChange}
            onSelectionCapture={onSelectionCapture}
            onSubmit={() => onSubmit(new Event('submit') as any)}
            disabled={disabled}
            mode={mode}
          />
        </div>
        <Button type="submit" variant="primary" disabled={disabled} className="flex-shrink-0 self-end">
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

      <ComposerHint />
    </form>
  );
}
