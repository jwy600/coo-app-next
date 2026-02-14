import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleApiError } from "@/lib/api/errorHandler";

describe("handleApiError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.mocked(console.error).mockRestore();
  });

  it("should handle OpenAI API key missing error", async () => {
    const error = new Error("Missing OpenAI API key configuration.");
    const response = handleApiError(error, "Test");
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toContain("Missing OpenAI API key");
  });

  it("should handle OpenAI errors with status property", async () => {
    const error = { message: "Rate limit exceeded", status: 429 };
    const response = handleApiError(error, "Test");
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toContain("couldn't reach the assistant");
    expect(body.details).toBe("Rate limit exceeded");
  });

  it("should handle generic errors", async () => {
    const error = new Error("Something unexpected");
    const response = handleApiError(error, "Test");
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toContain("ran into an issue");
  });

  it("should handle non-Error objects", async () => {
    const response = handleApiError("string error", "Test");
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toContain("ran into an issue");
  });

  it("should log the error with context", () => {
    handleApiError(new Error("test"), "Chat API");
    expect(console.error).toHaveBeenCalledWith(
      "Chat API error:",
      expect.any(Error),
    );
  });
});
