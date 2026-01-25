/**
 * Offline mode detection utilities
 *
 * Re-exports the isSupabaseConfigured check from the Supabase client
 * for use in UI components that need to show offline warnings.
 */

export { isSupabaseConfigured } from '@/lib/supabase/client';

/**
 * Check if the app is running in offline mode (no Supabase configured)
 * This is the inverse of isSupabaseConfigured for semantic clarity in UI code.
 */
export const isOfflineMode = (): boolean => {
  // Check environment variables directly to avoid circular dependencies
  // with the Supabase client initialization
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  return !supabaseUrl || !supabaseKey;
};
