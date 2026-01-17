'use client';

import { Block } from '@/types/block';

/**
 * Client Component - Display and manage text selection chips
 * Reference: legacy/app.js lines 442-491
 * Needs 'use client' for click handlers
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
    <div className="block-chips">
      {block.selections.map((text, index) => (
        <span key={index} className="chip" title={text}>
          <span className="chip-text">{text}</span>
          <button
            type="button"
            className="chip-remove"
            onClick={() => onRemoveSelection?.(index)}
            aria-label="Remove selection"
          >
            ×
          </button>
        </span>
      ))}

      <button
        type="button"
        className="chip-clear"
        onClick={onClearSelections}
      >
        Clear
      </button>

      {block.selections.length > 0 && (
        <button
          type="button"
          className="chip-rewrite"
          onClick={onRewrite}
          disabled={block.isRewritten && !canUndo}
          title={
            block.isRewritten && !canUndo
              ? 'Cannot undo: original text is unavailable.'
              : undefined
          }
        >
          {rewriteLabel}
        </button>
      )}
    </div>
  );
}
