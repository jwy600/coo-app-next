/**
 * Persisted state migrations.
 *
 * v3 (current): text-based messages. Each message has a single `text` field;
 *   `blocks` and `cards` are gone from persisted state.
 * v2: pre-text messages. Each message had `content: { blockId }[]`, and
 *   blocks lived in a top-level `blocks: Block[]` array.
 * v<2: legacy settings shape (obsidianVaultPath → obsidianVaultName, apiKey).
 */

interface LegacyBlock {
  id: string;
  messageId: string;
  text: string;
}

interface LegacyMessage {
  id: string;
  threadId?: string;
  role: 'user' | 'assistant';
  createdAt?: number;
  content?: { blockId: string }[];
  text?: string;
  meta?: Record<string, unknown>;
}

interface LegacyThread {
  id: string;
  title?: string;
  createdAt?: number;
  updatedAt?: number;
  messages?: LegacyMessage[];
}

export function migratePersistedState(
  persisted: unknown,
  version: number,
): Record<string, unknown> {
  const state = (persisted ?? {}) as Record<string, unknown>;

  if (version < 2) {
    migrateSettingsToV2(state);
  }

  if (version < 3) {
    migrateMessagesToV3(state);
  }

  return state;
}

function migrateSettingsToV2(state: Record<string, unknown>): void {
  const settings = state.settings as Record<string, unknown> | undefined;
  if (!settings) return;
  if ('obsidianVaultPath' in settings) {
    delete settings.obsidianVaultPath;
    settings.obsidianVaultName = '';
  }
  if (!('apiKey' in settings)) {
    settings.apiKey = '';
  }
}

function migrateMessagesToV3(state: Record<string, unknown>): void {
  const blocks = (state.blocks as LegacyBlock[] | undefined) ?? [];
  const blocksByMessage = new Map<string, string[]>();
  for (const block of blocks) {
    const list = blocksByMessage.get(block.messageId) ?? [];
    list.push(block.text ?? '');
    blocksByMessage.set(block.messageId, list);
  }

  const threads = state.threads as LegacyThread[] | undefined;
  if (Array.isArray(threads)) {
    for (const thread of threads) {
      if (!thread.messages) continue;
      thread.messages = thread.messages.map((message) => {
        if (typeof message.text === 'string') return message;
        const messageBlocks = blocksByMessage.get(message.id) ?? [];
        const text = messageBlocks.join('\n\n');
        const next: LegacyMessage = { ...message, text };
        delete next.content;
        return next;
      });
    }
  }

  delete state.blocks;
  delete state.cards;
  delete state.selectedBlockId;
}
