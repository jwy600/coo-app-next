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
 * Persist multiple blocks at once (used by persistThreadSnapshot)
 * This is a lower-level function not typically called directly
 */
export const persistBlocks = async (
  blocks: Block[],
  threadId: string
): Promise<void> => {
  return withSupabaseClient(
    async (supabase) => {
      const blocksToInsert = blocks.map((block, index) => ({
        id: block.id,
        thread_id: threadId,
        message_id: block.messageId,
        position: index,
        type: block.type,
        text: block.text,
        edited: block.edited,
        selections: block.selections,
        prev_text: block.prevText,
        is_rewritten: block.isRewritten,
      }));

      const { error } = await supabase
        .from('blocks')
        .insert(blocksToInsert);

      if (error) throw error;
    },
    undefined,
    `persisting ${blocks.length} blocks for thread ${threadId}`
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
