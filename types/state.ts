import { Thread } from './thread';
import { Block } from './block';

export type AppMode = 'landing' | 'chat';

export interface AppState {
  mode: AppMode;
  selectedBlockId: string | null;
  hasInitialResponse: boolean;
  activeThreadId: string;
  threads: Thread[];
  blocks: Block[];
}
