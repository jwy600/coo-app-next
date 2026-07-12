import { describe, it, expect } from 'vitest';
import { migratePersistedState } from '@/lib/store/migration';

describe('migratePersistedState', () => {
  it('joins blocks per message into message.text and drops blocks/cards (v2 → v3)', () => {
    const persisted = {
      threads: [
        {
          id: 't1',
          title: 'Thread 1',
          createdAt: 1,
          updatedAt: 2,
          messages: [
            {
              id: 'm1',
              threadId: 't1',
              role: 'user',
              createdAt: 1,
              content: [{ blockId: 'b1' }],
              meta: {},
            },
            {
              id: 'm2',
              threadId: 't1',
              role: 'assistant',
              createdAt: 2,
              content: [{ blockId: 'b2' }, { blockId: 'b3' }],
              meta: { openaiResponseId: 'resp-1' },
            },
          ],
        },
      ],
      blocks: [
        { id: 'b1', messageId: 'm1', text: 'hello', type: 'paragraph' },
        { id: 'b2', messageId: 'm2', text: '## Title', type: 'heading' },
        { id: 'b3', messageId: 'm2', text: 'Body paragraph.', type: 'paragraph' },
      ],
      cards: [{ id: 'c1', messageId: 'm2', anchorBlockId: 'b2', blockIds: ['b2'] }],
      selectedBlockId: 'b2',
      activeThreadId: 't1',
    };

    const migrated = migratePersistedState(persisted, 2) as {
      threads: { messages: { id: string; text?: string; content?: unknown }[] }[];
      blocks?: unknown;
      cards?: unknown;
      selectedBlockId?: unknown;
    };

    expect(migrated.blocks).toBeUndefined();
    expect(migrated.cards).toBeUndefined();
    expect(migrated.selectedBlockId).toBeUndefined();

    const messages = migrated.threads[0].messages;
    expect(messages[0].text).toBe('hello');
    expect(messages[1].text).toBe('## Title\n\nBody paragraph.');
    expect(messages[0].content).toBeUndefined();
    expect(messages[1].content).toBeUndefined();
  });

  it('runs the v<2 settings rename through to v3', () => {
    const persisted = {
      threads: [],
      blocks: [],
      cards: [],
      settings: { obsidianVaultPath: '/old/path' },
    };

    const migrated = migratePersistedState(persisted, 1) as {
      settings: Record<string, unknown>;
      blocks?: unknown;
    };

    expect(migrated.settings.obsidianVaultPath).toBeUndefined();
    expect(migrated.settings.obsidianVaultName).toBe('');
    expect(migrated.settings.apiKey).toBe('');
    expect(migrated.blocks).toBeUndefined();
  });

  it('is a no-op for already-migrated v3 state', () => {
    const persisted = {
      threads: [
        {
          id: 't1',
          title: 'T',
          createdAt: 1,
          updatedAt: 1,
          messages: [
            { id: 'm1', threadId: 't1', role: 'user', createdAt: 1, text: 'hi', meta: {} },
          ],
        },
      ],
      activeThreadId: 't1',
      settings: { apiKey: '', obsidianVaultName: '' },
    };

    const migrated = migratePersistedState(persisted, 3) as typeof persisted;
    expect(migrated.threads[0].messages[0].text).toBe('hi');
  });

  it('renames persisted model ids to gpt-5.6-* (v3 → v4)', () => {
    const persisted = {
      threads: [],
      activeThreadId: null,
      settings: { apiKey: 'sk-test', model: 'gpt-5.4-mini' },
    };

    const migrated = migratePersistedState(persisted, 3) as {
      settings: { model: string };
    };

    expect(migrated.settings.model).toBe('gpt-5.6-luna');
  });

  it('leaves already-renamed gpt-5.6-* model ids untouched', () => {
    const persisted = {
      threads: [],
      settings: { apiKey: '', model: 'gpt-5.6-sol' },
    };

    const migrated = migratePersistedState(persisted, 3) as {
      settings: { model: string };
    };

    expect(migrated.settings.model).toBe('gpt-5.6-sol');
  });

  it('handles a missing blocks array gracefully', () => {
    const persisted = {
      threads: [
        {
          id: 't1',
          title: 'T',
          createdAt: 1,
          updatedAt: 1,
          messages: [
            {
              id: 'm1',
              threadId: 't1',
              role: 'user',
              createdAt: 1,
              content: [{ blockId: 'gone' }],
              meta: {},
            },
          ],
        },
      ],
    };

    const migrated = migratePersistedState(persisted, 2) as {
      threads: { messages: { text?: string }[] }[];
    };
    expect(migrated.threads[0].messages[0].text).toBe('');
  });
});
