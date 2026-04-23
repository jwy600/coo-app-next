/**
 * Mock helpers for Zustand store
 *
 * Strategy A: Use real store with useStore.setState() — for simple cases
 * Strategy B: Mock useStore entirely — for components with complex selectors
 */

import { vi } from "vitest";
import { Block } from "@/types/block";
import { Card } from "@/types/card";
import { Thread } from "@/types/thread";
import { Message } from "@/types/message";

interface MockStoreState {
  // Core state
  activeThreadId: string | null;
  threads: Thread[];
  blocks: Block[];
  cards: Card[];

  // UI state
  mode: string;
  selectedBlockId: string | null;

  // Actions
  setMode: ReturnType<typeof vi.fn>;
  clearSelection: ReturnType<typeof vi.fn>;
  deleteThread: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
  resetStore: ReturnType<typeof vi.fn>;
  setActiveThread: ReturnType<typeof vi.fn>;
  addCard: ReturnType<typeof vi.fn>;
  removeCard: ReturnType<typeof vi.fn>;

  // Settings
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
    blocks: [],
    cards: [],
    mode: "landing",
    selectedBlockId: null,
    setMode: vi.fn(),
    clearSelection: vi.fn(),
    deleteThread: vi.fn(),
    reset: vi.fn(),
    resetStore: vi.fn(),
    setActiveThread: vi.fn(),
    addCard: vi.fn(),
    removeCard: vi.fn(),
    settings: {
      apiKey: "",
      model: "gpt-5.4-mini",
      reasoningEffort: "medium",
      responseLanguage: "en",
      translateLanguage: "Chinese",
      webSearchEnabled: false,
      exportDestination: "local",
      obsidianVaultName: "",
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
