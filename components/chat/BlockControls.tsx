'use client';

import { Button } from '@/components/ui/button';

/**
 * Client Component - Block transformation action buttons
 * Uses shadcn Button with outline variant for secondary actions
 *
 * Spacing rationale:
 * - gap-2 (8px): Standard inline element spacing
 * - size="sm": Compact buttons for toolbar density
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
    <div className="flex gap-1.5 flex-wrap">
      {actions.map(({ action, label }) => (
        <Button
          key={action}
          variant="outline"
          size="xs"
          className="rounded-full"
          onClick={() => onAction?.(action)}
          disabled={disabled}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
