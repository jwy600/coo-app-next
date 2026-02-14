import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isOfflineMode } from "@/lib/utils/offlineMode";

describe("isOfflineMode", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns true when no Supabase env vars set", () => {
    expect(isOfflineMode()).toBe(true);
  });

  it("returns true when only URL is set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(isOfflineMode()).toBe(true);
  });

  it("returns true when only key is set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "some-key";
    expect(isOfflineMode()).toBe(true);
  });

  it("returns false when both URL and key are set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "some-key";
    expect(isOfflineMode()).toBe(false);
  });

  it("accepts fallback env var names", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "some-key";
    expect(isOfflineMode()).toBe(false);
  });
});
