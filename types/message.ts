export type MessageRole = 'user' | 'assistant';

/**
 * Origin of an assistant message. `'import'` marks a markdown file the user
 * uploaded — registered with the API once, then treated like a streamed reply.
 */
export type MessageSource = 'import';

/**
 * Registration lifecycle for an imported doc.
 * - `'registering'` — sent to the API, awaiting the `responseId` that makes it
 *   a usable chain root (Send stays muted, marker reads "Embedding…").
 * - `'registered'` — `meta.openaiResponseId` captured; chat/ask chain from it.
 */
export type RegisterState = 'registering' | 'registered';

export interface Message {
  id: string;
  threadId: string;
  role: MessageRole;
  text: string;
  createdAt: number;
  meta: Record<string, unknown>;
}
