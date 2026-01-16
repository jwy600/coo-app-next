import { apiFetch } from './client';
import type { ConfigResponse } from '@/types/api';

// Cache for config (doesn't change during runtime)
let cachedConfig: ConfigResponse | null = null;

/**
 * Fetch Supabase configuration
 *
 * @returns Promise with Supabase URL and anon key
 * @throws ApiClientError on API errors
 *
 * Note: This function caches the result since config doesn't change
 */
export async function fetchConfig(): Promise<ConfigResponse> {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  // Fetch config
  const config = await apiFetch<ConfigResponse>('/api/config', {
    method: 'GET',
  });

  // Validate config
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('Supabase configuration is incomplete');
  }

  // Cache and return
  cachedConfig = config;
  return config;
}

/**
 * Clear cached config (useful for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}
