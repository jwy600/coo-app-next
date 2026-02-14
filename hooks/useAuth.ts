"use client";

/**
 * Hook to get current authentication state
 * In test mode (env var only), returns authenticated state to bypass login
 */

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

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
  return process.env.NEXT_PUBLIC_TEST_MODE === "true";
};

export function useAuth(): AuthState {
  const testMode = isTestModeEnvOnly();
  const supabase = testMode ? null : getSupabaseClient();
  const [user, setUser] = useState<User | null>(
    testMode
      ? ({ id: "test-user-id", email: "test@example.com" } as User)
      : null,
  );
  const [isLoading, setIsLoading] = useState(!!supabase);

  useEffect(() => {
    if (!supabase) return;

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
  }, [supabase]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
