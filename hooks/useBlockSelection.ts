/**
 * useBlockSelection Hook
 *
 * Manages block selection state and interactions.
 *
 * Reference: legacy/app.js lines 1147-1158 (Escape key handler)
 */

'use client';

import { useCallback } from 'react';
import { useStore } from '@/lib/store/useStore';

export interface UseBlockSelectionReturn {
  selectedBlockId: string | null;
  selectBlock: (blockId: string) => void;
  clearSelection: () => void;
  isBlockMode: boolean;
}

export function useBlockSelection(): UseBlockSelectionReturn {
  // Store state
  const selectedBlockId = useStore((state) => state.selectedBlockId);
  const toggleSelectedBlock = useStore((state) => state.toggleSelectedBlock);
  const clearSelectedBlock = useStore((state) => state.clearSelectedBlock);

  /**
   * Select or toggle a block
   */
  const selectBlock = useCallback(
    (blockId: string) => {
      toggleSelectedBlock(blockId);
    },
    [toggleSelectedBlock]
  );

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    clearSelectedBlock();
  }, [clearSelectedBlock]);

  /**
   * Computed: Is composer in block mode?
   */
  const isBlockMode = selectedBlockId !== null;

  return {
    selectedBlockId,
    selectBlock,
    clearSelection,
    isBlockMode,
  };
}
