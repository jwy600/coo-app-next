import { AppState } from '@/types/state';
import { Message } from '@/types/message';
import { FocusActive } from '@/types/state/ui';
import { findMessage, replaceMessageRange } from './message';

export type { FocusActive };

const findPriorUserMessageText = (
  state: AppState,
  messageId: string,
): string | undefined => {
  for (const thread of state.threads) {
    const idx = thread.messages.findIndex((m) => m.id === messageId);
    if (idx <= 0) continue;
    const prev = thread.messages[idx - 1];
    return prev.role === 'user' ? prev.text : undefined;
  }
  return undefined;
};

/**
 * Opens the focus editor on a slice of `message.text`. Initializes the
 * buffer to the slice and clears notes / Rewrite undo state. Captures the
 * assistant message's `responseId` as the chain head, or falls back to the
 * prior user message's text as a reference question. If another editor is
 * already active, it is auto-saved (closeEditor) first so its edits aren't
 * lost. No-op if the target message can't be found.
 */
export const openEditor = (
  state: AppState,
  messageId: string,
  range: [number, number],
): AppState => {
  const baseState = state.focus ? closeEditor(state) : state;
  const message = findMessage(baseState, messageId);
  if (!message) return baseState;
  const buffer = message.text.slice(range[0], range[1]);
  const lastResponseId = (message as Message).meta?.openaiResponseId as
    | string
    | undefined;
  const referenceQuestion = lastResponseId
    ? undefined
    : findPriorUserMessageText(baseState, messageId);
  return {
    ...baseState,
    focus: {
      messageId,
      range,
      buffer,
      notes: [],
      prevBuffer: null,
      lastResponseId,
      referenceQuestion,
    },
  };
};

/**
 * Auto-saves and closes the editor: writes `buffer + serialized notes` into
 * `message.text` at the original range via `replaceMessageRange`, then
 * clears `focus`.
 */
export const closeEditor = (state: AppState): AppState => {
  if (!state.focus) return state;
  const { messageId, range, buffer, notes } = state.focus;
  const replacement = serializeBuffer(buffer, notes);
  const next = replaceMessageRange(state, messageId, range, replacement);
  return { ...next, focus: null };
};

export const updateBuffer = (state: AppState, buffer: string): AppState => {
  if (!state.focus) return state;
  return { ...state, focus: { ...state.focus, buffer } };
};

export const appendNote = (state: AppState, note: string): AppState => {
  if (!state.focus) return state;
  return {
    ...state,
    focus: { ...state.focus, notes: [...state.focus.notes, note] },
  };
};

/**
 * Replaces the buffer with a new value and stashes the previous one so a
 * single revertRewrite call can restore it. Notes are consumed by the
 * Rewrite — they were folded into the prompt that produced this result.
 */
export const setRewriteResult = (state: AppState, buffer: string): AppState => {
  if (!state.focus) return state;
  return {
    ...state,
    focus: {
      ...state.focus,
      prevBuffer: state.focus.buffer,
      buffer,
      notes: [],
    },
  };
};

/**
 * Updates the focus chain head with a new responseId returned by OpenAI.
 * No-op if no editor is active.
 */
export const setFocusLastResponseId = (
  state: AppState,
  responseId: string,
): AppState => {
  if (!state.focus) return state;
  return { ...state, focus: { ...state.focus, lastResponseId: responseId } };
};

/**
 * Restores the buffer to its pre-Rewrite state. Single-step only — once
 * called, prevBuffer is cleared and a second call is a no-op.
 */
export const revertRewrite = (state: AppState): AppState => {
  if (!state.focus || state.focus.prevBuffer === null) return state;
  return {
    ...state,
    focus: {
      ...state.focus,
      buffer: state.focus.prevBuffer,
      prevBuffer: null,
    },
  };
};

function serializeBuffer(buffer: string, notes: string[]): string {
  if (notes.length === 0) return buffer;
  const noteBlock = notes.map((n) => `> **Note:** ${n}`).join('\n\n');
  return `${buffer}\n\n${noteBlock}`;
}
