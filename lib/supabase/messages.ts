/**
 * Message CRUD operations for Supabase
 */

import { withSupabaseClient } from './client';
import { DbMessage } from './types';
import { Message } from '@/types/message';

/**
 * Load all messages for a thread from Supabase
 */
export const loadMessagesForThread = async (threadId: string): Promise<Message[]> => {
  return withSupabaseClient(
    async (supabase) => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Convert DB format to app format
      return (data as DbMessage[]).map(dbMessageToMessage);
    },
    [],
    `loading messages for thread ${threadId}`
  );
};

/**
 * Persist a single message (used by persistThreadSnapshot in threads.ts)
 * This is a lower-level function not typically called directly
 */
export const persistMessage = async (
  message: Message,
  threadId: string
): Promise<void> => {
  return withSupabaseClient(
    async (supabase) => {
      const { error } = await supabase
        .from('messages')
        .insert({
          id: message.id,
          thread_id: threadId,
          role: message.role,
          created_at: new Date(message.createdAt).toISOString(),
          meta: message.meta || {},
        });

      if (error) throw error;
    },
    undefined,
    `persisting message ${message.id}`
  );
};

/**
 * Convert DB message to app message
 * Note: content (blockIds) must be populated separately by loading blocks
 */
const dbMessageToMessage = (dbMessage: DbMessage): Message => ({
  id: dbMessage.id,
  threadId: dbMessage.thread_id,
  role: dbMessage.role,
  createdAt: new Date(dbMessage.created_at).getTime(),
  content: [], // Populated by caller using blocks
  meta: dbMessage.meta || {},
});
