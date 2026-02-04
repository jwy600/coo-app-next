/**
 * UI State - Ephemeral state for user interface
 *
 * This state is:
 * - Not persisted to database
 * - Reset on page refresh
 * - Controls UI behavior (modes, selections, loading states)
 */

export type AppMode = 'landing' | 'thread';
export type ComposerMode = 'chat' | 'ask' | 'edit';
// - 'chat': No block selected, normal chat mode
// - 'ask': Block selected, asking about it (default when block selected)
// - 'edit': Block selected, directly editing the block

export interface UIState {
  mode: AppMode;
  selectedBlockId: string | null; // Single block for composer/transform (null = none)
  isAwaitingResponse: boolean;
  error: string | null;
}
