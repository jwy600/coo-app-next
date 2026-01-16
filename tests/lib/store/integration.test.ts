/**
 * Integration tests for Zustand store with Supabase
 * Tests full user flows end-to-end
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '@/lib/store/useStore';
import * as supabaseThreads from '@/lib/supabase/threads';
import * as supabaseBlocks from '@/lib/supabase/blocks';

// Mock Supabase modules
vi.mock('@/lib/supabase/threads', () => ({
  persistThreadSnapshot: vi.fn().mockResolvedValue(undefined),
  updateThreadMetadata: vi.fn().mockResolvedValue(undefined),
  loadThreadFromSupabase: vi.fn(),
}));

vi.mock('@/lib/supabase/blocks', () => ({
  persistBlockUpdate: vi.fn().mockResolvedValue(undefined),
}));

describe('Store Integration Tests', () => {
  beforeEach(() => {
    // Reset store
    useStore.setState({
      threads: [],
      blocks: [],
      activeThreadId: '',
      mode: 'landing',
      selectedBlockId: null,
      hasInitialResponse: false,
      isAwaitingResponse: false,
    });

    vi.clearAllMocks();
  });

  describe('User Flow: Create thread and chat', () => {
    it('should handle complete chat conversation', async () => {
      const store = useStore.getState();

      // 1. User lands on app (landing mode)
      expect(store.mode).toBe('landing');
      expect(store.threads).toHaveLength(0);

      // 2. User creates a new thread
      store.createThread('thread-1');
      expect(useStore.getState().threads).toHaveLength(1);
      expect(useStore.getState().activeThreadId).toBe('thread-1');

      // 3. User switches to chat mode
      store.setMode('chat');
      expect(useStore.getState().mode).toBe('chat');

      // 4. User types and sends a message
      const userResult = store.addUserMessage('What is TypeScript?');
      expect(userResult.message.role).toBe('user');
      expect(userResult.blocks).toHaveLength(1);

      // Wait for Supabase persistence
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(supabaseThreads.persistThreadSnapshot).toHaveBeenCalledTimes(1);

      // 5. Assistant responds with multiple blocks
      const assistantResult = store.addAssistantMessage([
        { text: 'TypeScript is a typed superset of JavaScript.', type: 'paragraph' },
        { text: 'It adds optional static typing to the language.', type: 'paragraph' },
        { text: 'const x: number = 5;', type: 'code' },
      ]);

      expect(assistantResult.message.role).toBe('assistant');
      expect(assistantResult.blocks).toHaveLength(3);

      // Verify state
      const finalState = useStore.getState();
      expect(finalState.threads[0].messages).toHaveLength(2);
      expect(finalState.blocks).toHaveLength(4); // 1 user + 3 assistant
      expect(finalState.hasInitialResponse).toBe(false); // UI slice controls this

      // Wait for Supabase persistence
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(supabaseThreads.persistThreadSnapshot).toHaveBeenCalledTimes(2);
    });
  });

  describe('User Flow: Block selection and transformation', () => {
    it('should handle block selection and text selection', async () => {
      const store = useStore.getState();

      // Setup: Create thread with message
      store.createThread('thread-1');
      store.setMode('chat');
      store.addUserMessage('Hello');
      store.addAssistantMessage([
        { text: 'This is a paragraph with important text.', type: 'paragraph' },
      ]);

      const blockId = useStore.getState().blocks[1].id; // Get assistant block

      // 1. User clicks block to select it
      store.toggleSelectedBlock(blockId);
      expect(useStore.getState().selectedBlockId).toBe(blockId);

      // 2. User highlights text within block
      store.addSelection(blockId, 'important text');

      await new Promise((resolve) => setTimeout(resolve, 10));
      const block = useStore.getState().blocks.find((b) => b.id === blockId);
      expect(block?.selections).toContain('important text');
      expect(supabaseBlocks.persistBlockUpdate).toHaveBeenCalled();

      // 3. User adds another selection
      store.addSelection(blockId, 'paragraph');
      const blockWithTwoSelections = useStore.getState().blocks.find((b) => b.id === blockId);
      expect(blockWithTwoSelections?.selections).toHaveLength(2);

      // 4. User removes a selection
      store.removeSelection(blockId, 0);
      const blockAfterRemoval = useStore.getState().blocks.find((b) => b.id === blockId);
      expect(blockAfterRemoval?.selections).toHaveLength(1);

      // 5. User deselects block
      store.toggleSelectedBlock(blockId);
      expect(useStore.getState().selectedBlockId).toBeNull();
    });
  });

  describe('User Flow: Block rewrite with undo', () => {
    it('should handle rewrite and undo cycle', async () => {
      const store = useStore.getState();

      // Setup
      store.createThread('thread-1');
      store.setMode('chat');
      store.addAssistantMessage([
        { text: 'Original text here.', type: 'paragraph' },
      ]);

      const blockId = useStore.getState().blocks[0].id;
      const originalText = 'Original text here.';

      // 1. User triggers rewrite
      store.toggleRewrite(blockId, 'Rewritten text here.');

      await new Promise((resolve) => setTimeout(resolve, 10));
      let block = useStore.getState().blocks.find((b) => b.id === blockId);
      expect(block?.text).toBe('Rewritten text here.');
      expect(block?.prevText).toBe(originalText);
      expect(block?.isRewritten).toBe(true);
      expect(supabaseBlocks.persistBlockUpdate).toHaveBeenCalled();

      // 2. User clicks undo to revert
      store.toggleRewrite(blockId, '');

      block = useStore.getState().blocks.find((b) => b.id === blockId);
      expect(block?.text).toBe(originalText);
      expect(block?.isRewritten).toBe(false);
    });
  });

  describe('User Flow: Inline block editing', () => {
    it('should handle inline text editing', async () => {
      const store = useStore.getState();

      // Setup
      store.createThread('thread-1');
      store.setMode('chat');
      store.addAssistantMessage([
        { text: 'Original paragraph.', type: 'paragraph' },
      ]);

      const blockId = useStore.getState().blocks[0].id;

      // 1. User edits block text inline
      store.updateBlockText(blockId, 'Edited paragraph.', true);

      await new Promise((resolve) => setTimeout(resolve, 10));
      const block = useStore.getState().blocks.find((b) => b.id === blockId);
      expect(block?.text).toBe('Edited paragraph.');
      expect(block?.edited).toBe(true);
      expect(supabaseBlocks.persistBlockUpdate).toHaveBeenCalled();
    });
  });

  describe('User Flow: Thread loading from Supabase', () => {
    it('should merge loaded thread into state', () => {
      const store = useStore.getState();

      // Simulate loading thread from database
      const loadedThread = {
        id: 'thread-from-db',
        title: 'Existing Thread',
        createdAt: Date.now() - 1000000,
        updatedAt: Date.now() - 500000,
        messages: [],
      };

      const loadedMessages = [
        {
          id: 'msg-1',
          threadId: 'thread-from-db',
          role: 'user' as const,
          createdAt: Date.now() - 1000000,
          content: [{ blockId: 'block-1' }],
          meta: {},
        },
        {
          id: 'msg-2',
          threadId: 'thread-from-db',
          role: 'assistant' as const,
          createdAt: Date.now() - 900000,
          content: [{ blockId: 'block-2' }, { blockId: 'block-3' }],
          meta: {},
        },
      ];

      const loadedBlocks = [
        {
          id: 'block-1',
          messageId: 'msg-1',
          type: 'paragraph' as const,
          text: 'User question',
          edited: false,
          selections: [],
          prevText: null,
          isRewritten: false,
        },
        {
          id: 'block-2',
          messageId: 'msg-2',
          type: 'paragraph' as const,
          text: 'Assistant response part 1',
          edited: false,
          selections: ['response'],
          prevText: null,
          isRewritten: false,
        },
        {
          id: 'block-3',
          messageId: 'msg-2',
          type: 'list' as const,
          text: '- Item 1\n- Item 2',
          edited: false,
          selections: [],
          prevText: null,
          isRewritten: false,
        },
      ];

      // Merge into state
      store.mergeThreadFromSupabase(loadedThread, loadedMessages, loadedBlocks);

      const state = useStore.getState();
      expect(state.threads).toHaveLength(1);
      expect(state.threads[0].messages).toHaveLength(2);
      expect(state.blocks).toHaveLength(3);
      expect(state.blocks[1].selections).toContain('response');
    });
  });

  describe('User Flow: Multiple threads', () => {
    it('should handle switching between threads', () => {
      const store = useStore.getState();

      // Create multiple threads
      store.createThread('thread-1');
      store.addUserMessage('Question in thread 1');

      store.createThread('thread-2');
      store.addUserMessage('Question in thread 2');

      // Switch back to thread 1
      store.setActiveThread('thread-1');
      expect(useStore.getState().activeThreadId).toBe('thread-1');

      // Verify blocks are preserved
      const state = useStore.getState();
      expect(state.threads).toHaveLength(2);
      expect(state.blocks).toHaveLength(2); // One block per message

      // Find thread 1 messages
      const thread1 = state.threads.find((t) => t.id === 'thread-1');
      expect(thread1?.messages).toHaveLength(1);
    });
  });

  describe('Composer Mode Handling', () => {
    it('should track block mode correctly', () => {
      const store = useStore.getState();

      // Setup
      store.createThread('thread-1');
      store.setMode('chat');
      store.addAssistantMessage([
        { text: 'Test paragraph.', type: 'paragraph' },
      ]);

      const blockId = useStore.getState().blocks[0].id;

      // Chat mode (no block selected)
      expect(useStore.getState().selectedBlockId).toBeNull();

      // Switch to block mode
      store.toggleSelectedBlock(blockId);
      expect(useStore.getState().selectedBlockId).toBe(blockId);

      // Back to chat mode
      store.clearSelectedBlock();
      expect(useStore.getState().selectedBlockId).toBeNull();
    });

    it('should clear selection when switching to landing mode', () => {
      const store = useStore.getState();

      // Setup
      store.createThread('thread-1');
      store.setMode('chat');
      store.addAssistantMessage([
        { text: 'Test paragraph.', type: 'paragraph' },
      ]);

      const blockId = useStore.getState().blocks[0].id;
      store.toggleSelectedBlock(blockId);

      // Switch to landing mode
      store.setMode('landing');
      expect(useStore.getState().selectedBlockId).toBeNull();
    });
  });
});
