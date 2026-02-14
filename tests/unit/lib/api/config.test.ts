import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockApiFetch } = vi.hoisted(() => ({
  mockApiFetch: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  apiFetch: mockApiFetch,
}));

import { fetchConfig, clearConfigCache } from "@/lib/api/config";

describe("fetchConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearConfigCache();
  });

  it("should fetch config from API", async () => {
    mockApiFetch.mockResolvedValue({
      supabaseUrl: "https://test.supabase.co",
      supabaseAnonKey: "test-key",
    });

    const config = await fetchConfig();

    expect(config.supabaseUrl).toBe("https://test.supabase.co");
    expect(config.supabaseAnonKey).toBe("test-key");
    expect(mockApiFetch).toHaveBeenCalledWith("/api/config", { method: "GET" });
  });

  it("should cache the result on second call", async () => {
    mockApiFetch.mockResolvedValue({
      supabaseUrl: "https://test.supabase.co",
      supabaseAnonKey: "test-key",
    });

    await fetchConfig();
    const config2 = await fetchConfig();

    expect(config2.supabaseUrl).toBe("https://test.supabase.co");
    // apiFetch should only be called once due to caching
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });

  it("should throw when config is incomplete (missing supabaseUrl)", async () => {
    mockApiFetch.mockResolvedValue({
      supabaseUrl: "",
      supabaseAnonKey: "test-key",
    });

    await expect(fetchConfig()).rejects.toThrow(
      "Supabase configuration is incomplete",
    );
  });

  it("should throw when config is incomplete (missing supabaseAnonKey)", async () => {
    mockApiFetch.mockResolvedValue({
      supabaseUrl: "https://test.supabase.co",
      supabaseAnonKey: "",
    });

    await expect(fetchConfig()).rejects.toThrow(
      "Supabase configuration is incomplete",
    );
  });

  it("should propagate API errors", async () => {
    mockApiFetch.mockRejectedValue(new Error("Network failed"));

    await expect(fetchConfig()).rejects.toThrow("Network failed");
  });
});

describe("clearConfigCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearConfigCache();
  });

  it("should clear the cache so next call fetches again", async () => {
    mockApiFetch.mockResolvedValue({
      supabaseUrl: "https://test.supabase.co",
      supabaseAnonKey: "test-key",
    });

    await fetchConfig();
    clearConfigCache();
    await fetchConfig();

    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });
});
