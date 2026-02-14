import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockWithSupabaseClient } = vi.hoisted(() => ({
  mockWithSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  withSupabaseClient: mockWithSupabaseClient,
}));

import {
  loadAllThreads,
  loadThreadFromSupabase,
  persistThreadSnapshot,
  updateThreadMetadata,
  deleteThreadFromSupabase,
} from "@/lib/supabase/threads";

describe("threads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadAllThreads", () => {
    it("should load and convert threads", async () => {
      const dbThreads = [
        {
          id: "t1",
          user_id: "u1",
          title: "Thread 1",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-02T00:00:00Z",
        },
      ];

      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              order: vi
                .fn()
                .mockResolvedValue({ data: dbThreads, error: null }),
            }),
          }),
        };
        return op(mockSupabase);
      });

      const result = await loadAllThreads();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("t1");
      expect(result[0].title).toBe("Thread 1");
      expect(result[0].messages).toEqual([]);
      expect(typeof result[0].createdAt).toBe("number");
    });

    it("should throw on query error", async () => {
      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Query failed" },
              }),
            }),
          }),
        };
        return op(mockSupabase);
      });

      await expect(loadAllThreads()).rejects.toEqual({
        message: "Query failed",
      });
    });
  });

  describe("loadThreadFromSupabase", () => {
    it("should load a single thread by ID", async () => {
      const dbThread = {
        id: "t1",
        user_id: "u1",
        title: "My Thread",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-02T00:00:00Z",
      };

      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: dbThread, error: null }),
              }),
            }),
          }),
        };
        return op(mockSupabase);
      });

      const result = await loadThreadFromSupabase("t1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("t1");
      expect(result!.title).toBe("My Thread");
    });
  });

  describe("persistThreadSnapshot", () => {
    it("should upsert thread, insert message, and insert blocks", async () => {
      const upsertFn = vi.fn().mockResolvedValue({ error: null });
      const insertFn = vi.fn().mockResolvedValue({ error: null });

      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          auth: {
            getUser: vi
              .fn()
              .mockResolvedValue({ data: { user: { id: "user-1" } } }),
          },
          from: vi.fn().mockImplementation((table: string) => {
            if (table === "threads") {
              return { upsert: upsertFn };
            }
            return { insert: insertFn };
          }),
        };
        return op(mockSupabase);
      });

      const data = {
        threadId: "t1",
        title: "Test",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        message: {
          id: "msg-1",
          role: "user" as const,
          createdAt: Date.now(),
          meta: {},
        },
        blocks: [
          {
            id: "b1",
            messageId: "msg-1",
            type: "paragraph" as const,
            text: "Hello",
            edited: false,
            selections: [],
            prevText: null,
            isRewritten: false,
          },
        ],
      };

      await persistThreadSnapshot(data);

      expect(upsertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "t1",
          user_id: "user-1",
          title: "Test",
        }),
      );
      // insert called for messages and blocks
      expect(insertFn).toHaveBeenCalledTimes(2);
    });

    it("should throw when user is not authenticated", async () => {
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

      const data = {
        threadId: "t1",
        title: "Test",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        message: {
          id: "msg-1",
          role: "user" as const,
          createdAt: Date.now(),
        },
        blocks: [],
      };

      await expect(persistThreadSnapshot(data)).rejects.toThrow(
        "Not authenticated",
      );
    });

    it("should skip block insert when no blocks", async () => {
      const insertFn = vi.fn().mockResolvedValue({ error: null });

      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          auth: {
            getUser: vi
              .fn()
              .mockResolvedValue({ data: { user: { id: "user-1" } } }),
          },
          from: vi.fn().mockImplementation((table: string) => {
            if (table === "threads") {
              return {
                upsert: vi.fn().mockResolvedValue({ error: null }),
              };
            }
            return { insert: insertFn };
          }),
        };
        return op(mockSupabase);
      });

      const data = {
        threadId: "t1",
        title: "Test",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        message: {
          id: "msg-1",
          role: "user" as const,
          createdAt: Date.now(),
        },
        blocks: [],
      };

      await persistThreadSnapshot(data);

      // Only insert for messages, not blocks
      expect(insertFn).toHaveBeenCalledTimes(1);
    });

    it("should throw on thread upsert error", async () => {
      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          auth: {
            getUser: vi
              .fn()
              .mockResolvedValue({ data: { user: { id: "user-1" } } }),
          },
          from: vi.fn().mockReturnValue({
            upsert: vi
              .fn()
              .mockResolvedValue({ error: { message: "Upsert failed" } }),
          }),
        };
        return op(mockSupabase);
      });

      const data = {
        threadId: "t1",
        title: "Test",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        message: {
          id: "msg-1",
          role: "user" as const,
          createdAt: Date.now(),
        },
        blocks: [],
      };

      await expect(persistThreadSnapshot(data)).rejects.toEqual({
        message: "Upsert failed",
      });
    });

    it("should throw on message insert error", async () => {
      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          auth: {
            getUser: vi
              .fn()
              .mockResolvedValue({ data: { user: { id: "user-1" } } }),
          },
          from: vi.fn().mockImplementation((table: string) => {
            if (table === "threads") {
              return {
                upsert: vi.fn().mockResolvedValue({ error: null }),
              };
            }
            return {
              insert: vi
                .fn()
                .mockResolvedValue({ error: { message: "Insert failed" } }),
            };
          }),
        };
        return op(mockSupabase);
      });

      const data = {
        threadId: "t1",
        title: "Test",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
        message: {
          id: "msg-1",
          role: "user" as const,
          createdAt: Date.now(),
        },
        blocks: [],
      };

      await expect(persistThreadSnapshot(data)).rejects.toEqual({
        message: "Insert failed",
      });
    });
  });

  describe("updateThreadMetadata", () => {
    it("should update title and updatedAt", async () => {
      const updateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          from: vi.fn().mockReturnValue({ update: updateFn }),
        };
        return op(mockSupabase);
      });

      await updateThreadMetadata("t1", "New Title", "2025-01-01T00:00:00Z");

      expect(updateFn).toHaveBeenCalledWith({
        title: "New Title",
        updated_at: "2025-01-01T00:00:00Z",
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

      await expect(
        updateThreadMetadata("t1", "Title", "2025-01-01T00:00:00Z"),
      ).rejects.toEqual({ message: "Update failed" });
    });
  });

  describe("deleteThreadFromSupabase", () => {
    it("should delete thread by ID", async () => {
      const eqFn = vi.fn().mockResolvedValue({ error: null });

      mockWithSupabaseClient.mockImplementation(async (op: Function) => {
        const mockSupabase = {
          from: vi.fn().mockReturnValue({
            delete: vi.fn().mockReturnValue({ eq: eqFn }),
          }),
        };
        return op(mockSupabase);
      });

      await deleteThreadFromSupabase("t1");

      expect(eqFn).toHaveBeenCalledWith("id", "t1");
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

      await expect(deleteThreadFromSupabase("t1")).rejects.toEqual({
        message: "Delete failed",
      });
    });
  });
});
