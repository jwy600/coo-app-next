export type MessageRole = 'user' | 'assistant';

export interface MessageContent {
  blockId: string;
}

export interface Message {
  id: string;
  threadId: string;
  role: MessageRole;
  createdAt: number;
  content: MessageContent[];
  meta: Record<string, unknown>;
}
