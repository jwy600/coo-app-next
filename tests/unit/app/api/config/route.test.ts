import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/config/route";

describe("GET /api/config", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  });

  afterEach(() => {
    if (originalUrl !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    }
    if (originalKey !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    }
  });

  it("should return Supabase config when env vars are set", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-anon-key";

    const request = new NextRequest("http://localhost:3000/api/config");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.supabaseUrl).toBe("https://test.supabase.co");
    expect(body.supabaseAnonKey).toBe("test-anon-key");
  });

  it("should return empty strings when env vars are not set", async () => {
    const request = new NextRequest("http://localhost:3000/api/config");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.supabaseUrl).toBe("");
    expect(body.supabaseAnonKey).toBe("");
  });
});
