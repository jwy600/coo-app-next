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

/**
 * Get the current session (client-side)
 */
export const getSession = async () => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
};

/**
 * Get the current user (client-side)
 */
export const getUser = async () => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
};

/**
 * Subscribe to auth state changes
 */
export const onAuthStateChange = (callback: (event: string, session: unknown) => void) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }

  return supabase.auth.onAuthStateChange(callback);
};
