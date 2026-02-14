import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSupabaseClient } = vi.hoisted(() => ({
  mockGetSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: mockGetSupabaseClient,
}));

import { signIn, signOut } from "@/lib/supabase/auth";

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signIn", () => {
    it("should return error when Supabase is not configured", async () => {
      mockGetSupabaseClient.mockReturnValue(null);

      const result = await signIn("test@example.com", "password");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Supabase is not configured");
    });

    it("should return success on valid login", async () => {
      const mockClient = {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
        },
      };
      mockGetSupabaseClient.mockReturnValue(mockClient);

      const result = await signIn("test@example.com", "password123");

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });

    it("should return error on invalid credentials", async () => {
      const mockClient = {
        auth: {
          signInWithPassword: vi
            .fn()
            .mockResolvedValue({ error: { message: "Invalid credentials" } }),
        },
      };
      mockGetSupabaseClient.mockReturnValue(mockClient);

      const result = await signIn("test@example.com", "wrong");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid credentials");
    });
  });

  describe("signOut", () => {
    it("should return error when Supabase is not configured", async () => {
      mockGetSupabaseClient.mockReturnValue(null);

      const result = await signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Supabase is not configured");
    });

    it("should return success on sign out", async () => {
      const mockClient = {
        auth: {
          signOut: vi.fn().mockResolvedValue({ error: null }),
        },
      };
      mockGetSupabaseClient.mockReturnValue(mockClient);

      const result = await signOut();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return error when sign out fails", async () => {
      const mockClient = {
        auth: {
          signOut: vi
            .fn()
            .mockResolvedValue({ error: { message: "Session expired" } }),
        },
      };
      mockGetSupabaseClient.mockReturnValue(mockClient);

      const result = await signOut();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Session expired");
    });
  });
});
