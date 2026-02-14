import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockWithSupabaseClient } = vi.hoisted(() => ({
  mockWithSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  withSupabaseClient: mockWithSupabaseClient,
}));

import {
  loadBlocksForThread,
  persistBlockUpdate,
} from "@/lib/supabase/blocks";

describe("blocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadBlocksForThread", () => {
    it("should load and convert blocks for a thread", async () => {
      const dbBlocks = [
        {
          id: "b1",
          user_id: "u1",
          thread_id: "t1",
          message_id: "msg-1",
          position: 0,
          type: "paragraph",
          text: "Hello world",
          edited: false,
          selections: ["world"],
          prev_text: null,
          is_rewritten: false,
        },
        {
          id: "b2",
          user_id: "u1",
          thread_id: "t1",
          message_id: "msg-1",
          position: 1,
          type: "code",
          text: "console.log('hi')",
          edited: true,
          selections: [],
          prev_text: "console.log('hello')",
          is_rewritten: true,
        },
      ];

      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  order: vi
                    .fn()
                    .mockResolvedValue({ data: dbBlocks, error: null }),
                }),
              }),
            }),
          }),
        };
        return op(mockSupabase);
      });

      const result = await loadBlocksForThread("t1");

      expect(result).toHaveLength(2);

      // First block
      expect(result[0].id).toBe("b1");
      expect(result[0].messageId).toBe("msg-1");
      expect(result[0].type).toBe("paragraph");
      expect(result[0].text).toBe("Hello world");
      expect(result[0].selections).toEqual(["world"]);
      expect(result[0].prevText).toBeNull();
      expect(result[0].isRewritten).toBe(false);

      // Second block (rewritten)
      expect(result[1].id).toBe("b2");
      expect(result[1].edited).toBe(true);
      expect(result[1].prevText).toBe("console.log('hello')");
      expect(result[1].isRewritten).toBe(true);
    });

    it("should throw on query error", async () => {
      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Blocks query failed" },
                  }),
                }),
              }),
            }),
          }),
        };
        return op(mockSupabase);
      });

      await expect(loadBlocksForThread("t1")).rejects.toEqual({
        message: "Blocks query failed",
      });
    });
  });

  describe("persistBlockUpdate", () => {
    it("should update block fields", async () => {
      const updateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          from: vi.fn().mockReturnValue({ update: updateFn }),
        };
        return op(mockSupabase);
      });

      const block = {
        id: "b1",
        messageId: "msg-1",
        type: "paragraph" as const,
        text: "Updated text",
        edited: true,
        selections: ["text"],
        prevText: "Original text",
        isRewritten: true,
      };

      await persistBlockUpdate(block);

      expect(updateFn).toHaveBeenCalledWith({
        text: "Updated text",
        edited: true,
        selections: ["text"],
        prev_text: "Original text",
        is_rewritten: true,
      });
    });

    it("should throw on update error", async () => {
      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          from: vi.fn().mockReturnValue({
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: { message: "Update failed" },
              }),
            }),
          }),
        };
        return op(mockSupabase);
      });

      const block = {
        id: "b1",
        messageId: "msg-1",
        type: "paragraph" as const,
        text: "text",
        edited: false,
        selections: [],
        prevText: null,
        isRewritten: false,
      };

      await expect(persistBlockUpdate(block)).rejects.toEqual({
        message: "Update failed",
      });
    });
  });
});
