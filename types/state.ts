import { Thread } from './thread';
import { Block } from './block';

export type AppMode = 'landing' | 'thread';
export type ComposerMode = 'chat' | 'block';

export interface AppState {
  mode: AppMode;
  selectedBlockIds: string[];
  hasInitialResponse: boolean;
  activeThreadId: string;
  threads: Thread[];
  blocks: Block[];
}
