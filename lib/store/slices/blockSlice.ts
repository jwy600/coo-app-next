/**
 * Block slice - Wraps pure block state functions.
 * Persistence is handled centrally by Zustand's persist middleware in useStore.ts.
 */

import { StateCreator } from "zustand";
import * as stateFns from "@/lib/state";
import { Block } from "@/types/block";
import { AppState } from "@/types/state";

export interface BlockSlice {
  blocks: Block[];

  addSelection: (blockId: string, text: string) => void;
  removeSelection: (blockId: string, index: number) => void;
  clearSelections: (blockId: string) => void;
  /** @deprecated Use rewriteBlock and undoRewrite separately */
  toggleRewrite: (blockId: string, rewriteText: string) => void;
  rewriteBlock: (blockId: string, rewriteText: string) => void;
  undoRewrite: (blockId: string) => void;
}

export const blockSlice: StateCreator<
  AppState & BlockSlice,
  [],
  [],
  BlockSlice
> = (set, get) => ({
  blocks: [],

  addSelection: (blockId, text) => {
    const result = stateFns.addSelection(get(), blockId, text);
    set({ blocks: result.state.blocks });
  },

  removeSelection: (blockId, index) => {
    const result = stateFns.removeSelection(get(), blockId, index);
    set({ blocks: result.state.blocks });
  },

  clearSelections: (blockId) => {
    const result = stateFns.clearSelections(get(), blockId);
    set({ blocks: result.state.blocks });
  },

  toggleRewrite: (blockId, rewriteText) => {
    const result = stateFns.toggleRewrite(get(), blockId, rewriteText);
    set({ blocks: result.state.blocks });
  },

  rewriteBlock: (blockId, rewriteText) => {
    const result = stateFns.rewriteBlock(get(), blockId, rewriteText);
    set({ blocks: result.state.blocks });
  },

  undoRewrite: (blockId) => {
    const result = stateFns.undoRewrite(get(), blockId);
    set({ blocks: result.state.blocks });
  },
});
