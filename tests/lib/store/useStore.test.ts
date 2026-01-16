/**
 * Tests for Zustand store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore, selectActiveThread, selectSelectedBlock } from '@/lib/store/useStore';
import * as supabaseThreads from '@/lib/supabase/threads';
import * as supabaseBlocks from '@/lib/supabase/blocks';

// Mock Supabase modules
vi.mock('@/lib/supabase/threads', () => ({
  persistThreadSnapshot: vi.fn().mockResolvedValue(undefined),
  updateThreadMetadata: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase/blocks', () => ({
  persistBlockUpdate: vi.fn().mockResolvedValue(undefined),
}));

describe('useStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useStore.setState({
      threads: [],
      blocks: [],
      activeThreadId: '',
      mode: 'landing',
      selectedBlockId: null,
      hasInitialResponse: false,
      isAwaitingResponse: false,
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Thread Actions', () => {
    it('should create a new thread', () => {
      const { createThread } = useStore.getState();

      createThread('test-thread-id');

      const state = useStore.getState();
      expect(state.threads).toHaveLength(1);
      expect(state.threads[0].id).toBe('test-thread-id');
      expect(state.threads[0].title).toBe('Main');
      expect(state.activeThreadId).toBe('test-thread-id');
    });

    it('should set active thread', () => {
      const { createThread, setActiveThread } = useStore.getState();

      createThread('thread-1');
      createThread('thread-2');
      setActiveThread('thread-1');

      const state = useStore.getState();
      expect(state.activeThreadId).toBe('thread-1');
    });

    it('should update thread title', () => {
      const { createThread, updateThreadTitle } = useStore.getState();

      createThread('thread-1');
      updateThreadTitle('thread-1', 'New Title');

      const state = useStore.getState();
      const thread = state.threads.find((t) => t.id === 'thread-1');
      expect(thread?.title).toBe('New Title');
    });

    it('should add user message and persist to Supabase', async () => {
      const { createThread, addUserMessage } = useStore.getState();

      createThread('thread-1');
      const result = addUserMessage('Hello, world!');

      expect(result.message.role).toBe('user');
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].text).toBe('Hello, world!');

      const state = useStore.getState();
      expect(state.blocks).toHaveLength(1);

      // Wait for async persistence
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(supabaseThreads.persistThreadSnapshot).toHaveBeenCalled();
    });

    it('should add assistant message with multiple blocks', () => {
      const { createThread, addAssistantMessage } = useStore.getState();

      createThread('thread-1');
      const result = addAssistantMessage([
        { text: 'Block 1', type: 'paragraph' },
        { text: 'Block 2', type: 'list' },
      ]);

      expect(result.message.role).toBe('assistant');
      expect(result.blocks).toHaveLength(2);

      const state = useStore.getState();
      expect(state.blocks).toHaveLength(2);
    });

    it('should merge thread from Supabase', () => {
      const { mergeThreadFromSupabase } = useStore.getState();

      const thread = {
        id: 'thread-from-db',
        title: 'Loaded Thread',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };

      const messages = [
        {
          id: 'msg-1',
          threadId: 'thread-from-db',
          role: 'user' as const,
          createdAt: Date.now(),
          content: [{ blockId: 'block-1' }],
          meta: {},
        },
      ];

      const blocks = [
        {
          id: 'block-1',
          messageId: 'msg-1',
          type: 'paragraph' as const,
          text: 'Hello',
          edited: false,
          selections: [],
          prevText: null,
          isRewritten: false,
        },
      ];

      mergeThreadFromSupabase(thread, messages, blocks);

      const state = useStore.getState();
      expect(state.threads).toHaveLength(1);
      expect(state.threads[0].messages).toHaveLength(1);
      expect(state.blocks).toHaveLength(1);
    });
  });

  describe('Block Actions', () => {
    beforeEach(() => {
      // Setup a thread with a message and block
      const { createThread, addUserMessage } = useStore.getState();
      createThread('thread-1');
      addUserMessage('Test message');
      vi.clearAllMocks(); // Clear mocks after setup
    });

    it('should add selection to block', async () => {
      const state = useStore.getState();
      const blockId = state.blocks[0].id;

      state.addSelection(blockId, 'selected text');

      const updatedState = useStore.getState();
      const block = updatedState.blocks.find((b) => b.id === blockId);
      expect(block?.selections).toContain('selected text');

      // Wait for async persistence
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(supabaseBlocks.persistBlockUpdate).toHaveBeenCalled();
    });

    it('should remove selection from block', () => {
      const state = useStore.getState();
      const blockId = state.blocks[0].id;

      state.addSelection(blockId, 'selection 1');
      state.addSelection(blockId, 'selection 2');
      state.removeSelection(blockId, 0);

      const updatedState = useStore.getState();
      const block = updatedState.blocks.find((b) => b.id === blockId);
      expect(block?.selections).toHaveLength(1);
      expect(block?.selections[0]).toBe('selection 2');
    });

    it('should clear all selections', () => {
      const state = useStore.getState();
      const blockId = state.blocks[0].id;

      state.addSelection(blockId, 'selection 1');
      state.addSelection(blockId, 'selection 2');
      state.clearSelections(blockId);

      const updatedState = useStore.getState();
      const block = updatedState.blocks.find((b) => b.id === blockId);
      expect(block?.selections).toHaveLength(0);
    });

    it('should toggle rewrite', () => {
      const state = useStore.getState();
      const blockId = state.blocks[0].id;
      const originalText = state.blocks[0].text;

      // First toggle: enable rewrite
      state.toggleRewrite(blockId, 'Rewritten text');

      let updatedState = useStore.getState();
      let block = updatedState.blocks.find((b) => b.id === blockId);
      expect(block?.text).toBe('Rewritten text');
      expect(block?.prevText).toBe(originalText);
      expect(block?.isRewritten).toBe(true);

      // Second toggle: revert to original
      state.toggleRewrite(blockId, '');

      updatedState = useStore.getState();
      block = updatedState.blocks.find((b) => b.id === blockId);
      expect(block?.text).toBe(originalText);
      expect(block?.isRewritten).toBe(false);
    });

    it('should update block text', () => {
      const state = useStore.getState();
      const blockId = state.blocks[0].id;

      state.updateBlockText(blockId, 'Updated text', true);

      const updatedState = useStore.getState();
      const block = updatedState.blocks.find((b) => b.id === blockId);
      expect(block?.text).toBe('Updated text');
      expect(block?.edited).toBe(true);
    });
  });

  describe('UI Actions', () => {
    it('should set mode', () => {
      const { setMode } = useStore.getState();

      setMode('chat');
      expect(useStore.getState().mode).toBe('chat');

      setMode('landing');
      expect(useStore.getState().mode).toBe('landing');
      expect(useStore.getState().selectedBlockId).toBeNull();
    });

    it('should toggle selected block', () => {
      const { createThread, addUserMessage, setMode, toggleSelectedBlock } = useStore.getState();

      createThread('thread-1');
      addUserMessage('Test message');
      setMode('chat');

      const blockId = useStore.getState().blocks[0].id;

      // Select block
      toggleSelectedBlock(blockId);
      expect(useStore.getState().selectedBlockId).toBe(blockId);

      // Deselect block
      toggleSelectedBlock(blockId);
      expect(useStore.getState().selectedBlockId).toBeNull();
    });

    it('should clear selected block', () => {
      const { createThread, addUserMessage, setMode, toggleSelectedBlock, clearSelectedBlock } = useStore.getState();

      createThread('thread-1');
      addUserMessage('Test message');
      setMode('chat');

      const blockId = useStore.getState().blocks[0].id;
      toggleSelectedBlock(blockId);

      clearSelectedBlock();
      expect(useStore.getState().selectedBlockId).toBeNull();
    });

    it('should set hasInitialResponse', () => {
      const { setHasInitialResponse } = useStore.getState();

      setHasInitialResponse(true);
      expect(useStore.getState().hasInitialResponse).toBe(true);

      setHasInitialResponse(false);
      expect(useStore.getState().hasInitialResponse).toBe(false);
    });

    it('should set isAwaitingResponse', () => {
      const { setAwaitingResponse } = useStore.getState();

      setAwaitingResponse(true);
      expect(useStore.getState().isAwaitingResponse).toBe(true);

      setAwaitingResponse(false);
      expect(useStore.getState().isAwaitingResponse).toBe(false);
    });
  });

  describe('Selectors', () => {
    beforeEach(() => {
      const { createThread, addUserMessage, setMode } = useStore.getState();
      createThread('thread-1');
      addUserMessage('Test message');
      setMode('chat');
    });

    it('should select active thread', () => {
      const state = useStore.getState();
      const activeThread = selectActiveThread(state);

      expect(activeThread).toBeDefined();
      expect(activeThread?.id).toBe('thread-1');
    });

    it('should select selected block', () => {
      const state = useStore.getState();
      const blockId = state.blocks[0].id;

      state.toggleSelectedBlock(blockId);

      const updatedState = useStore.getState();
      const selectedBlock = selectSelectedBlock(updatedState);

      expect(selectedBlock).toBeDefined();
      expect(selectedBlock?.id).toBe(blockId);
    });

    it('should return null for selected block when none selected', () => {
      const state = useStore.getState();
      const selectedBlock = selectSelectedBlock(state);

      expect(selectedBlock).toBeNull();
    });
  });

  describe('Immutability', () => {
    it('should not mutate state when adding user message', () => {
      const { createThread, addUserMessage } = useStore.getState();

      createThread('thread-1');
      const stateBefore = useStore.getState();
      const threadsBefore = stateBefore.threads;
      const blocksBefore = stateBefore.blocks;

      addUserMessage('New message');

      const stateAfter = useStore.getState();

      // State references should be different
      expect(stateAfter.threads).not.toBe(threadsBefore);
      expect(stateAfter.blocks).not.toBe(blocksBefore);
    });

    it('should not mutate state when updating block', () => {
      const { createThread, addUserMessage, updateBlockText } = useStore.getState();

      createThread('thread-1');
      addUserMessage('Test message');

      const stateBefore = useStore.getState();
      const blocksBefore = stateBefore.blocks;
      const blockId = blocksBefore[0].id;

      updateBlockText(blockId, 'Updated text');

      const stateAfter = useStore.getState();

      // Blocks array should be different
      expect(stateAfter.blocks).not.toBe(blocksBefore);
    });
  });
});
