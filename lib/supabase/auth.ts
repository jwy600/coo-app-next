/**
 * Authentication helper functions for Supabase Auth
 * Client-side functions for login, signup, and logout
 */

import { getSupabaseClient } from './client';

export interface AuthResult {
  success: boolean;
  error?: string;
}

/**
 * Sign in with email and password
 */
export const signIn = async (email: string, password: string): Promise<AuthResult> => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { success: false, error: 'Supabase is not configured' };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<AuthResult> => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { success: false, error: 'Supabase is not configured' };
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
};

