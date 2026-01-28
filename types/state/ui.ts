/**
 * UI State - Ephemeral state for user interface
 *
 * This state is:
 * - Not persisted to database (except cards which are saved)
 * - Reset on page refresh
 * - Controls UI behavior (modes, selections, loading states)
 */

export type AppMode = 'landing' | 'thread';
export type ComposerMode = 'chat' | 'block';

/**
 * Card - A visual grouping of blocks for display and export
 *
 * Cards are created by double-clicking the gutter:
 * - For headings: includes heading + all content until next same/higher level heading
 * - For non-headings: includes just that single block
 *
 * Cards are:
 * - Mutually exclusive (blocks can only belong to one card)
 * - Per-message (cannot span multiple messages)
 * - Persisted to database (cascade delete with message)
 * - Independent from block selection (selection is for composer/transform)
 */
export interface Card {
  id: string;
  messageId: string;
  anchorBlockId: string; // Block that was double-clicked to create the card
  blockIds: string[]; // All blocks in this card (computed on creation)
}

export interface UIState {
  mode: AppMode;
  selectedBlockId: string | null; // Single block for composer/transform (null = none)
  cards: Card[]; // Multiple cards for display/export
  isAwaitingResponse: boolean;
  error: string | null;
}
