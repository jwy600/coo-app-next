/**
 * Mock helpers for the Zustand store.
 *
 * Strategy A: Use the real store with `useStore.setState()` — for simple cases.
 * Strategy B: Mock `useStore` entirely — for components with complex selectors.
 */

import { vi } from 'vitest';
import { Thread } from '@/types/thread';

interface MockStoreState {
  activeThreadId: string | null;
  threads: Thread[];
  mode: string;

  setMode: ReturnType<typeof vi.fn>;
  deleteThread: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
  resetStore: ReturnType<typeof vi.fn>;
  setActiveThread: ReturnType<typeof vi.fn>;

  settings: {
    apiKey: string;
    model: string;
    reasoningEffort: string;
    responseLanguage: string;
    translateLanguage: string;
    webSearchEnabled: boolean;
    exportDestination: string;
    obsidianVaultName: string;
  };
  updateApiKey: ReturnType<typeof vi.fn>;
  updateModel: ReturnType<typeof vi.fn>;
  updateReasoningEffort: ReturnType<typeof vi.fn>;
  updateResponseLanguage: ReturnType<typeof vi.fn>;
  updateTranslateLanguage: ReturnType<typeof vi.fn>;
  updateWebSearchEnabled: ReturnType<typeof vi.fn>;
  updateExportDestination: ReturnType<typeof vi.fn>;
  updateObsidianVaultName: ReturnType<typeof vi.fn>;
  resetSettings: ReturnType<typeof vi.fn>;
}

export function createMockStoreState(
  overrides: Partial<MockStoreState> = {},
): MockStoreState {
  return {
    activeThreadId: null,
    threads: [],
    mode: 'landing',
    setMode: vi.fn(),
    deleteThread: vi.fn(),
    reset: vi.fn(),
    resetStore: vi.fn(),
    setActiveThread: vi.fn(),
    settings: {
      apiKey: '',
      model: 'gpt-5.4-mini',
      reasoningEffort: 'medium',
      responseLanguage: 'en',
      translateLanguage: 'Chinese',
      webSearchEnabled: false,
      exportDestination: 'local',
      obsidianVaultName: '',
    },
    updateApiKey: vi.fn(),
    updateModel: vi.fn(),
    updateReasoningEffort: vi.fn(),
    updateResponseLanguage: vi.fn(),
    updateTranslateLanguage: vi.fn(),
    updateWebSearchEnabled: vi.fn(),
    updateExportDestination: vi.fn(),
    updateObsidianVaultName: vi.fn(),
    resetSettings: vi.fn(),
    ...overrides,
  };
}
