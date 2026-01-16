/**
 * useTextSelection Hook
 *
 * Captures text selections from prompt input and manages selection chips.
 *
 * Reference: legacy/app.js lines 858-897 (captureSelection)
 *
 * IMPORTANT: Must work with contenteditable element
 */

'use client';

import { useCallback } from 'react';
import { useStore } from '@/lib/store/useStore';

export interface UseTextSelectionReturn {
  captureSelection: (inputElement: HTMLElement | null) => void;
  addSelectionText: (text: string) => void;
  removeSelection: (index: number) => void;
  clearSelections: () => void;
  selections: string[];
}

export function useTextSelection(blockId: string | null): UseTextSelectionReturn {
  // Store actions
  const addSelection = useStore((state) => state.addSelection);
  const removeSelectionFromBlock = useStore((state) => state.removeSelection);
  const clearSelectionsFromBlock = useStore((state) => state.clearSelections);
  const blocks = useStore((state) => state.blocks);

  // Get selections for the current block
  const block = blockId ? blocks.find((b) => b.id === blockId) : null;
  const selections = block?.selections || [];

  /**
   * Capture text selection from input element
   *
   * Reference: legacy/app.js lines 858-897
   */
  const captureSelection = useCallback(
    (inputElement: HTMLElement | null) => {
      // Only active when block is selected
      if (!blockId || !inputElement) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const anchorNode = selection.anchorNode;
      const focusNode = selection.focusNode;

      // Check if selection is within the input element
      if (
        !anchorNode ||
        !focusNode ||
        !inputElement.contains(anchorNode) ||
        !inputElement.contains(focusNode)
      ) {
        return;
      }

      // Check if selection is collapsed or not in input
      if (range.collapsed || !inputElement.contains(range.commonAncestorContainer)) {
        return;
      }

      // Check if already inside a mark element
      if (range.commonAncestorContainer.parentElement) {
        const markParent = range.commonAncestorContainer.parentElement.closest('mark.anno');
        if (markParent) return;
      }

      const selectedText = selection.toString().trim();

      // Validate selection
      if (!selectedText || selectedText.length < 2) return;

      // Create mark element
      const mark = document.createElement('mark');
      mark.className = 'anno';
      const fragment = range.extractContents();
      mark.appendChild(fragment);
      range.insertNode(mark);

      // Clear selection
      selection.removeAllRanges();

      // Add to store
      addSelection(blockId, selectedText);
    },
    [blockId, addSelection]
  );

  /**
   * Manually add selection text (without DOM manipulation)
   */
  const addSelectionText = useCallback(
    (text: string) => {
      if (!blockId || !text.trim()) return;
      addSelection(blockId, text.trim());
    },
    [blockId, addSelection]
  );

  /**
   * Remove selection at index
   */
  const removeSelection = useCallback(
    (index: number) => {
      if (!blockId) return;
      removeSelectionFromBlock(blockId, index);
    },
    [blockId, removeSelectionFromBlock]
  );

  /**
   * Clear all selections
   */
  const clearSelections = useCallback(() => {
    if (!blockId) return;
    clearSelectionsFromBlock(blockId);
  }, [blockId, clearSelectionsFromBlock]);

  return {
    captureSelection,
    addSelectionText,
    removeSelection,
    clearSelections,
    selections,
  };
}
