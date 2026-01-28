/**
 * End-to-End User Flow Tests
 * 
 * Tests all 6 user flows from MIGRATION_DISCOVERY.md
 * Phase 9: Integration & Testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store/useStore';
import { splitIntoBlocks } from '@/lib/state/parser';

// Helper to reset store to initial state
function resetStore() {
  const state = useStore.getState();
  // Set initial state values
  state.mode = 'landing';
  state.selectedBlockId = null;
  state.activeThreadId = '';
  state.threads = [];
  state.blocks = [];
  state.cards = [];
}

describe('User Flow Tests', () => {
  beforeEach(() => {
    // Reset store before each test
    resetStore();
  });

  describe('Flow 1: Landing Page to New Chat', () => {
    it('should create new thread when user submits from landing page', async () => {
      // Initial state: landing mode
      const initialState = useStore.getState();
      expect(initialState.mode).toBe('landing');
      
      // Create thread and add user message
      const createThread = useStore.getState().createThread;
      const addUserMessage = useStore.getState().addUserMessage;
      const setMode = useStore.getState().setMode;

      // Simulate user submission - createThread updates store directly
      createThread();
      setMode('thread'); // Simulate what useComposer does

      // Get the created thread ID
      const state1 = useStore.getState();
      const threadId = state1.activeThreadId;
      expect(threadId).toBeTruthy();

      // Add user message
      addUserMessage('Hello');

      // Verify thread created
      const state = useStore.getState();
      expect(state.threads).toHaveLength(1);
      expect(state.threads[0].id).toBe(threadId);
      expect(state.threads[0].messages).toHaveLength(1);
      expect(state.threads[0].messages[0].role).toBe('user');

      // Verify mode changed to chat
      expect(state.mode).toBe('thread');
      expect(state.activeThreadId).toBe(threadId);
    });
  });

  describe('Flow 2: Block Selection and Transformation', () => {
    it('should allow block selection and show controls', () => {
      // Setup: Create thread with assistant message
      const createThread = useStore.getState().createThread;
      const addUserMessage = useStore.getState().addUserMessage;
      const addAssistantMessage = useStore.getState().addAssistantMessage;
      const setMode = useStore.getState().setMode;

      createThread();
      setMode('thread');
      addUserMessage('Explain React');

      const assistantText = 'React is a JavaScript library for building user interfaces.';
      addAssistantMessage(splitIntoBlocks(assistantText));

      // Select a block
      const selectBlock = useStore.getState().selectBlock;
      const blocks = useStore.getState().blocks;
      const blockId = blocks[0]?.id;

      expect(blockId).toBeDefined();
      selectBlock(blockId!);

      // Verify block is selected
      const state = useStore.getState();
      expect(state.selectedBlockId).toBe(blockId);
    });

    it('should handle block transformation actions', async () => {
      // Setup: Create thread with selected block
      const createThread = useStore.getState().createThread;
      const addAssistantMessage = useStore.getState().addAssistantMessage;
      const selectBlock = useStore.getState().selectBlock;

      createThread();
      addAssistantMessage(splitIntoBlocks('React is a JavaScript library.'));

      const blocks = useStore.getState().blocks;
      const blockId = blocks[0]?.id;
      selectBlock(blockId!);
      
      // Test ELI5 transformation
      // (In real app, this would call handleBlockAction from useComposer)
      const selectedBlock = blocks.find(b => b.id === blockId);
      expect(selectedBlock).toBeDefined();
      expect(selectedBlock!.text).toBe('React is a JavaScript library.');
    });
  });

  describe('Flow 3: Text Selection and Rewrite', () => {
    it('should capture text selections on block', () => {
      // Setup thread with block
      const createThread = useStore.getState().createThread;
      const addAssistantMessage = useStore.getState().addAssistantMessage;
      const addSelection = useStore.getState().addSelection;
      
      createThread();
      addAssistantMessage(splitIntoBlocks('React is a JavaScript library.'));
      
      const blocks = useStore.getState().blocks;
      const blockId = blocks[0]?.id;
      
      // Add text selection
      addSelection(blockId!, 'JavaScript');
      
      // Verify selection added
      const state = useStore.getState();
      const block = state.blocks.find(b => b.id === blockId);
      expect(block!.selections).toContain('JavaScript');
    });

    it('should handle rewrite with toggle capability', () => {
      // Setup block with selection
      const createThread = useStore.getState().createThread;
      const addAssistantMessage = useStore.getState().addAssistantMessage;
      const toggleRewrite = useStore.getState().toggleRewrite;
      
      createThread();
      addAssistantMessage(splitIntoBlocks('React is a library.'));
      
      const blocks = useStore.getState().blocks;
      const blockId = blocks[0]?.id;
      const originalText = blocks[0]?.text;
      
      // Apply rewrite
      const rewrittenText = 'React is a powerful library.';
      toggleRewrite(blockId!, rewrittenText);
      
      // Verify rewrite applied
      let state = useStore.getState();
      let block = state.blocks.find(b => b.id === blockId);
      expect(block!.text).toBe(rewrittenText);
      expect(block!.prevText).toBe(originalText);
      expect(block!.isRewritten).toBe(true);
      
      // Toggle back to original
      toggleRewrite(blockId!, rewrittenText);
      
      state = useStore.getState();
      block = state.blocks.find(b => b.id === blockId);
      expect(block!.text).toBe(originalText);
      expect(block!.isRewritten).toBe(false);
    });
  });

  describe('Flow 4: Thread Management', () => {
    it('should create multiple threads', () => {
      const createThread = useStore.getState().createThread;
      const setActiveThread = useStore.getState().setActiveThread;
      
      // Create first thread
      createThread();
      const thread1Id = useStore.getState().activeThreadId;
      
      // Create second thread
      createThread();
      const thread2Id = useStore.getState().activeThreadId;
      
      const state = useStore.getState();
      expect(state.threads).toHaveLength(2);
      expect(state.threads[0].id).toBe(thread1Id);
      expect(state.threads[1].id).toBe(thread2Id);
    });

    it('should switch between threads', () => {
      const createThread = useStore.getState().createThread;
      const setActiveThread = useStore.getState().setActiveThread;
      
      // Create two threads
      createThread();
      const thread1Id = useStore.getState().activeThreadId;
      
      createThread();
      const thread2Id = useStore.getState().activeThreadId;
      
      // Current active should be thread 2
      expect(useStore.getState().activeThreadId).toBe(thread2Id);
      
      // Switch back to thread 1
      setActiveThread(thread1Id);
      
      const state = useStore.getState();
      expect(state.activeThreadId).toBe(thread1Id);
    });
  });

  describe('Flow 5: Return to Landing', () => {
    it('should clear selection and return to landing mode', () => {
      const createThread = useStore.getState().createThread;
      const addAssistantMessage = useStore.getState().addAssistantMessage;
      const selectBlock = useStore.getState().selectBlock;
      const setMode = useStore.getState().setMode;
      const clearSelection = useStore.getState().clearSelection;

      // Setup: Create thread with selected block
      createThread();
      setMode('thread');
      addAssistantMessage(splitIntoBlocks('Some content'));

      const blocks = useStore.getState().blocks;
      const blockId = blocks[0]?.id;
      selectBlock(blockId!);

      // Verify selection
      let state = useStore.getState();
      expect(state.selectedBlockId).toBe(blockId);
      expect(state.mode).toBe('thread');

      // Return to landing
      clearSelection();
      setMode('landing');

      // Verify landing state
      state = useStore.getState();
      expect(state.mode).toBe('landing');
      expect(state.selectedBlockId).toBeNull();
    });
  });

  describe('Flow 6: Keyboard Shortcuts', () => {
    it('should clear block selection on Escape key', () => {
      const selectBlock = useStore.getState().selectBlock;
      const clearSelection = useStore.getState().clearSelection;
      const createThread = useStore.getState().createThread;
      const addAssistantMessage = useStore.getState().addAssistantMessage;
      const setMode = useStore.getState().setMode;

      // Setup
      createThread();
      setMode('thread');
      addAssistantMessage(splitIntoBlocks('Content'));

      const blocks = useStore.getState().blocks;
      const blockId = blocks[0]?.id;
      selectBlock(blockId!);

      // Verify selection
      let state = useStore.getState();
      expect(state.selectedBlockId).toBe(blockId);

      // Simulate Escape key
      clearSelection();

      // Verify cleared
      state = useStore.getState();
      expect(state.selectedBlockId).toBeNull();
    });
  });
});
