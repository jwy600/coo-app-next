import { AppState } from '@/types/state';
import { findMessage, replaceMessageRange } from './message';

export interface FocusActive {
  messageId: string;
  range: [number, number];
  buffer: string;
  notes: string[];
  prevBuffer: string | null;
}

/**
 * Opens the focus editor on a slice of `message.text`. Initializes the
 * buffer to the slice and clears notes / Rewrite undo state. No-op if the
 * message can't be found.
 */
export const openEditor = (
  state: AppState,
  messageId: string,
  range: [number, number],
): AppState => {
  const message = findMessage(state, messageId);
  if (!message) return state;
  const buffer = message.text.slice(range[0], range[1]);
  return {
    ...state,
    focus: { messageId, range, buffer, notes: [], prevBuffer: null },
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
