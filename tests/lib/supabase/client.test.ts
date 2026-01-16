/**
 * Tests for Supabase client initialization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the environment variables before importing
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-key');

// Mock @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(),
  })),
}));

import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { createClient } from '@supabase/supabase-js';

describe('Supabase Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create client with environment variables', () => {
    const client = getSupabaseClient();

    expect(client).toBeDefined();
    expect(createClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-key',
      expect.objectContaining({
        auth: {
          persistSession: false,
        },
      })
    );
  });

  it('should return cached client on subsequent calls', () => {
    const client1 = getSupabaseClient();
    const client2 = getSupabaseClient();

    expect(client1).toBe(client2);
    // createClient should only be called once (from previous test or this one)
  });

  it('should report configuration status', () => {
    expect(isSupabaseConfigured()).toBe(true);
  });
});

describe('Supabase Client - Missing Config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the cached client by reimporting
    vi.resetModules();
  });

  it('should return null when environment variables are missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');

    // Re-import to get fresh module state
    const { getSupabaseClient: getClient } = await import('@/lib/supabase/client');

    const client = getClient();
    expect(client).toBeNull();
  });
});
