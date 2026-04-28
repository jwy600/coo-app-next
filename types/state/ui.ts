/**
 * UI State - Ephemeral state for user interface.
 *
 * Reset on page refresh. Drives modes and pending/error indicators.
 */

export type AppMode = 'landing' | 'thread';

export interface UIState {
  mode: AppMode;
  isAwaitingResponse: boolean;
  error: string | null;
}
