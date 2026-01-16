'use client';

import { Button } from '@/components/ui/Button';

/**
 * Client Component - Block transformation action buttons
 * Reference: legacy/index.html lines 63-68
 * Needs 'use client' for click handlers
 */
export type BlockAction = 'translate' | 'example' | 'eli5' | 'expand';

interface BlockControlsProps {
  onAction?: (action: BlockAction) => void;
  disabled?: boolean;
}

export function BlockControls({ onAction, disabled = false }: BlockControlsProps) {
  const actions: { action: BlockAction; label: string }[] = [
    { action: 'translate', label: 'Translate' },
    { action: 'example', label: 'Example' },
    { action: 'eli5', label: 'ELI5' },
    { action: 'expand', label: 'Expand' },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {actions.map(({ action, label }) => (
        <Button
          key={action}
          variant="secondary"
          onClick={() => onAction?.(action)}
          disabled={disabled}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
