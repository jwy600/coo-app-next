import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/config/route';
import { NextRequest } from 'next/server';
import { setupTestEnv, clearTestEnv } from './setup';

describe('Config API Route', () => {
  beforeEach(() => {
    setupTestEnv();
  });

  afterEach(() => {
    clearTestEnv();
  });

  it('should return Supabase configuration', async () => {
    const request = new NextRequest('http://localhost:3000/api/config');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-anon-key',
    });
  });

  it('should return empty strings when env vars are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const request = new NextRequest('http://localhost:3000/api/config');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      supabaseUrl: '',
      supabaseAnonKey: '',
    });
  });

  it('should handle partial configuration', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const request = new NextRequest('http://localhost:3000/api/config');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: '',
    });
  });
});
