/**
 * TypeScript types for Supabase database schema
 * Based on legacy/supabase/schema.sql
 */

export interface DbThread {
  id: string;
  user_id: string;
  title: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface DbMessage {
  id: string;
  user_id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  created_at: string; // ISO timestamp
  meta: Record<string, unknown>;
}

export interface DbBlock {
  id: string;
  user_id: string;
  thread_id: string;
  message_id: string;
  position: number;
  type: 'paragraph' | 'list' | 'code' | 'heading';
  text: string;
  edited: boolean;
  selections: string[]; // JSONB array
  prev_text: string | null;
  is_rewritten: boolean;
}

export interface DbCard {
  id: string;
  user_id: string;
  message_id: string;
  anchor_block_id: string;
  block_ids: string[]; // JSONB array
  created_at: string; // ISO timestamp
}

/**
 * Data structure for persisting a thread snapshot
 */
export interface ThreadPersistData {
  threadId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  message: {
    id: string;
    role: 'user' | 'assistant';
    createdAt: number;
    meta?: Record<string, unknown>;
  };
  blocks: Array<{
    id: string;
    messageId: string;
    type: 'paragraph' | 'list' | 'code' | 'heading';
    text: string;
    edited: boolean;
    selections: string[];
    prevText: string | null;
    isRewritten: boolean;
  }>;
}
