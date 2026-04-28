/**
 * Core State - Persistent data that represents the application's data model.
 */

import { Thread } from '../thread';

export interface CoreState {
  activeThreadId: string | null;
  threads: Thread[];
}
