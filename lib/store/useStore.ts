/**
 * Main Zustand store with devtools and persistence.
 *
 * Threads, messages, settings persist to localStorage. The block/card
 * model has been removed; each message stores its body as a single
 * `text` string.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { threadSlice, ThreadSlice } from './slices/threadSlice';
import { messageSlice, MessageSlice } from './slices/messageSlice';
import { uiSlice, UISlice } from './slices/uiSlice';
import { streamingSlice, StreamingSlice } from './slices/streamingSlice';
import { settingsSlice, SettingsSlice } from './slices/settingsSlice';
import { migratePersistedState } from './migration';
import { AppState } from '@/types/state';
import { Thread } from '@/types/thread';
import { Message } from '@/types/message';
import { isTestMode } from '@/lib/utils/testMode';

export type StoreState = AppState &
  ThreadSlice &
  MessageSlice &
  UISlice &
  StreamingSlice &
  SettingsSlice;

const STORAGE_NAME = isTestMode() ? 'coo-test-storage' : 'coo-storage';

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...args) => ({
        ...threadSlice(...args),
        ...messageSlice(...args),
        ...uiSlice(...args),
        ...streamingSlice(...args),
        ...settingsSlice(...args),
      }),
      {
        name: STORAGE_NAME,
        version: 3,
        partialize: (state) => ({
          threads: state.threads,
          activeThreadId: state.activeThreadId,
          settings: state.settings,
        }),
        migrate: (persisted, version) =>
          migratePersistedState(persisted, version) as unknown as StoreState,
      },
    ),
    {
      name: 'coo-store',
      // Explicit opt-in. NODE_ENV alone is unsafe: any non-production build
      // (staging, preview) would otherwise expose the full store —
      // including settings.apiKey — to the Redux DevTools browser extension.
      enabled: process.env.NEXT_PUBLIC_DEVTOOLS_ENABLED === 'true',
    },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectActiveThread = (state: StoreState): Thread | undefined =>
  state.threads.find((t) => t.id === state.activeThreadId);

export const selectMessagesByThread =
  (threadId: string) =>
  (state: StoreState): Message[] => {
    const thread = state.threads.find((t) => t.id === threadId);
    return thread?.messages || [];
  };
