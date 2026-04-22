/**
 * Integration tests for Zustand store — full user flows end-to-end
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store/useStore';

describe('Store Integration Tests', () => {
  beforeEach(() => {
    useStore.setState({
      threads: [],
      blocks: [],
      activeThreadId: '',
      mode: 'landing',
      selectedBlockId: null,
      cards: [],
      isAwaitingResponse: false,
    });
  });

  describe('User Flow: Create thread and chat', () => {
    it('should handle complete chat conversation', () => {
      const store = useStore.getState();

      expect(store.mode).toBe('landing');
      expect(store.threads).toHaveLength(0);

      store.createThread('thread-1');
      expect(useStore.getState().threads).toHaveLength(1);
      expect(useStore.getState().activeThreadId).toBe('thread-1');

      store.setMode('thread');
      expect(useStore.getState().mode).toBe('thread');

      const userResult = store.addUserMessage('What is TypeScript?');
      expect(userResult.message.role).toBe('user');
      expect(userResult.blocks).toHaveLength(1);

      const assistantResult = store.addAssistantMessage([
        { text: 'TypeScript is a typed superset of JavaScript.', type: 'paragraph' },
        { text: 'It adds optional static typing to the language.', type: 'paragraph' },
        { text: 'const x: number = 5;', type: 'code' },
      ]);

      expect(assistantResult.message.role).toBe('assistant');
      expect(assistantResult.blocks).toHaveLength(3);

      const finalState = useStore.getState();
      expect(finalState.threads[0].messages).toHaveLength(2);
      expect(finalState.blocks).toHaveLength(4); // 1 user + 3 assistant
    });
  });

  describe('User Flow: Block selection and transformation', () => {
    it('should handle block selection and text selection', () => {
      const store = useStore.getState();

      store.createThread('thread-1');
      store.setMode('thread');
      store.addUserMessage('Hello');
      store.addAssistantMessage([
        { text: 'This is a paragraph with important text.', type: 'paragraph' },
      ]);

      const blockId = useStore.getState().blocks[1].id;

      store.selectBlock(blockId);
      expect(useStore.getState().selectedBlockId).toBe(blockId);

      store.addSelection(blockId, 'important text');
      const block = useStore.getState().blocks.find((b) => b.id === blockId);
      expect(block?.selections).toContain('important text');

      store.addSelection(blockId, 'paragraph');
      const blockWithTwoSelections = useStore.getState().blocks.find((b) => b.id === blockId);
      expect(blockWithTwoSelections?.selections).toHaveLength(2);

      store.removeSelection(blockId, 0);
      const blockAfterRemoval = useStore.getState().blocks.find((b) => b.id === blockId);
      expect(blockAfterRemoval?.selections).toHaveLength(1);

      store.selectBlock(blockId);
      expect(useStore.getState().selectedBlockId).toBeNull();
    });
  });

  describe('User Flow: Block rewrite with undo', () => {
    it('should handle rewrite and undo cycle', () => {
      const store = useStore.getState();

      store.createThread('thread-1');
      store.setMode('thread');
      store.addAssistantMessage([
        { text: 'Original text here.', type: 'paragraph' },
      ]);

      const blockId = useStore.getState().blocks[0].id;
      const originalText = 'Original text here.';

      store.toggleRewrite(blockId, 'Rewritten text here.');

      let block = useStore.getState().blocks.find((b) => b.id === blockId);
      expect(block?.text).toBe('Rewritten text here.');
      expect(block?.prevText).toBe(originalText);
      expect(block?.isRewritten).toBe(true);

      store.toggleRewrite(blockId, '');

      block = useStore.getState().blocks.find((b) => b.id === blockId);
      expect(block?.text).toBe(originalText);
      expect(block?.isRewritten).toBe(false);
    });
  });

  describe('User Flow: Multiple threads', () => {
    it('should handle switching between threads', () => {
      const store = useStore.getState();

      store.createThread('thread-1');
      store.addUserMessage('Question in thread 1');

      store.createThread('thread-2');
      store.addUserMessage('Question in thread 2');

      store.setActiveThread('thread-1');
      expect(useStore.getState().activeThreadId).toBe('thread-1');

      const state = useStore.getState();
      expect(state.threads).toHaveLength(2);
      expect(state.blocks).toHaveLength(2);

      const thread1 = state.threads.find((t) => t.id === 'thread-1');
      expect(thread1?.messages).toHaveLength(1);
    });
  });

  describe('Composer Mode Handling', () => {
    it('should track block mode correctly', () => {
      const store = useStore.getState();

      store.createThread('thread-1');
      store.setMode('thread');
      store.addAssistantMessage([
        { text: 'Test paragraph.', type: 'paragraph' },
      ]);

      const blockId = useStore.getState().blocks[0].id;

      expect(useStore.getState().selectedBlockId).toBeNull();

      store.selectBlock(blockId);
      expect(useStore.getState().selectedBlockId).toBe(blockId);

      store.clearSelection();
      expect(useStore.getState().selectedBlockId).toBeNull();
    });

    it('should clear selection when switching to landing mode', () => {
      const store = useStore.getState();

      store.createThread('thread-1');
      store.setMode('thread');
      store.addAssistantMessage([
        { text: 'Test paragraph.', type: 'paragraph' },
      ]);

      const blockId = useStore.getState().blocks[0].id;
      store.selectBlock(blockId);

      store.setMode('landing');
      expect(useStore.getState().selectedBlockId).toBeNull();
    });
  });
});
