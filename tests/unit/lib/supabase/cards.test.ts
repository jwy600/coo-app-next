import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockWithSupabaseClient } = vi.hoisted(() => ({
  mockWithSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  withSupabaseClient: mockWithSupabaseClient,
}));

import {
  loadCardsForThread,
  persistCard,
  deleteCard,
} from "@/lib/supabase/cards";

describe("cards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadCardsForThread", () => {
    it("should load cards by first fetching message IDs", async () => {
      const dbCards = [
        {
          id: "card-1",
          user_id: "u1",
          message_id: "msg-1",
          anchor_block_id: "b1",
          block_ids: ["b1", "b2"],
          created_at: "2025-01-01T00:00:00Z",
        },
      ];

      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          from: vi.fn().mockImplementation((table: string) => {
            if (table === "messages") {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: [{ id: "msg-1" }, { id: "msg-2" }],
                    error: null,
                  }),
                }),
              };
            }
            // cards table
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  order: vi
                    .fn()
                    .mockResolvedValue({ data: dbCards, error: null }),
                }),
              }),
            };
          }),
        };
        return op(mockSupabase);
      });

      const result = await loadCardsForThread("t1");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("card-1");
      expect(result[0].messageId).toBe("msg-1");
      expect(result[0].anchorBlockId).toBe("b1");
      expect(result[0].blockIds).toEqual(["b1", "b2"]);
      expect(typeof result[0].createdAt).toBe("number");
    });

    it("should return empty array when no messages exist", async () => {
      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
        return op(mockSupabase);
      });

      const result = await loadCardsForThread("t1");
      expect(result).toEqual([]);
    });

    it("should return empty array when messages is null", async () => {
      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
        return op(mockSupabase);
      });

      const result = await loadCardsForThread("t1");
      expect(result).toEqual([]);
    });

    it("should throw on messages query error", async () => {
      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Messages query failed" },
              }),
            }),
          }),
        };
        return op(mockSupabase);
      });

      await expect(loadCardsForThread("t1")).rejects.toEqual({
        message: "Messages query failed",
      });
    });

    it("should throw on cards query error", async () => {
      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          from: vi.fn().mockImplementation((table: string) => {
            if (table === "messages") {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: [{ id: "msg-1" }],
                    error: null,
                  }),
                }),
              };
            }
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: "Cards query failed" },
                  }),
                }),
              }),
            };
          }),
        };
        return op(mockSupabase);
      });

      await expect(loadCardsForThread("t1")).rejects.toEqual({
        message: "Cards query failed",
      });
    });
  });

  describe("persistCard", () => {
    it("should insert card with user ID", async () => {
      const insertFn = vi.fn().mockResolvedValue({ error: null });

      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          auth: {
            getUser: vi
              .fn()
              .mockResolvedValue({ data: { user: { id: "user-1" } } }),
          },
          from: vi.fn().mockReturnValue({ insert: insertFn }),
        };
        return op(mockSupabase);
      });

      const card = {
        id: "card-1",
        messageId: "msg-1",
        anchorBlockId: "b1",
        blockIds: ["b1", "b2"],
        createdAt: Date.now(),
      };

      await persistCard(card);

      expect(insertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "card-1",
          user_id: "user-1",
          message_id: "msg-1",
          anchor_block_id: "b1",
          block_ids: ["b1", "b2"],
        }),
      );
    });

    it("should throw when not authenticated", async () => {
      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          auth: {
            getUser: vi
              .fn()
              .mockResolvedValue({ data: { user: null } }),
          },
        };
        return op(mockSupabase);
      });

      const card = {
        id: "card-1",
        messageId: "msg-1",
        anchorBlockId: "b1",
        blockIds: ["b1"],
        createdAt: Date.now(),
      };

      await expect(persistCard(card)).rejects.toThrow("Not authenticated");
    });

    it("should throw on insert error", async () => {
      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          auth: {
            getUser: vi
              .fn()
              .mockResolvedValue({ data: { user: { id: "user-1" } } }),
          },
          from: vi.fn().mockReturnValue({
            insert: vi
              .fn()
              .mockResolvedValue({ error: { message: "Insert failed" } }),
          }),
        };
        return op(mockSupabase);
      });

      const card = {
        id: "card-1",
        messageId: "msg-1",
        anchorBlockId: "b1",
        blockIds: ["b1"],
        createdAt: Date.now(),
      };

      await expect(persistCard(card)).rejects.toEqual({
        message: "Insert failed",
      });
    });
  });

  describe("deleteCard", () => {
    it("should delete card by ID", async () => {
      const eqFn = vi.fn().mockResolvedValue({ error: null });

      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          from: vi.fn().mockReturnValue({
            delete: vi.fn().mockReturnValue({ eq: eqFn }),
          }),
        };
        return op(mockSupabase);
      });

      await deleteCard("card-1");

      expect(eqFn).toHaveBeenCalledWith("id", "card-1");
    });

    it("should throw on delete error", async () => {
      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          from: vi.fn().mockReturnValue({
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: { message: "Delete failed" },
              }),
            }),
          }),
        };
        return op(mockSupabase);
      });

      await expect(deleteCard("card-1")).rejects.toEqual({
        message: "Delete failed",
      });
    });
  });
});
