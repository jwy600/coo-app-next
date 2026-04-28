/**
 * Shared test data factories.
 * Creates valid objects matching TypeScript interfaces with sensible defaults.
 */

import { Message, MessageRole } from '@/types/message';
import { Thread } from '@/types/thread';

let counter = 0;
const nextId = () => `test-${++counter}`;

export function createMessage(overrides: Partial<Message> = {}): Message {
  const id = overrides.id ?? nextId();
  return {
    id,
    threadId: 'thread-1',
    role: 'assistant' as MessageRole,
    text: `Message text for ${id}`,
    createdAt: Date.now(),
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
