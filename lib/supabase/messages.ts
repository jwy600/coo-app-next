/**
 * Message CRUD operations for Supabase
 */

import { getSupabaseClient } from './client';
import { DbMessage } from './types';
import { Message } from '@/types/message';

/**
 * Load all messages for a thread from Supabase
 */
export const loadMessagesForThread = async (threadId: string): Promise<Message[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return [];
    }

    // Convert DB format to app format
    return (data as DbMessage[]).map(dbMessageToMessage);
  } catch (error) {
    console.error('Exception loading messages:', error);
    return [];
  }
};

/**
 * Persist a single message (used by persistThreadSnapshot in threads.ts)
 * This is a lower-level function not typically called directly
 */
export const persistMessage = async (
  message: Message,
  threadId: string
): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  try {
    const { error } = await supabase
      .from('messages')
      .insert({
        id: message.id,
        thread_id: threadId,
        role: message.role,
        created_at: new Date(message.createdAt).toISOString(),
        meta: message.meta || {},
      });

    if (error) {
      console.error('Error persisting message:', error);
    }
  } catch (error) {
    console.error('Exception persisting message:', error);
  }
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
