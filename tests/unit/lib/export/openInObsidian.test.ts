import { describe, it, expect, vi, beforeEach } from "vitest";
import { openInObsidian } from "@/lib/export/openInObsidian";

describe("openInObsidian", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { open: vi.fn() });
  });

  it("should return error for empty vault name", () => {
    const result = openInObsidian("# Hello", "test.md", "");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Vault name is empty");
  });

  it("should return error for whitespace-only vault name", () => {
    const result = openInObsidian("# Hello", "test.md", "   ");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Vault name is empty");
  });

  it("should build correct URI and call window.open", () => {
    const result = openInObsidian("# Hello World", "test.md", "MyVault");

    expect(result.success).toBe(true);
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("obsidian://new?vault=MyVault"),
      "_self",
    );
  });

  it("should strip .md extension from the file path", () => {
    openInObsidian("content", "my-note.md", "Vault");

    const uri = vi.mocked(window.open).mock.calls[0][0] as string;
    expect(uri).toContain(`file=${encodeURIComponent("Coo/my-note")}`);
    expect(uri).not.toContain(".md");
  });

  it("should place notes in the Coo/ subfolder", () => {
    openInObsidian("content", "note.md", "Vault");

    const uri = vi.mocked(window.open).mock.calls[0][0] as string;
    expect(uri).toContain(`file=${encodeURIComponent("Coo/note")}`);
  });

  it("should encode content in the URI", () => {
    openInObsidian("# Special & <chars>", "test.md", "Vault");

    const uri = vi.mocked(window.open).mock.calls[0][0] as string;
    expect(uri).toContain(
      `content=${encodeURIComponent("# Special & <chars>")}`,
    );
  });

  it("should encode vault name with special characters", () => {
    openInObsidian("content", "test.md", "My Vault & Notes");

    const uri = vi.mocked(window.open).mock.calls[0][0] as string;
    expect(uri).toContain(
      `vault=${encodeURIComponent("My Vault & Notes")}`,
    );
  });

  it("should include overwrite=true", () => {
    openInObsidian("content", "test.md", "Vault");

    const uri = vi.mocked(window.open).mock.calls[0][0] as string;
    expect(uri).toContain("overwrite=true");
  });
});
