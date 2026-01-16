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
    <div className="mt-2 flex flex-wrap gap-2 items-center">
      {block.selections.map((text, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 rounded text-sm"
          title={text}
        >
          <span className="max-w-[200px] truncate">{text}</span>
          <button
            type="button"
            className="text-blue-700 hover:text-blue-900 font-bold"
            onClick={() => onRemoveSelection?.(index)}
            aria-label="Remove selection"
          >
            ×
          </button>
        </span>
      ))}

      <button
        type="button"
        className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900"
        onClick={onClearSelections}
      >
        Clear
      </button>

      {block.selections.length > 0 && (
        <button
          type="button"
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
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
