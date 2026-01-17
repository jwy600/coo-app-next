/**
 * Block slice - Wraps pure block state functions
 */

import { StateCreator } from 'zustand';
import * as stateFns from '@/lib/state';
import { isTestMode } from '@/lib/utils/testMode';
import { persistBlockUpdate } from '@/lib/supabase/blocks';
import { Block } from '@/types/block';
import { AppState } from '@/types/state';

export interface BlockSlice {
  blocks: Block[];

  // Actions
  addSelection: (blockId: string, text: string) => void;
  removeSelection: (blockId: string, index: number) => void;
  clearSelections: (blockId: string) => void;
  toggleRewrite: (blockId: string, rewriteText: string) => void;
  updateBlockText: (blockId: string, text: string, edited?: boolean) => void;
}

export const blockSlice: StateCreator<
  AppState & BlockSlice,
  [],
  [],
  BlockSlice
> = (set, get) => {
  return {
    blocks: [],

    addSelection: (blockId, text) => {
      const result = stateFns.addSelection(get(), blockId, text);
      set({ blocks: result.state.blocks });

      if (result.block && !isTestMode()) {
        persistBlockUpdate(result.block).catch((error) =>
          console.error('Failed to persist selection:', error)
        );
      }
    },

    removeSelection: (blockId, index) => {
      const result = stateFns.removeSelection(get(), blockId, index);
      set({ blocks: result.state.blocks });

      if (result.block && !isTestMode()) {
        persistBlockUpdate(result.block).catch((error) =>
          console.error('Failed to persist selection removal:', error)
        );
      }
    },

    clearSelections: (blockId) => {
      const result = stateFns.clearSelections(get(), blockId);
      set({ blocks: result.state.blocks });

      if (result.block && !isTestMode()) {
        persistBlockUpdate(result.block).catch((error) =>
          console.error('Failed to clear selections:', error)
        );
      }
    },

    toggleRewrite: (blockId, rewriteText) => {
      const result = stateFns.toggleRewrite(get(), blockId, rewriteText);
      set({ blocks: result.state.blocks });

      if (result.block && !isTestMode()) {
        persistBlockUpdate(result.block).catch((error) =>
          console.error('Failed to persist rewrite toggle:', error)
        );
      }
    },

    updateBlockText: (blockId, text, edited = false) => {
      const result = stateFns.updateBlockText(get(), blockId, text, edited);
      set({ blocks: result.state.blocks });

      if (result.block && !isTestMode()) {
        persistBlockUpdate(result.block).catch((error) =>
          console.error('Failed to update block text:', error)
        );
      }
    },
  };
};
