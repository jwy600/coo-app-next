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
