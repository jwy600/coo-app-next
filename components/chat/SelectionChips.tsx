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
  onUndo?: () => void;
}

export function SelectionChips({
  block,
  onRemoveSelection,
  onClearSelections,
  onRewrite,
  onUndo,
}: SelectionChipsProps) {
  if (!block.selections || block.selections.length === 0) {
    return null;
  }

  const canUndo = block.isRewritten && block.prevText != null;

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

      {/* Always show Rewrite when there are selections */}
      <button
        type="button"
        className="chip-rewrite"
        onClick={onRewrite}
      >
        Rewrite
      </button>

      {/* Show Undo separately when available */}
      {canUndo && (
        <button
          type="button"
          className="chip-undo"
          onClick={onUndo}
        >
          Undo
        </button>
      )}
    </div>
  );
}
