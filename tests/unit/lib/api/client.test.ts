import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch, ApiClientError } from "@/lib/api/client";

describe("ApiClientError", () => {
  it("should create error with message only", () => {
    const error = new ApiClientError("Something failed");
    expect(error.message).toBe("Something failed");
    expect(error.name).toBe("ApiClientError");
    expect(error.status).toBeUndefined();
    expect(error.details).toBeUndefined();
    expect(error).toBeInstanceOf(Error);
  });

  it("should create error with status and details", () => {
    const error = new ApiClientError("Not found", 404, "Resource missing");
    expect(error.message).toBe("Not found");
    expect(error.status).toBe(404);
    expect(error.details).toBe("Resource missing");
  });
});

describe("apiFetch", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should make a successful request and return data", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: "success" }),
    });

    const data = await apiFetch<{ result: string }>("/api/test");

    expect(data.result).toBe("success");
    expect(mockFetch).toHaveBeenCalledWith("/api/test", {
      headers: { "Content-Type": "application/json" },
    });
  });

  it("should merge custom headers", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/api/test", {
      headers: { Authorization: "Bearer token" },
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/test", {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
    });
  });

  it("should pass request options", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/api/test", {
      method: "POST",
      body: JSON.stringify({ key: "value" }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ key: "value" }),
      }),
    );
  });

  it("should throw ApiClientError on non-ok response with error message", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({ error: "Bad request", details: "Missing field" }),
    });

    await expect(apiFetch("/api/test")).rejects.toThrow(ApiClientError);
    try {
      await apiFetch("/api/test");
    } catch (err) {
      const apiErr = err as ApiClientError;
      expect(apiErr.message).toBe("Bad request");
      expect(apiErr.status).toBe(400);
      expect(apiErr.details).toBe("Missing field");
    }
  });

  it("should use fallback message when error field is missing", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    await expect(apiFetch("/api/test")).rejects.toThrow("Request failed");
  });

  it("should throw ApiClientError on network TypeError", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiFetch("/api/test")).rejects.toThrow(ApiClientError);
    try {
      await apiFetch("/api/test");
    } catch (err) {
      const apiErr = err as ApiClientError;
      expect(apiErr.message).toContain("Network error");
      expect(apiErr.status).toBe(0);
    }
  });

  it("should wrap unknown errors in ApiClientError", async () => {
    mockFetch.mockRejectedValue(new Error("Unexpected error"));

    await expect(apiFetch("/api/test")).rejects.toThrow(ApiClientError);
    try {
      await apiFetch("/api/test");
    } catch (err) {
      const apiErr = err as ApiClientError;
      expect(apiErr.message).toBe("Unexpected error");
      expect(apiErr.status).toBe(0);
    }
  });

  it("should handle non-Error thrown values", async () => {
    mockFetch.mockRejectedValue("string error");

    await expect(apiFetch("/api/test")).rejects.toThrow(ApiClientError);
    try {
      await apiFetch("/api/test");
    } catch (err) {
      const apiErr = err as ApiClientError;
      expect(apiErr.message).toBe("Unknown error occurred");
    }
  });
});
