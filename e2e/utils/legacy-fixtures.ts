/**
 * Legacy state payloads for migration testing (Phase 7).
 *
 * Exports v1 and v2 payload builders so we can test that old persisted
 * localStorage states migrate correctly to v3.
 */

import type { Message } from '@/types/message';
import type { Thread } from '@/types/thread';

/**
 * Build a v2 payload (block/card model).
 * Used to test v2 → v3 migration.
 */
export function v2Payload(overrides?: {
  threads?: Thread[];
  activeThreadId?: string | null;
}): {
  state: any;
  version: number;
} {
  return {
    state: {
      threads: overrides?.threads || [],
      blocks: [], // v2 had top-level blocks array (removed in v3)
      cards: [], // v2 had top-level cards array (removed in v3)
      activeThreadId: overrides?.activeThreadId ?? null,
      settings: {
        apiKey: 'sk-test',
        model: 'gpt-5.4-mini',
        reasoningEffort: 'none',
        webSearchEnabled: false,
        responseLanguage: 'en',
        translateLanguage: 'Chinese',
        exportDestination: 'local',
        obsidianVaultName: '',
      },
    },
    version: 2,
  };
}

/**
 * Build a v1 payload (pre-restructuring).
 * Used to test v1 → v2 → v3 migration.
 */
export function v1Payload(overrides?: {
  threads?: Thread[];
  activeThreadId?: string | null;
}): {
  state: any;
  version: number;
} {
  return {
    state: {
      threads: overrides?.threads || [],
      blocks: [],
      cards: [],
      activeThreadId: overrides?.activeThreadId ?? null,
      settings: {
        apiKey: 'sk-test',
        model: 'gpt-5.4-mini',
        reasoningEffort: 'none',
        webSearchEnabled: false,
        responseLanguage: 'en',
        // v1 had this naming
        obsidianVaultPath: '',
        exportDestination: 'local',
      },
    },
    version: 1,
  };
}

/**
 * Build a v3 payload (current schema).
 * Useful for testing idempotent migration.
 */
export function v3Payload(overrides?: {
  threads?: Thread[];
  activeThreadId?: string | null;
}): {
  state: any;
  version: number;
} {
  return {
    state: {
      threads: overrides?.threads || [],
      activeThreadId: overrides?.activeThreadId ?? null,
      settings: {
        apiKey: 'sk-test',
        model: 'gpt-5.4-mini',
        reasoningEffort: 'none',
        webSearchEnabled: false,
        responseLanguage: 'en',
        translateLanguage: 'Chinese',
        exportDestination: 'local',
        obsidianVaultName: '',
      },
      mode: 'landing',
      isAwaitingResponse: false,
      error: null,
      focus: null,
      composerPrompt: '',
    },
    version: 3,
  };
}

/**
 * Create a sample thread with a user and assistant message.
 */
export function sampleThread(): Thread {
  const now = Date.now();
  return {
    id: 'thread-test-1',
    title: 'Test Thread',
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: 'msg-1',
        threadId: 'thread-test-1',
        role: 'user',
        text: 'What is React?',
        createdAt: now,
        meta: {},
      } as Message,
      {
        id: 'msg-2',
        threadId: 'thread-test-1',
        role: 'assistant',
        text: 'React is a JavaScript library for building user interfaces.',
        createdAt: now + 1000,
        meta: { openaiResponseId: 'resp-123' },
      } as Message,
    ],
  };
}
