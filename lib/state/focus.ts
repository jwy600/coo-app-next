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
 * Opens the focus editor on a slice of `message.text`. The buffer is the raw
 * markdown slice as-is; any prior `> **Note:** ...` lines re-appear inside the
 * buffer, where the user can edit them directly. Captures the assistant
 * message's `responseId` as the chain head, or falls back to the prior user
 * message's text as a reference question. If another editor is already
 * active, it is auto-saved (closeEditor) first so its edits aren't lost.
 * No-op if the target message can't be found.
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
      prevBuffer: null,
      lastResponseId,
      referenceQuestion,
    },
  };
};

/**
 * Auto-saves and closes the editor: writes the buffer (which already
 * contains any inline notes as raw markdown) into `message.text` at the
 * original range via `replaceMessageRange`, then clears `focus`.
 */
export const closeEditor = (state: AppState): AppState => {
  if (!state.focus) return state;
  const { messageId, range, buffer } = state.focus;
  const next = replaceMessageRange(state, messageId, range, buffer);
  return { ...next, focus: null };
};

export const updateBuffer = (state: AppState, buffer: string): AppState => {
  if (!state.focus) return state;
  return { ...state, focus: { ...state.focus, buffer } };
};

/**
 * Appends an ask answer to the buffer as a `> **Note:** <answer>` blockquote
 * line (separated from the prior content by a blank line). The note becomes
 * raw markdown inside the buffer — there is no separate notes state.
 */
export const appendNoteToBuffer = (
  state: AppState,
  note: string,
): AppState => {
  if (!state.focus) return state;
  const trimmed = note.trim();
  if (!trimmed) return state;
  const { buffer } = state.focus;
  const sep = buffer.length === 0 ? '' : '\n\n';
  return {
    ...state,
    focus: { ...state.focus, buffer: `${buffer}${sep}> **Note:** ${trimmed}` },
  };
};

/**
 * Replaces the buffer with a new value and stashes the previous one so a
 * single revertRewrite call can restore it. Inline notes (if any) are
 * consumed by the Rewrite — the LLM was given them as guidance and produced
 * a passage that no longer needs them.
 */
export const setRewriteResult = (state: AppState, buffer: string): AppState => {
  if (!state.focus) return state;
  return {
    ...state,
    focus: {
      ...state.focus,
      prevBuffer: state.focus.buffer,
      buffer,
    },
  };
};

/**
 * Replaces the buffer with the result of a one-shot shortcut (translate /
 * eli5 / summarize) and stashes the previous one so revertRewrite can
 * restore it. Identical shape to setRewriteResult; the merging of notes
 * back into the result happens at the call site (see EditorControls).
 */
export const setShortcutResult = (
  state: AppState,
  buffer: string,
): AppState => {
  if (!state.focus) return state;
  return {
    ...state,
    focus: {
      ...state.focus,
      prevBuffer: state.focus.buffer,
      buffer,
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

/**
 * Splits a buffer into its passage portion and any trailing
 * `> **Note:** ...` lines. The note pattern is single-line by contract:
 * ask answers are constrained to 2–3 sentences in one paragraph, so
 * notes never span multiple paragraphs.
 *
 * Used by API-call sites (rewrite, shortcuts) so the LLM operates on the
 * passage rather than a passage-with-embedded-instructions.
 */
export const splitNotes = (
  buffer: string,
): { passage: string; notes: string[] } => {
  const notes: string[] = [];
  let cursor = buffer.length;
  // Walk backwards block-by-block, peeling off `> **Note:** ...` lines.
  while (true) {
    // Find the previous `\n\n` boundary (or start of string).
    const sepIndex = buffer.lastIndexOf('\n\n', cursor - 1);
    const blockStart = sepIndex === -1 ? 0 : sepIndex + 2;
    const block = buffer.slice(blockStart, cursor);
    const match = /^> \*\*Note:\*\* (.*)$/.exec(block);
    if (!match) break;
    notes.unshift(match[1].trim());
    cursor = sepIndex === -1 ? 0 : sepIndex;
    if (cursor === 0) break;
  }
  return { passage: buffer.slice(0, cursor), notes };
};
