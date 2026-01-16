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
    return {
      ...block,
      prevText: block.text,
      text: rewriteSentence,
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
