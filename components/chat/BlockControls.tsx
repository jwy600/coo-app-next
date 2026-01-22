'use client';

import { Badge } from '@/components/ui/badge';

/**
 * Client Component - Block transformation action badges
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
        <Badge
          key={action}
          onClick={() => !disabled && onAction?.(action)}
          className={
            disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer'
          }
        >
          {label}
        </Badge>
      ))}
    </div>
  );
}
