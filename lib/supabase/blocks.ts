/**
 * Block CRUD operations for Supabase
 */

import { withSupabaseClient } from './client';
import { DbBlock } from './types';
import { Block } from '@/types/block';

/**
 * Load all blocks for a thread from Supabase
 */
export const loadBlocksForThread = async (threadId: string): Promise<Block[]> => {
  return withSupabaseClient(
    async (supabase) => {
      const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .eq('thread_id', threadId)
        .order('message_id', { ascending: true })
        .order('position', { ascending: true });

      if (error) throw error;

      // Convert DB format to app format
      return (data as DbBlock[]).map(dbBlockToBlock);
    },
    [],
    `loading blocks for thread ${threadId}`
  );
};

/**
 * Persist a single block update (for inline edits, selections, rewrites)
 */
export const persistBlockUpdate = async (block: Block): Promise<void> => {
  return withSupabaseClient(
    async (supabase) => {
      const { error } = await supabase
        .from('blocks')
        .update({
          text: block.text,
          edited: block.edited,
          selections: block.selections,
          prev_text: block.prevText,
          is_rewritten: block.isRewritten,
        })
        .eq('id', block.id);

      if (error) throw error;
    },
    undefined,
    `updating block ${block.id}`
  );
};

/**
 * Convert DB block to app block
 */
const dbBlockToBlock = (dbBlock: DbBlock): Block => ({
  id: dbBlock.id,
  messageId: dbBlock.message_id,
  type: dbBlock.type,
  text: dbBlock.text,
  edited: dbBlock.edited,
  selections: dbBlock.selections,
  prevText: dbBlock.prev_text,
  isRewritten: dbBlock.is_rewritten,
});
