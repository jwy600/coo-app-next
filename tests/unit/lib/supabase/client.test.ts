import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock createBrowserClient before any imports
const { mockCreateBrowserClient } = vi.hoisted(() => ({
  mockCreateBrowserClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: mockCreateBrowserClient,
}));

describe("supabase client", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  beforeEach(() => {
    // Reset module to clear the cached client singleton
    vi.resetModules();
    vi.clearAllMocks();

    // Reset env vars
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
  });

  afterEach(() => {
    // Restore original env
    if (originalUrl !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    }
    if (originalKey !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
    }
  });

  describe("getSupabaseClient", () => {
    it("should return null when env vars are not set", async () => {
      const { getSupabaseClient } = await import("@/lib/supabase/client");
      const result = getSupabaseClient();
      expect(result).toBeNull();
    });

    it("should create client when both env vars are set", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

      const mockClient = { auth: {} };
      mockCreateBrowserClient.mockReturnValue(mockClient);

      const { getSupabaseClient } = await import("@/lib/supabase/client");
      const result = getSupabaseClient();

      expect(result).toBe(mockClient);
      expect(mockCreateBrowserClient).toHaveBeenCalledWith(
        "https://test.supabase.co",
        "test-key",
      );
    });

    it("should return cached client on second call", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

      const mockClient = { auth: {} };
      mockCreateBrowserClient.mockReturnValue(mockClient);

      const { getSupabaseClient } = await import("@/lib/supabase/client");
      const first = getSupabaseClient();
      const second = getSupabaseClient();

      expect(first).toBe(second);
      expect(mockCreateBrowserClient).toHaveBeenCalledTimes(1);
    });

    it("should fall back to SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY", async () => {
      process.env.SUPABASE_URL = "https://fallback.supabase.co";
      process.env.SUPABASE_PUBLISHABLE_KEY = "fallback-key";

      const mockClient = { auth: {} };
      mockCreateBrowserClient.mockReturnValue(mockClient);

      const { getSupabaseClient } = await import("@/lib/supabase/client");
      const result = getSupabaseClient();

      expect(result).toBe(mockClient);
      expect(mockCreateBrowserClient).toHaveBeenCalledWith(
        "https://fallback.supabase.co",
        "fallback-key",
      );
    });
  });

  describe("isSupabaseConfigured", () => {
    it("should return false when env vars are not set", async () => {
      const { isSupabaseConfigured } = await import("@/lib/supabase/client");
      expect(isSupabaseConfigured()).toBe(false);
    });

    it("should return true when env vars are set", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

      mockCreateBrowserClient.mockReturnValue({ auth: {} });

      const { isSupabaseConfigured } = await import("@/lib/supabase/client");
      expect(isSupabaseConfigured()).toBe(true);
    });
  });

  describe("withSupabaseClient", () => {
    it("should return fallback when client is not configured", async () => {
      const { withSupabaseClient } = await import("@/lib/supabase/client");

      const result = await withSupabaseClient(
        async () => "should not reach",
        "fallback",
        "test operation",
      );

      expect(result).toBe("fallback");
    });

    it("should execute operation with client when configured", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

      const mockClient = { auth: {}, from: vi.fn() };
      mockCreateBrowserClient.mockReturnValue(mockClient);

      const { withSupabaseClient } = await import("@/lib/supabase/client");

      const result = await withSupabaseClient(
        async (client) => {
          expect(client).toBe(mockClient);
          return "success";
        },
        "fallback",
        "test operation",
      );

      expect(result).toBe("success");
    });

    it("should return fallback and log error when operation throws Error", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

      mockCreateBrowserClient.mockReturnValue({ auth: {} });
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { withSupabaseClient } = await import("@/lib/supabase/client");

      const result = await withSupabaseClient(
        async () => {
          throw new Error("DB connection failed");
        },
        "fallback",
        "test operation",
      );

      expect(result).toBe("fallback");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("DB connection failed"),
      );
      consoleSpy.mockRestore();
    });

    it("should handle non-Error object throws", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

      mockCreateBrowserClient.mockReturnValue({ auth: {} });
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { withSupabaseClient } = await import("@/lib/supabase/client");

      const result = await withSupabaseClient(
        async () => {
          throw { code: "23505", message: "duplicate key" };
        },
        [],
        "test operation",
      );

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("duplicate key"),
      );
      consoleSpy.mockRestore();
    });

    it("should handle string throws", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

      mockCreateBrowserClient.mockReturnValue({ auth: {} });
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { withSupabaseClient } = await import("@/lib/supabase/client");

      const result = await withSupabaseClient(
        async () => {
          throw "string error";
        },
        null,
        "test",
      );

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("string error"),
      );
      consoleSpy.mockRestore();
    });
  });
});
