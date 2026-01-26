/**
 * useBlockSelection Hook
 *
 * Manages multi-block selection state and interactions.
 * Supports selecting multiple blocks for card export.
 *
 * Reference: legacy/app.js lines 1147-1158 (Escape key handler)
 */

'use client';

import { useCallback } from 'react';
import { useStore } from '@/lib/store/useStore';

export interface UseBlockSelectionReturn {
  selectedBlockIds: string[];
  selectedBlockCount: number;
  sectionHeadingId: string | null;
  isBlockSelected: (blockId: string) => boolean;
  toggleBlockSelection: (blockId: string) => void;
  enterSectionMode: (headingId: string) => void;
  clearSelection: () => void;
  /** Exactly one block selected - enables block mode features (rewrite, expand, etc.) */
  isSingleBlockMode: boolean;
  /** Two or more blocks selected - disables composer */
  isMultiSelectMode: boolean;
  /** Any blocks selected (1+) or in section mode */
  hasSelection: boolean;
  /** In section mode (heading gutter double-clicked) */
  isInSectionMode: boolean;
  /** In section mode with a block selected outside the current section */
  hasSelectionOutsideSection: boolean;
}

export function useBlockSelection(): UseBlockSelectionReturn {
  // Store state
  const selectedBlockIds = useStore((state) => state.selectedBlockIds);
  const sectionHeadingId = useStore((state) => state.sectionHeadingId);
  const isSelectionOutsideSection = useStore((state) => state.isSelectionOutsideSection);
  const toggleBlockInSelection = useStore((state) => state.toggleBlockInSelection);
  const enterSectionModeAction = useStore((state) => state.enterSectionMode);
  const clearSelectedBlocks = useStore((state) => state.clearSelectedBlocks);

  /**
   * Check if a block is selected
   */
  const isBlockSelected = useCallback(
    (blockId: string) => selectedBlockIds.includes(blockId),
    [selectedBlockIds]
  );

  /**
   * Toggle a block in the selection set
   */
  const toggleBlockSelection = useCallback(
    (blockId: string) => {
      toggleBlockInSelection(blockId);
    },
    [toggleBlockInSelection]
  );

  /**
   * Enter section mode (double-click heading gutter)
   */
  const enterSectionMode = useCallback(
    (headingId: string) => {
      enterSectionModeAction(headingId);
    },
    [enterSectionModeAction]
  );

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    clearSelectedBlocks();
  }, [clearSelectedBlocks]);

  // Computed values
  const selectedBlockCount = selectedBlockIds.length;
  const isSingleBlockMode = selectedBlockCount === 1;
  const isMultiSelectMode = selectedBlockCount >= 2;
  const isInSectionMode = sectionHeadingId !== null;
  const hasSelection = selectedBlockCount > 0 || isInSectionMode;

  return {
    selectedBlockIds,
    selectedBlockCount,
    sectionHeadingId,
    isBlockSelected,
    toggleBlockSelection,
    enterSectionMode,
    clearSelection,
    isSingleBlockMode,
    isMultiSelectMode,
    hasSelection,
    isInSectionMode,
    hasSelectionOutsideSection: isSelectionOutsideSection,
  };
}
