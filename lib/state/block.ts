import { AppState } from '@/types/state';
import { Block } from '@/types/block';
import { getHeadingPrefix, hasHeading } from './heading';

/**
 * Block-related state transformations
 */

interface UpdateBlockResult {
  state: AppState;
  block: Block | null;
}

const updateBlock = (
  state: AppState,
  blockId: string,
  updater: (block: Block) => Block
): UpdateBlockResult => {
  let updatedBlock: Block | null = null;
  const blocks = state.blocks.map((block) => {
    if (block.id !== blockId) return block;
    updatedBlock = updater(block);
    return updatedBlock;
  });
  return {
    state: { ...state, blocks },
    block: updatedBlock,
  };
};

export const getBlockById = (state: AppState, blockId: string): Block | undefined =>
  state.blocks.find((block) => block.id === blockId);

/**
 * Add a text selection from a transformation result to a block.
 *
 * When a user selects a block and requests a transformation (e.g., "expand",
 * "translate"), the AI result appears in the composer. The user can then
 * highlight portions of that result to store as "selections" on the block.
 *
 * These selections are associated with the block for later use (e.g., applying
 * as a rewrite or referencing in follow-up prompts).
 *
 * @param state - Current app state
 * @param blockId - ID of the block to add selection to
 * @param text - Text snippet from transformation result
 */
export const addSelection = (
  state: AppState,
  blockId: string,
  text: string
): UpdateBlockResult =>
  updateBlock(state, blockId, (block) => ({
    ...block,
    selections: [...block.selections, text],
  }));

/**
 * Remove a selection from a block by index.
 */
export const removeSelection = (
  state: AppState,
  blockId: string,
  index: number
): UpdateBlockResult =>
  updateBlock(state, blockId, (block) => ({
    ...block,
    selections: block.selections.filter((_, idx) => idx !== index),
  }));

/**
 * Clear all selections from a block.
 */
export const clearSelections = (
  state: AppState,
  blockId: string
): UpdateBlockResult =>
  updateBlock(state, blockId, (block) => ({
    ...block,
    selections: [],
  }));

/**
 * Toggle a rewrite on a block with undo capability.
 *
 * First call: Stores original text in `prevText`, applies rewrite, sets `isRewritten: true`
 * Second call: Restores `prevText`, clears rewrite state (undo)
 *
 * Preserves heading/list prefixes if the rewrite lacks them.
 */
export const toggleRewrite = (
  state: AppState,
  blockId: string,
  rewriteSentence: string
): UpdateBlockResult =>
  updateBlock(state, blockId, (block) => {
    if (block.isRewritten && block.prevText != null) {
      return {
        ...block,
        text: block.prevText,
        prevText: null,
        isRewritten: false,
        edited: true,
      };
    }

    let newText = rewriteSentence;

    // Preserve heading prefix if original was a heading but rewrite lacks one
    if (block.type === 'heading') {
      const originalPrefix = getHeadingPrefix(block.text);
      if (originalPrefix && !hasHeading(newText)) {
        newText = originalPrefix + newText;
      }
    }

    // Preserve list prefix if original was a list item but rewrite lacks one
    if (block.type === 'list') {
      const originalPrefix = block.text.match(/^(\s*)([-*+]|\d+\.)\s+/)?.[0] ?? '';
      const hasListPrefix = /^(\s*)([-*+]|\d+\.)\s+/.test(newText);
      if (originalPrefix && !hasListPrefix) {
        newText = originalPrefix + newText;
      }
    }

    return {
      ...block,
      prevText: block.text,
      text: newText,
      isRewritten: true,
      edited: true,
    };
  });

