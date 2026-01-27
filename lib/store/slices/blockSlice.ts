/**
 * Block slice - Wraps pure block state functions
 */

import { StateCreator } from 'zustand';
import * as stateFns from '@/lib/state';
import { persistAsync } from '@/lib/utils/persistence';
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

      if (result.block) {
        persistAsync(() => persistBlockUpdate(result.block!), 'persist selection');
      }
    },

    removeSelection: (blockId, index) => {
      const result = stateFns.removeSelection(get(), blockId, index);
      set({ blocks: result.state.blocks });

      if (result.block) {
        persistAsync(() => persistBlockUpdate(result.block!), 'persist selection removal');
      }
    },

    clearSelections: (blockId) => {
      const result = stateFns.clearSelections(get(), blockId);
      set({ blocks: result.state.blocks });

      if (result.block) {
        persistAsync(() => persistBlockUpdate(result.block!), 'clear selections');
      }
    },

    toggleRewrite: (blockId, rewriteText) => {
      const result = stateFns.toggleRewrite(get(), blockId, rewriteText);
      set({ blocks: result.state.blocks });

      if (result.block) {
        persistAsync(() => persistBlockUpdate(result.block!), 'persist rewrite toggle');
      }
    },
  };
};
