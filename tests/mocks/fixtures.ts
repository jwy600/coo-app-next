/**
 * Shared test data factories
 * Creates valid objects matching TypeScript interfaces with sensible defaults
 */

import { Block, BlockType } from '@/types/block';
import { Message, MessageRole } from '@/types/message';
import { Thread } from '@/types/thread';
import { Card } from '@/types/card';

let counter = 0;
const nextId = () => `test-${++counter}`;

export function createBlock(overrides: Partial<Block> = {}): Block {
  const id = overrides.id ?? nextId();
  return {
    id,
    messageId: 'msg-1',
    type: 'paragraph' as BlockType,
    text: `Block text for ${id}`,
    edited: false,
    selections: [],
    prevText: null,
    isRewritten: false,
    ...overrides,
  };
}

export function createMessage(overrides: Partial<Message> = {}): Message {
  const id = overrides.id ?? nextId();
  return {
    id,
    threadId: 'thread-1',
    role: 'assistant' as MessageRole,
    createdAt: Date.now(),
    content: [],
    meta: {},
    ...overrides,
  };
}

export function createThread(overrides: Partial<Thread> = {}): Thread {
  const id = overrides.id ?? nextId();
  return {
    id,
    title: `Thread ${id}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    ...overrides,
  };
}

export function createCard(overrides: Partial<Card> = {}): Card {
  const id = overrides.id ?? nextId();
  return {
    id,
    messageId: 'msg-1',
    anchorBlockId: 'block-1',
    blockIds: ['block-1'],
    createdAt: Date.now(),
    ...overrides,
  };
}
