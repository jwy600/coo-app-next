import { describe, it, expect, vi, afterEach } from "vitest";
import { idFactory } from "@/lib/utils/idFactory";

describe("idFactory", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return a UUID when crypto.randomUUID is available", () => {
    const result = idFactory();
    // crypto.randomUUID returns a UUID format
    expect(result).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("should return unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => idFactory()));
    expect(ids.size).toBe(100);
  });

  it("should use fallback when crypto.randomUUID is not available", () => {
    const originalRandomUUID = crypto.randomUUID;
    // Remove randomUUID to trigger fallback
    Object.defineProperty(crypto, "randomUUID", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const result = idFactory();
    expect(result).toMatch(/^id-/);
    expect(result.length).toBeGreaterThan(5);

    // Restore
    Object.defineProperty(crypto, "randomUUID", {
      value: originalRandomUUID,
      writable: true,
      configurable: true,
    });
  });
});
