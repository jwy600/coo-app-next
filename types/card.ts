/**
 * Card - A user's annotation marking important content in a thread
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
  blockIds: string[]; // All blocks in this card (computed on creation, stored for consistency)
  createdAt: number; // Timestamp in milliseconds
}
