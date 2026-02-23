/**
 * Thread CRUD operations for Supabase
 */

import { withSupabaseClient } from "./client";
import { DbThread, ThreadPersistData } from "./types";
import { Thread } from "@/types/thread";

/**
 * Load all threads from Supabase
 * Returns empty array if Supabase is not configured
 */
export const loadAllThreads = async (): Promise<Thread[]> => {
  return withSupabaseClient(
    async (supabase) => {
      const { data, error } = await supabase
        .from("threads")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Convert DB format to app format
      return (data as DbThread[]).map(dbThreadToThread);
    },
    [],
    "loading threads",
  );
};

/**
 * Load a single thread from Supabase
 */
export const loadThreadFromSupabase = async (
  threadId: string,
): Promise<Thread | null> => {
  return withSupabaseClient(
    async (supabase) => {
      const { data, error } = await supabase
        .from("threads")
        .select("*")
        .eq("id", threadId)
        .single();

      // PGRST116 = .single() returned 0 rows → thread doesn't exist
      if (error && error.code === "PGRST116") {
        return null;
      }
      if (error) throw error;

      return dbThreadToThread(data as DbThread);
    },
    null,
    `loading thread ${threadId}`,
  );
};

/**
 * Persist a complete thread snapshot (thread + message + blocks)
 * Used after user message or assistant message
 */
export const persistThreadSnapshot = async (
  data: ThreadPersistData,
): Promise<void> => {
  return withSupabaseClient(
    async (supabase) => {
      // Get current user for RLS
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Upsert thread
      const { error: threadError } = await supabase.from("threads").upsert({
        id: data.threadId,
        user_id: user.id,
        title: data.title,
        created_at: data.createdAt,
        updated_at: data.updatedAt,
      });

      if (threadError) throw threadError;

      // 2. Insert message
      const { error: messageError } = await supabase.from("messages").insert({
        id: data.message.id,
        user_id: user.id,
        thread_id: data.threadId,
        role: data.message.role,
        created_at: new Date(data.message.createdAt).toISOString(),
        meta: data.message.meta || {},
      });

      if (messageError) throw messageError;

      // 3. Insert blocks
      if (data.blocks.length > 0) {
        const blocksToInsert = data.blocks.map((block, index) => ({
          id: block.id,
          user_id: user.id,
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
          .from("blocks")
          .insert(blocksToInsert);

        if (blocksError) throw blocksError;
      }
    },
    undefined,
    "persisting thread snapshot",
  );
};

/**
 * Update thread metadata (title, updatedAt)
 */
export const updateThreadMetadata = async (
  threadId: string,
  title: string,
  updatedAt: string,
): Promise<void> => {
  return withSupabaseClient(
    async (supabase) => {
      const { error } = await supabase
        .from("threads")
        .update({
          title,
          updated_at: updatedAt,
        })
        .eq("id", threadId);

      if (error) throw error;
    },
    undefined,
    `updating thread metadata for ${threadId}`,
  );
};

/**
 * Delete a thread from Supabase
 * Cascade delete handles removing related messages and blocks automatically
 */
export const deleteThreadFromSupabase = async (
  threadId: string,
): Promise<void> => {
  return withSupabaseClient(
    async (supabase) => {
      const { error } = await supabase
        .from("threads")
        .delete()
        .eq("id", threadId);

      if (error) throw error;
    },
    undefined,
    `deleting thread ${threadId}`,
  );
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
