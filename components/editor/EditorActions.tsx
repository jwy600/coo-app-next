'use client';

import { Badge } from '@/components/ui/badge';
import type { BlockAction } from '@/types/api';

/** Subset of BlockAction surfaced as one-shot shortcuts in the focus editor. */
export type EditorActionId = Extract<
  BlockAction,
  'translate' | 'eli5' | 'summarize'
>;

interface EditorActionsProps {
  onAction: (action: EditorActionId) => void;
  busy?: EditorActionId | null;
  disabled?: boolean;
}

const ACTIONS: { id: EditorActionId; label: string; busyLabel: string }[] = [
  { id: 'translate', label: 'Translate', busyLabel: 'Translating…' },
  { id: 'eli5', label: 'ELI5', busyLabel: 'Simplifying…' },
  { id: 'summarize', label: 'Summarize', busyLabel: 'Summarizing…' },
];

export function EditorActions({
  onAction,
  busy = null,
  disabled = false,
}: EditorActionsProps) {
  const handleClick = (e: React.MouseEvent, action: EditorActionId) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || busy) return;
    onAction(action);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {ACTIONS.map(({ id, label, busyLabel }) => {
        const isBusy = busy === id;
        const isInactive = disabled || (busy !== null && busy !== id);
        return (
          <Badge
            key={id}
            role="button"
            data-testid={`focus-action-${id}`}
            aria-disabled={isInactive || isBusy}
            onClick={(e) => handleClick(e, id)}
            className={
              isInactive || isBusy
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
            }
          >
            {isBusy ? busyLabel : label}
          </Badge>
        );
      })}
    </div>
  );
}
