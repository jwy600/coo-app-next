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
 * A line that begins a new markdown block — a blank line, or a heading,
 * blockquote, code fence, or list item. Such a line ends (interrupts) the
 * paragraph above it even without a preceding blank line (CommonMark block
 * interruption), which is why a `\n\n`-only scan isn't enough: `text\n## H`
 * ends the paragraph at the heading, not at some far-off blank line.
 */
const isBlockBoundaryLine = (line: string): boolean => {
  if (line.trim() === '') return true;
  return /^(#{1,6}(?:\s|$)|>|```|~~~|[-*+]\s|\d+[.)]\s)/.test(line);
};

/** True when the line containing `from` is a list item (starts with a marker). */
const isListLine = (text: string, from: number): boolean => {
  const lineStart = text.lastIndexOf('\n', from - 1) + 1;
  return /^\s*(?:[-*+]\s|\d+[.)]\s)/.test(text.slice(lineStart));
};

/**
 * Start of the first block-boundary line after the paragraph containing
 * `from` — i.e. where that paragraph ends — or `text.length` if it runs to
 * EOF.
 */
const findParagraphEnd = (text: string, from: number): number => {
  let nl = text.indexOf('\n', from);
  while (nl !== -1) {
    const lineStart = nl + 1;
    const nextNl = text.indexOf('\n', lineStart);
    const lineEnd = nextNl === -1 ? text.length : nextNl;
    if (isBlockBoundaryLine(text.slice(lineStart, lineEnd))) return lineStart;
    nl = nextNl;
  }
  return text.length;
};

/** End of the containing list: the next blank line (`\n\n`), or EOF. */
const findListEnd = (text: string, from: number): number => {
  const idx = text.indexOf('\n\n', from);
  return idx === -1 ? text.length : idx;
};

/**
 * Auto-saves and closes the editor. The edited passage writes back at the
 * selection range; trailing notes, though, RELOCATE to the end of the
 * containing block — never inserted at the inline selection point. Otherwise
 * a note blockquote placed mid-paragraph would absorb the trailing text
 * (markdown lazy continuation / same-line glue).
 *
 * The block end is the end of the whole list when the selection is in a list
 * item (keeps the list intact), otherwise the end of the paragraph — found by
 * scanning for the next blank line *or* block-interrupting line (a heading,
 * blockquote, code fence, or list that starts without a blank line). The note
 * is then written as a standalone block with blank-line separators on both
 * sides, normalizing whatever whitespace sat between the passage and the next
 * block so it never glues to neighbouring text.
 *
 * While the editor is open the buffer still holds passage + notes inline, so
 * editing, shortcuts, and Rewrite behave exactly as before — only the close
 * path moves the notes.
 */
export const closeEditor = (state: AppState): AppState => {
  if (!state.focus) return state;
  const { messageId, range, buffer } = state.focus;
  const [start, end] = range;
  const { passage, notes } = splitNotes(buffer);

  // No trailing notes → write the edited buffer straight back at the range.
  if (notes.length === 0) {
    return { ...replaceMessageRange(state, messageId, range, buffer), focus: null };
  }

  const message = findMessage(state, messageId);
  if (!message) return { ...state, focus: null };
  const text = message.text;
  const boundary = isListLine(text, end)
    ? findListEnd(text, end)
    : findParagraphEnd(text, end);

  // Re-quote the note bodies (the `[Minor]` marker lives inside the body, so
  // it rides along). Trim the inter-block whitespace on both sides and insert
  // the notes as a clean standalone block.
  const notesBlock = notes.map((note) => quoteNote(note)).join('\n\n');
  const prefix =
    text.slice(0, start) + passage + text.slice(end, boundary).replace(/\s+$/, '');
  const suffix = text.slice(boundary).replace(/^\s+/, '');
  const nextText = suffix
    ? `${prefix}\n\n${notesBlock}\n\n${suffix}`
    : `${prefix}\n\n${notesBlock}`;

  const next = replaceMessageRange(state, messageId, [0, text.length], nextText);
  return { ...next, focus: null };
};

export const updateBuffer = (state: AppState, buffer: string): AppState => {
  if (!state.focus) return state;
  return { ...state, focus: { ...state.focus, buffer } };
};

/**
 * Serializes a note into a single blockquote: the first line is prefixed with
 * `> **Note:** ` and every subsequent line is prefixed with `>`. Quoting every
 * line matters when the answer spans multiple paragraphs — without a `>` on
 * each continuation line the later paragraphs fall out of the blockquote and
 * lose their left-border styling.
 */
const quoteNote = (note: string, isMinor = false): string => {
  const marker = isMinor ? '[Minor] ' : '';
  return note
    .split('\n')
    .map((line, i) =>
      i === 0 ? `> **Note:** ${marker}${line}` : line === '' ? '>' : `> ${line}`,
    )
    .join('\n');
};

/**
 * Appends an ask answer to the buffer as a `> **Note:** <answer>` blockquote
 * (separated from the prior content by a blank line). The note becomes raw
 * markdown inside the buffer — there is no separate notes state.
 */
export const appendNoteToBuffer = (
  state: AppState,
  note: string,
  isMinor = false,
): AppState => {
  if (!state.focus) return state;
  const trimmed = note.trim();
  if (!trimmed) return state;
  const { buffer } = state.focus;
  const sep = buffer.length === 0 ? '' : '\n\n';
  return {
    ...state,
    focus: {
      ...state.focus,
      buffer: `${buffer}${sep}${quoteNote(trimmed, isMinor)}`,
    },
  };
};

/**
 * Detect and strip a leading "Minor" tag from an Ask answer. The ask prompt
 * has the model begin skippable-concept answers with **Minor** — (or "Minor —"
 * / "Minor:"); pull the flag off so it can mark the note line and the body
 * stays clean. Does not match "Minority"; preserves a multi-line body.
 * Ported from obsidian-coo.
 */
export const parseMinorTag = (
  text: string,
): { isMinor: boolean; body: string } => {
  const match = text.match(
    /^\s*(?:\*\*\s*minor\s*\*\*|minor)\s*[—–\-:]\s*([\s\S]*)$/i,
  );
  if (match) {
    return { isMinor: true, body: (match[1] ?? '').trim() };
  }
  return { isMinor: false, body: text };
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
 * If `block` is a contiguous note blockquote — every line begins with `>` and
 * the first line begins with `> **Note:** ` — returns the note text with the
 * quote prefixes stripped (blank `>` separators become paragraph breaks).
 * Returns null otherwise. A note may span multiple paragraphs.
 */
const matchNoteBlock = (block: string): string | null => {
  const lines = block.split('\n');
  if (lines.length === 0) return null;
  if (!lines.every((line) => line === '>' || line.startsWith('> '))) return null;
  const firstMatch = /^> \*\*Note:\*\* (.*)$/.exec(lines[0]);
  if (!firstMatch) return null;
  const body = [
    firstMatch[1],
    ...lines.slice(1).map((line) => line.replace(/^> ?/, '')),
  ];
  return body.join('\n').trim();
};

/**
 * Splits a buffer into its passage portion and any trailing
 * `> **Note:** ...` blockquotes. Each trailing note may span multiple
 * paragraphs (continuation lines carry their own `>` prefix, so a multi-
 * paragraph note is still one `\n\n`-delimited block).
 *
 * Used by API-call sites (rewrite, ask, shortcuts) so the LLM operates on the
 * passage rather than a passage-with-embedded-instructions.
 */
export const splitNotes = (
  buffer: string,
): { passage: string; notes: string[] } => {
  const notes: string[] = [];
  let cursor = buffer.length;
  // Walk backwards block-by-block, peeling off `> **Note:** ...` blocks.
  while (true) {
    // Find the previous `\n\n` boundary (or start of string).
    const sepIndex = buffer.lastIndexOf('\n\n', cursor - 1);
    const blockStart = sepIndex === -1 ? 0 : sepIndex + 2;
    const block = buffer.slice(blockStart, cursor);
    const note = matchNoteBlock(block);
    if (note === null) break;
    notes.unshift(note);
    cursor = sepIndex === -1 ? 0 : sepIndex;
    if (cursor === 0) break;
  }
  return { passage: buffer.slice(0, cursor), notes };
};
