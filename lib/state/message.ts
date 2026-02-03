import { AppState } from '@/types/state';
import { Message } from '@/types/message';
import { Block, BlockData, BlockType } from '@/types/block';
import { updateThreadMessages, ensureThreadExists } from './thread';

/**
 * Message-related state transformations
 */

const createBlock = (
  id: string,
  messageId: string,
  text: string,
  type: BlockType = 'paragraph'
): Block => ({
  id,
  messageId,
  type,
  text,
  edited: false,
  selections: [],
  prevText: null,
  isRewritten: false,
});

interface AddMessageResult {
  state: AppState;
  message: Message;
  blocks: Block[];
}

export const addUserMessage = (
  state: AppState,
  text: string,
  idFactory: () => string,
  nowFactory: () => number
): AddMessageResult => {
  const threadId = state.activeThreadId;
  if (!threadId) {
    throw new Error('Cannot add message: no active thread');
  }
  const messageId = idFactory();
  const message: Message = {
    id: messageId,
    threadId,
    role: 'user',
    createdAt: nowFactory(),
    content: [
      {
        blockId: idFactory(),
      },
    ],
    meta: {},
  };
  const block = createBlock(message.content[0].blockId, messageId, text);
  const nextState = updateThreadMessages(
    state,
    threadId,
    (messages) => [...messages, message],
    nowFactory
  );
  return {
    state: { ...nextState, blocks: [...nextState.blocks, block] },
    message,
    blocks: [block],
  };
};

export const addAssistantMessage = (
  state: AppState,
  blocksData: BlockData[],
  idFactory: () => string,
  nowFactory: () => number,
  responseId?: string
): AddMessageResult => {
  const threadId = state.activeThreadId;
  if (!threadId) {
    throw new Error('Cannot add message: no active thread');
  }
  return addAssistantMessageToThread(
    state,
    threadId,
    blocksData,
    idFactory,
    nowFactory,
    responseId
  );
};

export const addAssistantMessageToThread = (
  state: AppState,
  threadId: string,
  blocksData: BlockData[],
  idFactory: () => string,
  nowFactory: () => number,
  responseId?: string
): AddMessageResult => {
  const baseState = ensureThreadExists(state, threadId, nowFactory);
  const messageId = idFactory();
  const newBlocks = blocksData.map((block) =>
    createBlock(idFactory(), messageId, block.text, block.type)
  );
  const message: Message = {
    id: messageId,
    threadId,
    role: 'assistant',
    createdAt: nowFactory(),
    content: newBlocks.map((block) => ({ blockId: block.id })),
    meta: responseId ? { openaiResponseId: responseId } : {},
  };
  const nextState = updateThreadMessages(
    baseState,
    threadId,
    (messages) => [...messages, message],
    nowFactory
  );
  return {
    state: { ...nextState, blocks: [...nextState.blocks, ...newBlocks] },
    message,
    blocks: newBlocks,
  };
};
