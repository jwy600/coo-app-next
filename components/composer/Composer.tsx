'use client';

import { FormEvent } from 'react';
import { PromptInput } from './PromptInput';
import { ComposerHint } from './ComposerHint';
import { BlockModeToggle } from './BlockModeToggle';
import { BlockControls, UIBlockAction } from '@/components/chat/BlockControls';
import { Button } from '@/components/ui/button';
import type { ComposerMode } from '@/types/state/ui';

/**
 * Client Component - Main composer form
 * Needs 'use client' for form submission and state
 */
interface ComposerProps {
  selectedBlockId: string | null;
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onSelectionCapture?: (element: HTMLElement | null) => void;
  onBlockAction?: (action: UIBlockAction) => void;
  composerMode?: ComposerMode;
  onComposerModeChange?: (mode: 'ask' | 'edit') => void;
  disabled?: boolean;
}

export function Composer({
  selectedBlockId,
  prompt,
  onPromptChange,
  onSubmit,
  onSelectionCapture,
  onBlockAction,
  composerMode = 'chat',
  onComposerModeChange,
  disabled = false,
}: ComposerProps) {
  // Show block controls when a block is selected and in ask mode
  const hasBlockSelected = !!selectedBlockId;
  const isEditMode = composerMode === 'edit';
  const showBlockControls = hasBlockSelected && composerMode === 'ask';

  return (
    <form
      onSubmit={onSubmit}
      className="composer bg-background rounded-xl border border-border composer-shadow p-4 max-h-[50vh] flex flex-col overflow-hidden w-full"
    >
      {/* Ask/Edit toggle + Block actions - shown when block is selected */}
      {hasBlockSelected && onComposerModeChange && (
        <div className="mb-3 flex-shrink-0 flex items-center gap-3">
          <BlockModeToggle
            mode={composerMode === 'edit' ? 'edit' : 'ask'}
            onModeChange={onComposerModeChange}
            disabled={disabled}
          />
          {showBlockControls && (
            <BlockControls onAction={onBlockAction} disabled={disabled} />
          )}
        </div>
      )}

      <div className="flex gap-2 items-stretch flex-1 min-h-0">
        <div className="flex-1 min-h-0 min-w-0">
          <PromptInput
            value={prompt}
            onChange={onPromptChange}
            onSelectionCapture={isEditMode ? undefined : onSelectionCapture}
            onSubmit={() => onSubmit(new Event('submit') as any)}
            disabled={disabled}
            hasBlockSelected={hasBlockSelected}
            composerMode={composerMode}
          />
        </div>
        <Button type="submit" variant="default" disabled={disabled} className="flex-shrink-0 self-end">
          <span>{isEditMode ? 'Replace' : 'Send'}</span>
          <span aria-hidden="true" className="ml-1">
            {isEditMode ? '↻' : '→'}
          </span>
        </Button>
      </div>

      <ComposerHint hidden={hasBlockSelected} />
    </form>
  );
}
