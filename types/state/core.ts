/**
 * Core State - Persistent data that represents the application's data model
 *
 * This state is:
 * - Persisted to database (threads, blocks)
 * - Essential for data routing (activeThreadId)
 * - The "source of truth" for the application
 */

import { Thread } from '../thread';
import { Block } from '../block';

export interface CoreState {
  activeThreadId: string;
  threads: Thread[];
  blocks: Block[];
}
