/**
 * useBlockSelection Hook
 *
 * Manages block selection state with two modes:
 *
 * Block mode (no section active):
 * - Multi-select toggle behavior
 * - 1 block → composer enabled, 2+ → disabled
 *
 * Section mode (double-click heading):
 * - Section implicitly selected for export
 * - Inside selection is for editing only (doesn't affect export)
 * - Outside selection adds to export
 * - Composer: 1 inside + 0 outside → enabled, otherwise disabled
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useStore } from '@/lib/store/useStore';
import { getSectionBlockIds } from '@/lib/state';

export interface UseBlockSelectionReturn {
  selectedBlockIds: string[];
  selectedBlockCount: number;
  sectionHeadingId: string | null;
  isBlockSelected: (blockId: string) => boolean;
  toggleBlockSelection: (blockId: string) => void;
  enterSectionMode: (headingId: string) => void;
  clearSelection: () => void;
  /** Exactly one block selected (block mode) or one inside block (section mode) - enables composer */
  isSingleBlockMode: boolean;
  /** Two or more blocks selected - disables composer */
  isMultiSelectMode: boolean;
  /** Any blocks selected (1+) or in section mode */
  hasSelection: boolean;
  /** In section mode (heading gutter double-clicked) */
  isInSectionMode: boolean;
  /** In section mode with a block selected outside the current section */
  hasSelectionOutsideSection: boolean;
  /** Whether composer should be disabled based on selection state */
  isComposerDisabled: boolean;
}

export function useBlockSelection(): UseBlockSelectionReturn {
  // Store state
  const selectedBlockIds = useStore((state) => state.selectedBlockIds);
  const sectionHeadingId = useStore((state) => state.sectionHeadingId);
  const blocks = useStore((state) => state.blocks);
  const toggleBlockInSelection = useStore((state) => state.toggleBlockInSelection);
  const enterSectionModeAction = useStore((state) => state.enterSectionMode);
  const clearSelectedBlocks = useStore((state) => state.clearSelectedBlocks);

  // Derived: section block IDs (memoized for reuse)
  const sectionBlockIds = useMemo(() => {
    if (!sectionHeadingId) return [];
    return getSectionBlockIds(blocks, sectionHeadingId);
  }, [sectionHeadingId, blocks]);

  // Derived: whether any selected blocks are outside the current section
  const isSelectionOutsideSection = useMemo(() => {
    if (!sectionHeadingId || selectedBlockIds.length === 0) return false;
    return selectedBlockIds.some((id) => !sectionBlockIds.includes(id));
  }, [sectionHeadingId, selectedBlockIds, sectionBlockIds]);

  // Derived: count of selected blocks inside the section
  const insideSelectionCount = useMemo(() => {
    if (!sectionHeadingId) return 0;
    return selectedBlockIds.filter((id) => sectionBlockIds.includes(id)).length;
  }, [sectionHeadingId, selectedBlockIds, sectionBlockIds]);

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
  const isInSectionMode = sectionHeadingId !== null;
  const hasSelection = selectedBlockCount > 0 || isInSectionMode;

  // Single block mode: enables composer for editing
  // - Block mode: exactly 1 block selected
  // - Section mode: exactly 1 block inside section, 0 outside
  const isSingleBlockMode = isInSectionMode
    ? insideSelectionCount === 1 && !isSelectionOutsideSection
    : selectedBlockCount === 1;

  // Multi-select mode (for backward compatibility)
  const isMultiSelectMode = selectedBlockCount >= 2;

  // Composer disabled when:
  // - Block mode: 2+ blocks selected
  // - Section mode: 2+ inside OR any outside
  const isComposerDisabled = isInSectionMode
    ? insideSelectionCount >= 2 || isSelectionOutsideSection
    : selectedBlockCount >= 2;

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
    isComposerDisabled,
  };
}
