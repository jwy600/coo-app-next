import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockWithSupabaseClient } = vi.hoisted(() => ({
  mockWithSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  withSupabaseClient: mockWithSupabaseClient,
}));

import { loadMessagesForThread } from "@/lib/supabase/messages";

describe("messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadMessagesForThread", () => {
    it("should load and convert messages for a thread", async () => {
      const dbMessages = [
        {
          id: "msg-1",
          user_id: "u1",
          thread_id: "t1",
          role: "user",
          created_at: "2025-01-01T00:00:00Z",
          meta: { openaiResponseId: "resp-1" },
        },
        {
          id: "msg-2",
          user_id: "u1",
          thread_id: "t1",
          role: "assistant",
          created_at: "2025-01-01T00:01:00Z",
          meta: {},
        },
      ];

      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi
                  .fn()
                  .mockResolvedValue({ data: dbMessages, error: null }),
              }),
            }),
          }),
        };
        return op(mockSupabase);
      });

      const result = await loadMessagesForThread("t1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("msg-1");
      expect(result[0].threadId).toBe("t1");
      expect(result[0].role).toBe("user");
      expect(result[0].content).toEqual([]);
      expect(result[0].meta).toEqual({ openaiResponseId: "resp-1" });
      expect(typeof result[0].createdAt).toBe("number");
    });

    it("should handle messages with null meta", async () => {
      const dbMessages = [
        {
          id: "msg-1",
          user_id: "u1",
          thread_id: "t1",
          role: "user",
          created_at: "2025-01-01T00:00:00Z",
          meta: null,
        },
      ];

      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi
                  .fn()
                  .mockResolvedValue({ data: dbMessages, error: null }),
              }),
            }),
          }),
        };
        return op(mockSupabase);
      });

      const result = await loadMessagesForThread("t1");

      expect(result[0].meta).toEqual({});
    });

    it("should throw on query error", async () => {
      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "Query failed" },
                }),
              }),
            }),
          }),
        };
        return op(mockSupabase);
      });

      await expect(loadMessagesForThread("t1")).rejects.toEqual({
        message: "Query failed",
      });
    });
  });
});
