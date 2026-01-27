/**
 * Supabase client initialization
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client
 * Returns null if environment variables are not configured
 */
export const getSupabaseClient = (): SupabaseClient | null => {
  // Return cached client
  if (supabaseClient) {
    return supabaseClient;
  }

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase configuration missing. Database operations will not work.');
    return null;
  }

  // Create and cache client
  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false, // No auth for now
    },
  });

  return supabaseClient;
};

/**
 * Check if Supabase is configured
 */
export const isSupabaseConfigured = (): boolean => {
  return getSupabaseClient() !== null;
};

/**
 * Execute a Supabase operation with automatic client check and error handling
 *
 * @param operation - Async function that receives the Supabase client
 * @param fallbackValue - Value to return if client is not available or operation fails
 * @param errorContext - Context string for error logging
 * @returns The result of the operation or the fallback value
 *
 * @example
 * const threads = await withSupabaseClient(
 *   async (client) => {
 *     const { data, error } = await client.from('threads').select('*');
 *     if (error) throw error;
 *     return data;
 *   },
 *   [],
 *   'loading threads'
 * );
 */
export const withSupabaseClient = async <T>(
  operation: (client: SupabaseClient) => Promise<T>,
  fallbackValue: T,
  errorContext: string
): Promise<T> => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return fallbackValue;
  }

  try {
    return await operation(supabase);
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null
        ? JSON.stringify(error)
        : String(error);
    console.error(`Error ${errorContext}: ${errorMessage}`);
    return fallbackValue;
  }
};
