'use client';

import type { ComposerMode } from '@/types/state/ui';

interface BlockModeToggleProps {
  mode: 'ask' | 'edit';
  onModeChange: (mode: 'ask' | 'edit') => void;
  disabled?: boolean;
}

/**
 * Segmented toggle for switching between Ask and Edit modes
 * Only shown when a block is selected (mode is not 'chat')
 */
export function BlockModeToggle({ mode, onModeChange, disabled = false }: BlockModeToggleProps) {
  return (
    <div className="inline-flex rounded border border-border bg-muted p-0.5">
      <button
        type="button"
        onClick={() => onModeChange('ask')}
        disabled={disabled}
        className={`px-2 py-0.5 text-xs font-medium rounded-sm transition-colors ${
          mode === 'ask'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-pressed={mode === 'ask'}
      >
        Ask
      </button>
      <button
        type="button"
        onClick={() => onModeChange('edit')}
        disabled={disabled}
        className={`px-2 py-0.5 text-xs font-medium rounded-sm transition-colors ${
          mode === 'edit'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-pressed={mode === 'edit'}
      >
        Edit
      </button>
    </div>
  );
}
