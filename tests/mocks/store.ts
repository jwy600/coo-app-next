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

export interface MockStoreState {
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
    model: string;
    reasoningEffort: string;
    responseLanguage: string;
    translateLanguage: string;
    webSearchEnabled: boolean;
  };
  updateModel: ReturnType<typeof vi.fn>;
  updateReasoningEffort: ReturnType<typeof vi.fn>;
  updateResponseLanguage: ReturnType<typeof vi.fn>;
  updateTranslateLanguage: ReturnType<typeof vi.fn>;
  updateWebSearchEnabled: ReturnType<typeof vi.fn>;
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
      model: "gpt-4.1",
      reasoningEffort: "medium",
      responseLanguage: "en",
      translateLanguage: "zh-TW",
      webSearchEnabled: false,
    },
    updateModel: vi.fn(),
    updateReasoningEffort: vi.fn(),
    updateResponseLanguage: vi.fn(),
    updateTranslateLanguage: vi.fn(),
    updateWebSearchEnabled: vi.fn(),
    resetSettings: vi.fn(),
    ...overrides,
  };
}

/**
 * Create a vi.mock factory for useStore (Strategy B)
 * The mock function acts as a selector: useStore(selector) => selector(state)
 */
export function createStoreMock(state: Partial<MockStoreState> = {}) {
  const mockState = createMockStoreState(state);

  const useStoreFn = vi.fn((selector?: (s: MockStoreState) => unknown) => {
    if (selector) return selector(mockState);
    return mockState;
  });

  // Attach setState for direct manipulation
  (useStoreFn as Record<string, unknown>).setState = vi.fn();
  (useStoreFn as Record<string, unknown>).getState = vi.fn(() => mockState);

  return {
    useStore: useStoreFn,
    __mockState: mockState,
  };
}
