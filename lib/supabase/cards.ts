/**
 * Card CRUD operations for Supabase
 */

import { withSupabaseClient } from './client';
import { DbCard } from './types';
import { Card } from '@/types/card';

/**
 * Load all cards for a thread from Supabase
 * Cards are loaded via their messages, so we need to join through messages
 */
export const loadCardsForThread = async (threadId: string): Promise<Card[]> => {
  return withSupabaseClient(
    async (supabase) => {
      // First get all message IDs for this thread
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('id')
        .eq('thread_id', threadId);

      if (msgError) throw msgError;
      if (!messages || messages.length === 0) return [];

      const messageIds = messages.map((m) => m.id);

      // Then get all cards for those messages
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .in('message_id', messageIds)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data as DbCard[]).map(dbCardToCard);
    },
    [],
    `loading cards for thread ${threadId}`
  );
};

/**
 * Persist a new card to Supabase
 */
export const persistCard = async (card: Card): Promise<void> => {
  return withSupabaseClient(
    async (supabase) => {
      // Get current user for RLS
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('cards').insert({
        id: card.id,
        user_id: user.id,
        message_id: card.messageId,
        anchor_block_id: card.anchorBlockId,
        block_ids: card.blockIds,
        created_at: new Date(card.createdAt).toISOString(),
      });

      if (error) throw error;
    },
    undefined,
    `persisting card ${card.id}`
  );
};

/**
 * Delete a card from Supabase
 */
export const deleteCard = async (cardId: string): Promise<void> => {
  return withSupabaseClient(
    async (supabase) => {
      const { error } = await supabase.from('cards').delete().eq('id', cardId);

      if (error) throw error;
    },
    undefined,
    `deleting card ${cardId}`
  );
};

/**
 * Convert DB card to app card
 */
const dbCardToCard = (dbCard: DbCard): Card => ({
  id: dbCard.id,
  messageId: dbCard.message_id,
  anchorBlockId: dbCard.anchor_block_id,
  blockIds: dbCard.block_ids,
  createdAt: new Date(dbCard.created_at).getTime(),
});
