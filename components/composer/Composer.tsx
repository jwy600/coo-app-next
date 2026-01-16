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
  mode: 'landing' | 'chat';
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
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4"
    >
      <div className="max-w-chat mx-auto">
        <ComposerLabel mode={mode} hasBlockSelected={hasBlockSelected} />

        <div className="flex gap-2">
          <PromptInput
            value={prompt}
            onChange={onPromptChange}
            onSelectionCapture={onSelectionCapture}
            disabled={disabled}
          />
          <Button type="submit" variant="primary" disabled={disabled}>
            <span>Send</span>
            <span aria-hidden="true" className="ml-1">
              →
            </span>
          </Button>
        </div>

        {hasBlockSelected && (
          <div className="mt-2">
            <BlockControls onAction={onBlockAction} disabled={disabled} />
          </div>
        )}

        <ComposerHint />
      </div>
    </form>
  );
}
