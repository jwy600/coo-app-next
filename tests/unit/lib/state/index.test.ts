import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInitialState,
  setMode,
  setActiveThread,
  updateThreadTitle,
  getThreadById,
  createThread,
  clearSelectedBlocks,
  setHasInitialResponse,
  toggleBlockInSelection,
  getBlockById,
  addUserMessage,
  addAssistantMessage,
  addAssistantMessageToThread,
  addSelection,
  removeSelection,
  clearSelections,
  toggleRewrite,
  updateBlockText,
  splitIntoBlocks,
  getLastAssistantResponseId,
} from '@/lib/state';
import { AppState } from '@/types/state';
import { Block } from '@/types/block';

// Helper factories
const idFactory = () => 'test-id-' + Math.random().toString(36).substr(2, 9);
const nowFactory = () => 1000;

describe('State Management - Core Functions', () => {
  let state: AppState;

  beforeEach(() => {
    state = createInitialState(idFactory, nowFactory);
  });

  describe('createInitialState', () => {
    it('should create initial state with default values', () => {
      expect(state).toHaveProperty('mode', 'landing');
      expect(state).toHaveProperty('selectedBlockIds');
      expect(state.selectedBlockIds).toEqual([]);
      expect(state).toHaveProperty('hasInitialResponse', false);
      expect(state).toHaveProperty('activeThreadId');
      expect(state.threads).toHaveLength(1);
      expect(state.blocks).toHaveLength(0);
    });

    it('should create a default thread with title "current thread"', () => {
      expect(state.threads[0].title).toBe('current thread');
      expect(state.threads[0].messages).toEqual([]);
    });
  });

  describe('setMode', () => {
    it('should set mode to thread', () => {
      const nextState = setMode(state, 'thread');
      expect(nextState.mode).toBe('thread');
    });

    it('should set mode to landing and clear selected blocks', () => {
      state = { ...state, selectedBlockIds: ['some-block-id'] };
      const nextState = setMode(state, 'landing');
      expect(nextState.mode).toBe('landing');
      expect(nextState.selectedBlockIds).toEqual([]);
    });

    it('should maintain immutability', () => {
      const nextState = setMode(state, 'thread');
      expect(nextState).not.toBe(state);
    });
  });

  describe('setActiveThread', () => {
    it('should set active thread id', () => {
      const nextState = setActiveThread(state, 'new-thread-id');
      expect(nextState.activeThreadId).toBe('new-thread-id');
    });
  });

  describe('updateThreadTitle', () => {
    it('should update thread title and updatedAt', () => {
      const threadId = state.activeThreadId;
      const nextState = updateThreadTitle(state, threadId, 'New Title', nowFactory);
      const thread = getThreadById(nextState, threadId);
      expect(thread?.title).toBe('New Title');
      expect(thread?.updatedAt).toBe(1000);
    });

    it('should not modify other threads', () => {
      const firstThreadId = state.activeThreadId;
      const secondThread = createThread(state, 'thread-2', nowFactory, 'Second');
      state = secondThread.state;
      // Update the first thread, not the active thread (which is thread-2)
      const nextState = updateThreadTitle(state, firstThreadId, 'Updated', nowFactory);
      const otherThread = getThreadById(nextState, 'thread-2');
      expect(otherThread?.title).toBe('Second');
    });
  });

  describe('createThread', () => {
    it('should create a new thread', () => {
      const result = createThread(state, 'new-thread', nowFactory, 'Test Thread');
      expect(result.thread.id).toBe('new-thread');
      expect(result.thread.title).toBe('Test Thread');
      expect(result.state.threads).toHaveLength(2);
      expect(result.state.activeThreadId).toBe('new-thread');
    });
  });

  describe('clearSelectedBlocks', () => {
    it('should clear all selected block ids', () => {
      state = { ...state, selectedBlockIds: ['block-123', 'block-456'] };
      const nextState = clearSelectedBlocks(state);
      expect(nextState.selectedBlockIds).toEqual([]);
    });
  });

  describe('setHasInitialResponse', () => {
    it('should set hasInitialResponse to true', () => {
      const nextState = setHasInitialResponse(state, true);
      expect(nextState.hasInitialResponse).toBe(true);
    });
  });

  describe('toggleBlockInSelection', () => {
    beforeEach(() => {
      state = setMode(state, 'thread');
    });

    it('should add a block when none is selected', () => {
      const nextState = toggleBlockInSelection(state, 'block-1');
      expect(nextState.selectedBlockIds).toEqual(['block-1']);
    });

    it('should remove a block when same block is clicked', () => {
      state = { ...state, selectedBlockIds: ['block-1'] };
      const nextState = toggleBlockInSelection(state, 'block-1');
      expect(nextState.selectedBlockIds).toEqual([]);
    });

    it('should add another block to selection (multi-select)', () => {
      state = { ...state, selectedBlockIds: ['block-1'] };
      const nextState = toggleBlockInSelection(state, 'block-2');
      expect(nextState.selectedBlockIds).toEqual(['block-1', 'block-2']);
    });

    it('should not select block when not in thread mode', () => {
      state = setMode(state, 'landing');
      const nextState = toggleBlockInSelection(state, 'block-1');
      expect(nextState.selectedBlockIds).toEqual([]);
    });

    it('should maintain selection order', () => {
      state = setMode(state, 'thread');
      let nextState = toggleBlockInSelection(state, 'block-3');
      nextState = toggleBlockInSelection(nextState, 'block-1');
      nextState = toggleBlockInSelection(nextState, 'block-2');
      expect(nextState.selectedBlockIds).toEqual(['block-3', 'block-1', 'block-2']);
    });
  });

  describe('addUserMessage', () => {
    it('should add a user message to the active thread', () => {
      const result = addUserMessage(state, 'Hello world', idFactory, nowFactory);

      expect(result.message.role).toBe('user');
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].text).toBe('Hello world');
      expect(result.state.blocks).toHaveLength(1);

      const thread = getThreadById(result.state, state.activeThreadId);
      expect(thread?.messages).toHaveLength(1);
    });
  });

  describe('addAssistantMessage', () => {
    it('should add assistant message with multiple blocks', () => {
      const blocksData = [
        { text: 'Block 1', type: 'paragraph' as const },
        { text: 'Block 2', type: 'paragraph' as const },
      ];
      const result = addAssistantMessage(state, blocksData, idFactory, nowFactory);

      expect(result.message.role).toBe('assistant');
      expect(result.blocks).toHaveLength(2);
      expect(result.state.blocks).toHaveLength(2);

      const thread = getThreadById(result.state, state.activeThreadId);
      expect(thread?.messages).toHaveLength(1);
      expect(thread?.messages[0].content).toHaveLength(2);
    });

    it('should store responseId in message meta when provided', () => {
      const blocksData = [{ text: 'Response', type: 'paragraph' as const }];
      const result = addAssistantMessage(state, blocksData, idFactory, nowFactory, 'resp_abc123');

      expect(result.message.meta).toEqual({ openaiResponseId: 'resp_abc123' });
    });

    it('should have empty meta when responseId not provided', () => {
      const blocksData = [{ text: 'Response', type: 'paragraph' as const }];
      const result = addAssistantMessage(state, blocksData, idFactory, nowFactory);

      expect(result.message.meta).toEqual({});
    });
  });

  describe('addAssistantMessageToThread', () => {
    it('should add message to specific thread', () => {
      const newThread = createThread(state, 'thread-2', nowFactory);
      state = newThread.state;

      const blocksData = [{ text: 'Response', type: 'paragraph' as const }];
      const result = addAssistantMessageToThread(
        state,
        'thread-2',
        blocksData,
        idFactory,
        nowFactory
      );

      const thread = getThreadById(result.state, 'thread-2');
      expect(thread?.messages).toHaveLength(1);
    });

    it('should create thread if it does not exist', () => {
      const blocksData = [{ text: 'Response', type: 'paragraph' as const }];
      const result = addAssistantMessageToThread(
        state,
        'non-existent-thread',
        blocksData,
        idFactory,
        nowFactory
      );

      const thread = getThreadById(result.state, 'non-existent-thread');
      expect(thread).toBeDefined();
      expect(thread?.messages).toHaveLength(1);
    });

    it('should store responseId in message meta when provided', () => {
      const blocksData = [{ text: 'Response', type: 'paragraph' as const }];
      const result = addAssistantMessageToThread(
        state,
        state.activeThreadId,
        blocksData,
        idFactory,
        nowFactory,
        'resp_xyz789'
      );

      expect(result.message.meta).toEqual({ openaiResponseId: 'resp_xyz789' });
    });
  });

  describe('getLastAssistantResponseId', () => {
    it('should return undefined when thread has no messages', () => {
      const responseId = getLastAssistantResponseId(state, state.activeThreadId);
      expect(responseId).toBeUndefined();
    });

    it('should return undefined when thread does not exist', () => {
      const responseId = getLastAssistantResponseId(state, 'non-existent-thread');
      expect(responseId).toBeUndefined();
    });

    it('should return undefined when only user messages exist', () => {
      const result = addUserMessage(state, 'Hello', idFactory, nowFactory);
      const responseId = getLastAssistantResponseId(result.state, state.activeThreadId);
      expect(responseId).toBeUndefined();
    });

    it('should return undefined when assistant message has no responseId', () => {
      const blocksData = [{ text: 'Response', type: 'paragraph' as const }];
      const result = addAssistantMessage(state, blocksData, idFactory, nowFactory);
      const responseId = getLastAssistantResponseId(result.state, state.activeThreadId);
      expect(responseId).toBeUndefined();
    });

    it('should return responseId from last assistant message', () => {
      const blocksData = [{ text: 'Response', type: 'paragraph' as const }];
      const result = addAssistantMessage(state, blocksData, idFactory, nowFactory, 'resp_first');
      const responseId = getLastAssistantResponseId(result.state, state.activeThreadId);
      expect(responseId).toBe('resp_first');
    });

    it('should return most recent responseId when multiple assistant messages exist', () => {
      const blocksData = [{ text: 'Response', type: 'paragraph' as const }];

      // Add first assistant message
      let currentState = addAssistantMessage(state, blocksData, idFactory, nowFactory, 'resp_first').state;

      // Add user message
      currentState = addUserMessage(currentState, 'Follow up', idFactory, nowFactory).state;

      // Add second assistant message
      currentState = addAssistantMessage(currentState, blocksData, idFactory, nowFactory, 'resp_second').state;

      const responseId = getLastAssistantResponseId(currentState, state.activeThreadId);
      expect(responseId).toBe('resp_second');
    });

    it('should skip assistant messages without responseId', () => {
      const blocksData = [{ text: 'Response', type: 'paragraph' as const }];

      // Add first assistant message with responseId
      let currentState = addAssistantMessage(state, blocksData, idFactory, nowFactory, 'resp_first').state;

      // Add second assistant message without responseId
      currentState = addAssistantMessage(currentState, blocksData, idFactory, nowFactory).state;

      // Should still return the first responseId since the latest doesn't have one
      // Actually, wait - it searches backwards and the latest message doesn't have openaiResponseId
      // so it will skip it and return resp_first
      const responseId = getLastAssistantResponseId(currentState, state.activeThreadId);
      expect(responseId).toBe('resp_first');
    });
  });
});

describe('Block Operations', () => {
  let state: AppState;

  beforeEach(() => {
    state = createInitialState(idFactory, nowFactory);
    // Add a block to state for testing
    state.blocks = [
      {
        id: 'block-1',
        messageId: 'msg-1',
        type: 'paragraph',
        text: 'Original text',
        edited: false,
        selections: [],
        prevText: null,
        isRewritten: false,
      },
    ];
  });

  describe('getBlockById', () => {
    it('should find block by id', () => {
      const block = getBlockById(state, 'block-1');
      expect(block).toBeDefined();
      expect(block?.text).toBe('Original text');
    });

    it('should return undefined for non-existent block', () => {
      const block = getBlockById(state, 'non-existent');
      expect(block).toBeUndefined();
    });
  });

  describe('addSelection', () => {
    it('should add selection to block', () => {
      const result = addSelection(state, 'block-1', 'highlighted phrase');
      expect(result.block?.selections).toContain('highlighted phrase');
      expect(result.block?.selections).toHaveLength(1);
    });

    it('should append to existing selections', () => {
      state.blocks[0].selections = ['first'];
      const result = addSelection(state, 'block-1', 'second');
      expect(result.block?.selections).toEqual(['first', 'second']);
    });

    it('should maintain immutability', () => {
      const result = addSelection(state, 'block-1', 'test');
      expect(state.blocks[0].selections).toHaveLength(0);
      expect(result.state.blocks[0].selections).toHaveLength(1);
    });
  });

  describe('removeSelection', () => {
    beforeEach(() => {
      state.blocks[0].selections = ['first', 'second', 'third'];
    });

    it('should remove selection at index', () => {
      const result = removeSelection(state, 'block-1', 1);
      expect(result.block?.selections).toEqual(['first', 'third']);
    });

    it('should handle removing from empty selections', () => {
      state.blocks[0].selections = [];
      const result = removeSelection(state, 'block-1', 0);
      expect(result.block?.selections).toEqual([]);
    });

    it('should handle invalid index gracefully', () => {
      const result = removeSelection(state, 'block-1', 99);
      expect(result.block?.selections).toHaveLength(3);
    });
  });

  describe('clearSelections', () => {
    it('should clear all selections from block', () => {
      state.blocks[0].selections = ['first', 'second'];
      const result = clearSelections(state, 'block-1');
      expect(result.block?.selections).toEqual([]);
    });
  });

  describe('toggleRewrite', () => {
    it('should rewrite block and store original', () => {
      const result = toggleRewrite(state, 'block-1', 'Rewritten text');
      expect(result.block?.text).toBe('Rewritten text');
      expect(result.block?.prevText).toBe('Original text');
      expect(result.block?.isRewritten).toBe(true);
      expect(result.block?.edited).toBe(true);
    });

    it('should undo rewrite and restore original', () => {
      state.blocks[0].text = 'Rewritten';
      state.blocks[0].prevText = 'Original text';
      state.blocks[0].isRewritten = true;

      const result = toggleRewrite(state, 'block-1', 'New rewrite');
      expect(result.block?.text).toBe('Original text');
      expect(result.block?.prevText).toBe(null);
      expect(result.block?.isRewritten).toBe(false);
      expect(result.block?.edited).toBe(true);
    });
  });

  describe('updateBlockText', () => {
    it('should update block text without marking as edited', () => {
      const result = updateBlockText(state, 'block-1', 'Updated text', false);
      expect(result.block?.text).toBe('Updated text');
      expect(result.block?.edited).toBe(false);
    });

    it('should update block text and mark as edited', () => {
      const result = updateBlockText(state, 'block-1', 'Updated text', true);
      expect(result.block?.text).toBe('Updated text');
      expect(result.block?.edited).toBe(true);
    });
  });
});

describe('splitIntoBlocks', () => {
  it('should split text into paragraph blocks', () => {
    const text = 'Para 1\n\nPara 2\n\nPara 3';
    const blocks = splitIntoBlocks(text);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].text).toBe('Para 1');
    expect(blocks[1].text).toBe('Para 2');
    expect(blocks[2].text).toBe('Para 3');
  });

  it('should handle empty text', () => {
    const blocks = splitIntoBlocks('');
    expect(blocks).toHaveLength(0);
  });

  it('should detect and preserve code blocks', () => {
    const text = '```javascript\nconst x = 1\n```';
    const blocks = splitIntoBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('code');
    expect(blocks[0].text).toContain('const x = 1');
  });

  it('should split top-level list items into separate blocks', () => {
    const text = '- Item 1\n- Item 2\n- Item 3';
    const blocks = splitIntoBlocks(text);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe('list');
    expect(blocks[0].text).toBe('- Item 1');
    expect(blocks[1].text).toBe('- Item 2');
    expect(blocks[2].text).toBe('- Item 3');
  });

  it('should handle mixed content types', () => {
    const text = 'Intro paragraph\n\n- List item 1\n- List item 2\n\nConclusion';
    const blocks = splitIntoBlocks(text);
    expect(blocks).toHaveLength(4);
    expect(blocks[0].type).toBe('paragraph');
    expect(blocks[1].type).toBe('list');
    expect(blocks[1].text).toBe('- List item 1');
    expect(blocks[2].type).toBe('list');
    expect(blocks[2].text).toBe('- List item 2');
    expect(blocks[3].type).toBe('paragraph');
  });

  it('should handle code blocks with language specifier', () => {
    const text = '```python\ndef hello():\n    print("hi")\n```';
    const blocks = splitIntoBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('code');
  });

  it('should separate multiple code blocks', () => {
    const text = '```js\ncode1\n```\n\nSome text\n\n```js\ncode2\n```';
    const blocks = splitIntoBlocks(text);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe('code');
    expect(blocks[1].type).toBe('paragraph');
    expect(blocks[2].type).toBe('code');
  });

  it('should split numbered list items into separate blocks', () => {
    const text = '1. First\n2. Second\n3. Third';
    const blocks = splitIntoBlocks(text);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe('list');
    expect(blocks[0].text).toBe('1. First');
  });

  it('should keep nested list items with their parent block', () => {
    const text = '- Python\n  - Django\n  - Flask\n- JavaScript\n- Rust';
    const blocks = splitIntoBlocks(text);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].text).toBe('- Python\n  - Django\n  - Flask');
    expect(blocks[1].text).toBe('- JavaScript');
    expect(blocks[2].text).toBe('- Rust');
  });

  it('should trim whitespace from blocks', () => {
    const text = '  Para 1  \n\n  Para 2  ';
    const blocks = splitIntoBlocks(text);
    expect(blocks[0].text).toBe('Para 1');
    expect(blocks[1].text).toBe('Para 2');
  });

  it('should ignore empty paragraphs', () => {
    const text = 'Para 1\n\n\n\nPara 2';
    const blocks = splitIntoBlocks(text);
    expect(blocks).toHaveLength(2);
  });

  it('should handle single line of text', () => {
    const text = 'Single line';
    const blocks = splitIntoBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('Single line');
    expect(blocks[0].type).toBe('paragraph');
  });

  it('should detect headings as heading type', () => {
    const text = '# Main Title\n\nSome paragraph';
    const blocks = splitIntoBlocks(text);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('heading');
    expect(blocks[0].text).toBe('# Main Title');
    expect(blocks[1].type).toBe('paragraph');
  });

  it('should handle multiple heading levels', () => {
    const text = '# H1\n\n## H2\n\n### H3';
    const blocks = splitIntoBlocks(text);
    expect(blocks).toHaveLength(3);
    blocks.forEach((block) => expect(block.type).toBe('heading'));
  });

  it('should separate headings from adjacent content', () => {
    const text = 'Intro\n\n## Section\n\n- Item';
    const blocks = splitIntoBlocks(text);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe('paragraph');
    expect(blocks[1].type).toBe('heading');
    expect(blocks[2].type).toBe('list');
  });

  it('should handle heading immediately followed by list', () => {
    const text = '## Features\n- Feature 1\n- Feature 2';
    const blocks = splitIntoBlocks(text);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe('heading');
    expect(blocks[0].text).toBe('## Features');
    expect(blocks[1].type).toBe('list');
    expect(blocks[2].type).toBe('list');
  });
});
