/**
 * Core State - Persistent data that represents the application's data model
 *
 * This state is:
 * - Persisted to database (threads, blocks, cards)
 * - Essential for data routing (activeThreadId)
 * - The "source of truth" for the application
 */

import { Thread } from '../thread';
import { Block } from '../block';
import { Card } from '../card';

export interface CoreState {
  activeThreadId: string | null;
  threads: Thread[];
  blocks: Block[];
  cards: Card[];
}
