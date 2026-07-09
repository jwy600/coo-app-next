import { describe, it, expect } from "vitest";
import { parseString, validatePrompt, validateMarkdownFile } from "@/lib/utils/validation";

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

describe("validateMarkdownFile", () => {
  const mk = (name: string, size: number): File =>
    new File(["x".repeat(Math.max(1, size))], name);

  it("accepts a small .md file", () => {
    expect(validateMarkdownFile(mk("notes.md", 10)).valid).toBe(true);
  });

  it("accepts a .markdown extension", () => {
    expect(validateMarkdownFile(mk("doc.markdown", 10)).valid).toBe(true);
  });

  it("is case-insensitive on the extension", () => {
    expect(validateMarkdownFile(mk("UPPER.MD", 10)).valid).toBe(true);
  });

  it("rejects a non-markdown extension", () => {
    const result = validateMarkdownFile(mk("notes.txt", 10));
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Markdown");
  });

  it("rejects a file over the size cap", () => {
    const result = validateMarkdownFile(mk("big.md", 513 * 1024));
    expect(result.valid).toBe(false);
    expect(result.error).toContain("too large");
  });

  it("accepts a file at exactly the size cap", () => {
    expect(validateMarkdownFile(mk("cap.md", 512 * 1024)).valid).toBe(true);
  });
});
