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
    <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
      <button
        type="button"
        onClick={() => onModeChange('ask')}
        disabled={disabled}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
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
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
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
