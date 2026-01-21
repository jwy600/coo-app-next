'use client';

import { Block } from '@/types/block';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { XIcon } from 'lucide-react';

/**
 * Client Component - Display and manage text selection chips
 * Uses shadcn Badge for selection chips and Button for actions
 */
interface SelectionChipsProps {
  block: Block;
  onRemoveSelection?: (index: number) => void;
  onClearSelections?: () => void;
  onRewrite?: () => void;
}

export function SelectionChips({
  block,
  onRemoveSelection,
  onClearSelections,
  onRewrite,
}: SelectionChipsProps) {
  if (!block.selections || block.selections.length === 0) {
    return null;
  }

  const canUndo = block.isRewritten && block.prevText != null;
  const rewriteLabel = block.isRewritten ? 'Undo' : 'Rewrite';

  return (
    <div className="flex gap-1.5 flex-wrap mt-2">
      {block.selections.map((text, index) => (
        <Badge
          key={index}
          variant="secondary"
          className="max-w-[220px] gap-1 pr-1"
          title={text}
        >
          <span className="truncate">{text}</span>
          <button
            type="button"
            className="hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
            onClick={() => onRemoveSelection?.(index)}
            aria-label="Remove selection"
          >
            <XIcon className="size-3" />
          </button>
        </Badge>
      ))}

      <Button
        type="button"
        variant="outline"
        size="xs"
        className="rounded-full"
        onClick={onClearSelections}
      >
        Clear
      </Button>

      {block.selections.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="rounded-full"
          onClick={onRewrite}
          disabled={block.isRewritten && !canUndo}
          title={
            block.isRewritten && !canUndo
              ? 'Cannot undo: original text is unavailable.'
              : undefined
          }
        >
          {rewriteLabel}
        </Button>
      )}
    </div>
  );
}
