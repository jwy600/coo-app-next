/**
 * Main Zustand store with devtools
 * Combines all slices into a single store
 *
 * All app data (threads, blocks, cards, settings) is persisted to localStorage.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { threadSlice, ThreadSlice } from "./slices/threadSlice";
import { blockSlice, BlockSlice } from "./slices/blockSlice";
import { uiSlice, UISlice } from "./slices/uiSlice";
import { cardSlice, CardSlice } from "./slices/cardSlice";
import { streamingSlice, StreamingSlice } from "./slices/streamingSlice";
import { settingsSlice, SettingsSlice } from "./slices/settingsSlice";
import { AppState } from "@/types/state";
import { Card } from "@/types/card";
import { Block } from "@/types/block";
import { Thread } from "@/types/thread";
import { Message } from "@/types/message";
import { isTestMode } from "@/lib/utils/testMode";

export type StoreState = AppState &
  ThreadSlice &
  BlockSlice &
  UISlice &
  CardSlice &
  StreamingSlice &
  SettingsSlice;

const STORAGE_NAME = isTestMode() ? "coo-test-storage" : "coo-storage";

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...args) => ({
        ...threadSlice(...args),
        ...blockSlice(...args),
        ...uiSlice(...args),
        ...cardSlice(...args),
        ...streamingSlice(...args),
        ...settingsSlice(...args),
      }),
      {
        name: STORAGE_NAME,
        version: 2,
        partialize: (state) => ({
          threads: state.threads,
          blocks: state.blocks,
          cards: state.cards,
          activeThreadId: state.activeThreadId,
          settings: state.settings,
        }),
        migrate: (persisted: unknown, version: number) => {
          const state = (persisted ?? {}) as Record<string, unknown>;
          if (version < 2) {
            // v<2: obsidianVaultPath renamed to obsidianVaultName; apiKey added
            const settings = state.settings as Record<string, unknown> | undefined;
            if (settings) {
              if ("obsidianVaultPath" in settings) {
                delete settings.obsidianVaultPath;
                settings.obsidianVaultName = "";
              }
              if (!("apiKey" in settings)) {
                settings.apiKey = "";
              }
            }
          }
          return state as unknown as StoreState;
        },
      },
    ),
    {
      name: "coo-store",
      // Explicit opt-in. NODE_ENV alone is unsafe: any non-production build
      // (staging, preview) would otherwise expose the full store —
      // including settings.apiKey — to the Redux DevTools browser extension.
      enabled: process.env.NEXT_PUBLIC_DEVTOOLS_ENABLED === "true",
    },
  ),
);

// ============================================================================
// Selectors (Memoized)
// ============================================================================

export const selectActiveThread = (state: StoreState): Thread | undefined =>
  state.threads.find((t) => t.id === state.activeThreadId);

export const selectSelectedBlock = (state: StoreState): Block | null =>
  state.selectedBlockId
    ? state.blocks.find((b) => b.id === state.selectedBlockId) || null
    : null;

export const selectContentForTransform = (state: StoreState): Block[] => {
  const { selectedBlockId, blocks } = state;

  if (!selectedBlockId) return [];

  const block = blocks.find((b) => b.id === selectedBlockId);
  return block ? [block] : [];
};

export const selectCards = (state: StoreState): Card[] => {
  const activeThread = selectActiveThread(state);
  if (!activeThread) return [];

  const messageIds = new Set(activeThread.messages.map((m) => m.id));
  return state.cards.filter((c) => messageIds.has(c.messageId));
};

export const selectAllCardBlocks = (state: StoreState): Block[] => {
  const activeCards = selectCards(state);
  const allCardBlockIds = new Set(activeCards.flatMap((c) => c.blockIds));
  return state.blocks.filter((b) => allCardBlockIds.has(b.id));
};

export const selectMessagesByThread =
  (threadId: string) =>
  (state: StoreState): Message[] => {
    const thread = state.threads.find((t) => t.id === threadId);
    return thread?.messages || [];
  };

export const selectActiveThreadBlocks = (state: StoreState): Block[] => {
  const activeThread = selectActiveThread(state);
  if (!activeThread) return [];

  const messageIds = new Set(activeThread.messages.map((m) => m.id));
  return state.blocks.filter((b) => messageIds.has(b.messageId));
};

export const selectBlocksByThread =
  (threadId: string) =>
  (state: StoreState): Block[] => {
    const thread = state.threads.find((t) => t.id === threadId);
    if (!thread) return [];
    const messageIds = new Set(thread.messages.map((m) => m.id));
    return state.blocks.filter((b) => messageIds.has(b.messageId));
  };
