/**
 * UI State - Ephemeral state for user interface.
 *
 * Reset on page refresh. Drives modes, pending/error indicators, and
 * the focus editor's in-flight session.
 */

export type AppMode = 'landing' | 'thread';

export interface FocusActive {
  messageId: string;
  range: [number, number];
  /**
   * The full editable text, including any trailing `> **Note:** ...` lines
   * appended from ask answers. Notes have no separate state — they live as
   * raw markdown in the buffer.
   */
  buffer: string;
  prevBuffer: string | null;
  /**
   * OpenAI `responseId` to chain off for the next focus-mode call.
   * Initialized from the assistant message's `meta.openaiResponseId` on open;
   * updated after every successful focus call. Undefined when the message has
   * no captured responseId (legacy persisted threads).
   */
  lastResponseId?: string;
  /**
   * Fallback context: the immediately-prior user message's text, captured at
   * open time. Used only when `lastResponseId` is absent — injected as a
   * `<reference-question>` block so the model can disambiguate the passage.
   */
  referenceQuestion?: string;
}

export interface ComposerAttachment {
  fileName: string;
  text: string;
}

export type LandingComposerMode = 'chat' | 'read';

export interface UIState {
  mode: AppMode;
  isAwaitingResponse: boolean;
  error: string | null;
  focus: FocusActive | null;
  composerPrompt: string;
  /**
   * Staged markdown file awaiting the upload-Send (landing Read mode only).
   * Not persisted — cleared on mode switch and after send.
   */
  composerAttachment: ComposerAttachment | null;
  /**
   * Landing composer sub-layout: `'chat'` (prompt + Send) vs `'read'`
   * (attach + Send). Landing-only; the in-thread composer is always chat.
   */
  landingComposerMode: LandingComposerMode;
}
