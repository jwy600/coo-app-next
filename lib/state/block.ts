import { AppState } from '@/types/state';
import { Block } from '@/types/block';

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

export const addSelection = (
  state: AppState,
  blockId: string,
  text: string
): UpdateBlockResult =>
  updateBlock(state, blockId, (block) => ({
    ...block,
    selections: [...block.selections, text],
  }));

export const removeSelection = (
  state: AppState,
  blockId: string,
  index: number
): UpdateBlockResult =>
  updateBlock(state, blockId, (block) => ({
    ...block,
    selections: block.selections.filter((_, idx) => idx !== index),
  }));

export const clearSelections = (
  state: AppState,
  blockId: string
): UpdateBlockResult =>
  updateBlock(state, blockId, (block) => ({
    ...block,
    selections: [],
  }));

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
      const originalPrefix = block.text.match(/^#{1,6}\s+/)?.[0] ?? '';
      const hasHeadingPrefix = /^#{1,6}\s+/.test(newText);
      if (originalPrefix && !hasHeadingPrefix) {
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

export const updateBlockText = (
  state: AppState,
  blockId: string,
  text: string,
  edited: boolean = false
): UpdateBlockResult =>
  updateBlock(state, blockId, (block) => ({
    ...block,
    text,
    edited: edited ? true : block.edited,
  }));
