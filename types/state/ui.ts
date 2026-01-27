/**
 * UI State - Ephemeral state for user interface
 *
 * This state is:
 * - Not persisted to database
 * - Reset on page refresh
 * - Controls UI behavior (modes, selections, loading states)
 */

export type AppMode = 'landing' | 'thread';
export type ComposerMode = 'chat' | 'block';

export interface UIState {
  mode: AppMode;
  selectedBlockIds: string[];
  sectionHeadingId: string | null; // Heading ID when in section mode (double-click heading)
  isAwaitingResponse: boolean;
  error: string | null;
}
