/**
 * Thread CRUD operations for Supabase
 */

import { getSupabaseClient } from './client';
import { DbThread, ThreadPersistData } from './types';
import { Thread } from '@/types/thread';

/**
 * Load all threads from Supabase
 * Returns empty array if Supabase is not configured
 */
export const loadAllThreads = async (): Promise<Thread[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('threads')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading threads:', error);
      return [];
    }

    // Convert DB format to app format
    return (data as DbThread[]).map(dbThreadToThread);
  } catch (error) {
    console.error('Exception loading threads:', error);
    return [];
  }
};

/**
 * Load a single thread from Supabase
 */
export const loadThreadFromSupabase = async (threadId: string): Promise<Thread | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('threads')
      .select('*')
      .eq('id', threadId)
      .single();

    if (error) {
      console.error('Error loading thread:', error);
      return null;
    }

    return dbThreadToThread(data as DbThread);
  } catch (error) {
    console.error('Exception loading thread:', error);
    return null;
  }
};

/**
 * Persist a complete thread snapshot (thread + message + blocks)
 * Used after user message or assistant message
 */
export const persistThreadSnapshot = async (data: ThreadPersistData): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  try {
    // 1. Upsert thread
    const { error: threadError } = await supabase
      .from('threads')
      .upsert({
        id: data.threadId,
        title: data.title,
        created_at: data.createdAt,
        updated_at: data.updatedAt,
      });

    if (threadError) {
      console.error('Error persisting thread:', threadError);
      return;
    }

    // 2. Insert message
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        id: data.message.id,
        thread_id: data.threadId,
        role: data.message.role,
        created_at: new Date(data.message.createdAt).toISOString(),
        meta: data.message.meta || {},
      });

    if (messageError) {
      console.error('Error persisting message:', messageError);
      return;
    }

    // 3. Insert blocks
    if (data.blocks.length > 0) {
      const blocksToInsert = data.blocks.map((block, index) => ({
        id: block.id,
        thread_id: data.threadId,
        message_id: block.messageId,
        position: index,
        type: block.type,
        text: block.text,
        edited: block.edited,
        selections: block.selections,
        prev_text: block.prevText,
        is_rewritten: block.isRewritten,
      }));

      const { error: blocksError } = await supabase
        .from('blocks')
        .insert(blocksToInsert);

      if (blocksError) {
        console.error('Error persisting blocks:', blocksError);
      }
    }
  } catch (error) {
    console.error('Exception persisting thread snapshot:', error);
  }
};

/**
 * Update thread metadata (title, updatedAt)
 */
export const updateThreadMetadata = async (
  threadId: string,
  title: string,
  updatedAt: string
): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  try {
    const { error } = await supabase
      .from('threads')
      .update({
        title,
        updated_at: updatedAt,
      })
      .eq('id', threadId);

    if (error) {
      console.error('Error updating thread metadata:', error);
    }
  } catch (error) {
    console.error('Exception updating thread metadata:', error);
  }
};

/**
 * Convert DB thread to app thread
 */
const dbThreadToThread = (dbThread: DbThread): Thread => ({
  id: dbThread.id,
  title: dbThread.title,
  createdAt: new Date(dbThread.created_at).getTime(),
  updatedAt: new Date(dbThread.updated_at).getTime(),
  messages: [], // Messages loaded separately
});
