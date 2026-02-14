import { describe, it, expect } from "vitest";
import { parseString, validatePrompt } from "@/lib/utils/validation";

describe("parseString", () => {
  it("trims string value", () => {
    expect(parseString("  hello  ")).toBe("hello");
  });

  it("returns default for non-string", () => {
    expect(parseString(42)).toBe("");
    expect(parseString(null)).toBe("");
    expect(parseString(undefined)).toBe("");
  });

  it("returns custom default for non-string", () => {
    expect(parseString(null, "fallback")).toBe("fallback");
  });

  it("returns empty string for empty string input", () => {
    expect(parseString("")).toBe("");
  });
});

describe("validatePrompt", () => {
  it("rejects empty prompt", () => {
    const result = validatePrompt("");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("provide a prompt");
  });

  it("rejects whitespace-only prompt", () => {
    const result = validatePrompt("   ");
    expect(result.valid).toBe(false);
  });

  it("accepts valid prompt", () => {
    const result = validatePrompt("Hello, what is TypeScript?");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects prompt exceeding max length", () => {
    const long = "a".repeat(4001);
    const result = validatePrompt(long);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("too long");
  });

  it("accepts prompt at exactly max length", () => {
    const exact = "a".repeat(4000);
    const result = validatePrompt(exact);
    expect(result.valid).toBe(true);
  });

  it("uses custom max length", () => {
    const result = validatePrompt("hello", 3);
    expect(result.valid).toBe(false);
  });
});
