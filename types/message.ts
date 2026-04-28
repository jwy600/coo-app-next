export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  threadId: string;
  role: MessageRole;
  text: string;
  createdAt: number;
  meta: Record<string, unknown>;
}
