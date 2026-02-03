'use client';

/**
 * Hook to get current authentication state
 * In test mode (env var only), returns authenticated state to bypass login
 */

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Check if running in test mode via environment variable only.
 * Unlike isTestMode(), this does NOT check window.__TEST_MODE__
 * to prevent client-side auth bypass attacks.
 */
const isTestModeEnvOnly = (): boolean => {
  return process.env.NEXT_PUBLIC_TEST_MODE === 'true';
};

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In test mode (env var only - cannot be set by client), simulate authenticated state
    if (isTestModeEnvOnly()) {
      setUser({ id: 'test-user-id', email: 'test@example.com' } as User);
      setIsLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsLoading(false);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
