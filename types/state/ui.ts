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
}

export interface UIState {
  mode: AppMode;
  isAwaitingResponse: boolean;
  error: string | null;
  focus: FocusActive | null;
  composerPrompt: string;
}
