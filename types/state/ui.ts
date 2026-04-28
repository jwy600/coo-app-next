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
  buffer: string;
  notes: string[];
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

export interface UIState {
  mode: AppMode;
  isAwaitingResponse: boolean;
  error: string | null;
  focus: FocusActive | null;
  composerPrompt: string;
}
