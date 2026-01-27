import { Thread } from './thread';
import { Block } from './block';

export type AppMode = 'landing' | 'thread';
export type ComposerMode = 'chat' | 'block';

export interface AppState {
  mode: AppMode;
  selectedBlockIds: string[];
  sectionHeadingId: string | null; // Heading ID when in section mode (double-click heading)
  isSelectionOutsideSection: boolean; // True when selected block is outside current section
  hasInitialResponse: boolean;
  activeThreadId: string;
  threads: Thread[];
  blocks: Block[];
}
