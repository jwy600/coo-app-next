/**
 * Block CRUD operations for Supabase
 */

import { getSupabaseClient } from './client';
import { DbBlock } from './types';
import { Block } from '@/types/block';

/**
 * Load all blocks for a thread from Supabase
 */
export const loadBlocksForThread = async (threadId: string): Promise<Block[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('blocks')
      .select('*')
      .eq('thread_id', threadId)
      .order('message_id', { ascending: true })
      .order('position', { ascending: true });

    if (error) {
      console.error('Error loading blocks:', error);
      return [];
    }

    // Convert DB format to app format
    return (data as DbBlock[]).map(dbBlockToBlock);
  } catch (error) {
    console.error('Exception loading blocks:', error);
    return [];
  }
};

/**
 * Persist a single block update (for inline edits, selections, rewrites)
 */
export const persistBlockUpdate = async (block: Block): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  try {
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

    if (error) {
      console.error('Error updating block:', error);
    }
  } catch (error) {
    console.error('Exception updating block:', error);
  }
};

/**
 * Persist multiple blocks at once (used by persistThreadSnapshot)
 * This is a lower-level function not typically called directly
 */
export const persistBlocks = async (
  blocks: Block[],
  threadId: string
): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  try {
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

    if (error) {
      console.error('Error persisting blocks:', error);
    }
  } catch (error) {
    console.error('Exception persisting blocks:', error);
  }
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
