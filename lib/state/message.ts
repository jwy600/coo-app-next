import { AppState } from '@/types/state';
import { Message } from '@/types/message';
import { updateThreadMessages, ensureThreadExists } from './thread';

interface AddMessageResult {
  state: AppState;
  message: Message;
}

export const addUserMessage = (
  state: AppState,
  text: string,
  idFactory: () => string,
  nowFactory: () => number,
): AddMessageResult => {
  const threadId = state.activeThreadId;
  if (!threadId) {
    throw new Error('Cannot add message: no active thread');
  }
  const message: Message = {
    id: idFactory(),
    threadId,
    role: 'user',
    text,
    createdAt: nowFactory(),
    meta: {},
  };
  const nextState = updateThreadMessages(
    state,
    threadId,
    (messages) => [...messages, message],
    nowFactory,
  );
  return { state: nextState, message };
};

export const addAssistantMessage = (
  state: AppState,
  text: string,
  idFactory: () => string,
  nowFactory: () => number,
  responseId?: string,
): AddMessageResult => {
  const threadId = state.activeThreadId;
  if (!threadId) {
    throw new Error('Cannot add message: no active thread');
  }
  return addAssistantMessageToThread(
    state,
    threadId,
    text,
    idFactory,
    nowFactory,
    responseId,
  );
};

export const addAssistantMessageToThread = (
  state: AppState,
  threadId: string,
  text: string,
  idFactory: () => string,
  nowFactory: () => number,
  responseId?: string,
): AddMessageResult => {
  const baseState = ensureThreadExists(state, threadId, nowFactory);
  const message: Message = {
    id: idFactory(),
    threadId,
    role: 'assistant',
    text,
    createdAt: nowFactory(),
    meta: responseId ? { openaiResponseId: responseId } : {},
  };
  const nextState = updateThreadMessages(
    baseState,
    threadId,
    (messages) => [...messages, message],
    nowFactory,
  );
  return { state: nextState, message };
};

export const appendMessageText = (
  state: AppState,
  messageId: string,
  chunk: string,
): AppState => {
  if (chunk.length === 0) return state;
  return updateMessageBy(state, messageId, (message) => ({
    ...message,
    text: message.text + chunk,
  }));
};

export const replaceMessageRange = (
  state: AppState,
  messageId: string,
  range: [number, number],
  replacement: string,
): AppState => {
  const [start, end] = range;
  return updateMessageBy(state, messageId, (message) => {
    const clampedStart = Math.max(0, Math.min(start, message.text.length));
    const clampedEnd = Math.max(clampedStart, Math.min(end, message.text.length));
    const nextText =
      message.text.slice(0, clampedStart) +
      replacement +
      message.text.slice(clampedEnd);
    return { ...message, text: nextText };
  });
};

export const setMessageResponseId = (
  state: AppState,
  messageId: string,
  responseId: string,
): AppState => {
  return updateMessageBy(state, messageId, (message) => ({
    ...message,
    meta: { ...message.meta, openaiResponseId: responseId },
  }));
};

export const removeMessage = (state: AppState, messageId: string): AppState => {
  let removed = false;
  const threads = state.threads.map((thread) => {
    if (!thread.messages.some((m) => m.id === messageId)) return thread;
    removed = true;
    return { ...thread, messages: thread.messages.filter((m) => m.id !== messageId) };
  });
  return removed ? { ...state, threads } : state;
};

export const findMessage = (
  state: AppState,
  messageId: string,
): Message | undefined => {
  for (const thread of state.threads) {
    const message = thread.messages.find((m) => m.id === messageId);
    if (message) return message;
  }
  return undefined;
};

function updateMessageBy(
  state: AppState,
  messageId: string,
  updater: (message: Message) => Message,
): AppState {
  let changed = false;
  const threads = state.threads.map((thread) => {
    if (!thread.messages.some((m) => m.id === messageId)) return thread;
    changed = true;
    const messages = thread.messages.map((message) =>
      message.id === messageId ? updater(message) : message,
    );
    return { ...thread, messages };
  });
  return changed ? { ...state, threads } : state;
}
