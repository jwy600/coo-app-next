export type BlockType = 'paragraph' | 'list' | 'code';

export interface Block {
  id: string;
  messageId: string;
  type: BlockType;
  text: string;
  edited: boolean;
  selections: string[];
  prevText: string | null;
  isRewritten: boolean;
}

export interface BlockData {
  text: string;
  type: BlockType;
}
