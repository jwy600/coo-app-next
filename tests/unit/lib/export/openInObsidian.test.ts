import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { openInObsidian } from "@/lib/export/openInObsidian";

describe("openInObsidian", () => {
  let clickSpy: ReturnType<typeof vi.spyOn>;
  let createElementSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    createElementSpy = vi.spyOn(document, "createElement");
  });

  afterEach(() => {
    clickSpy.mockRestore();
    createElementSpy.mockRestore();
  });

  const getTriggeredUri = (): string => {
    const anchorCall = createElementSpy.mock.results.find(
      (r: { value: unknown }) => (r.value as HTMLElement).tagName === "A",
    );
    return (anchorCall?.value as HTMLAnchorElement).href;
  };

  it("should return error for empty vault name", () => {
    const result = openInObsidian("# Hello", "test.md", "");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Vault name is empty");
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("should return error for whitespace-only vault name", () => {
    const result = openInObsidian("# Hello", "test.md", "   ");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Vault name is empty");
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("should build correct URI and trigger an anchor click", () => {
    const result = openInObsidian("# Hello World", "test.md", "MyVault");

    expect(result.success).toBe(true);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(getTriggeredUri()).toContain("obsidian://new?vault=MyVault");
  });

  it("should strip .md extension from the file path", () => {
    openInObsidian("content", "my-note.md", "Vault");

    const uri = getTriggeredUri();
    expect(uri).toContain(`file=${encodeURIComponent("Coo/my-note")}`);
    expect(uri).not.toContain(".md");
  });

  it("should place notes in the Coo/ subfolder", () => {
    openInObsidian("content", "note.md", "Vault");

    const uri = getTriggeredUri();
    expect(uri).toContain(`file=${encodeURIComponent("Coo/note")}`);
  });

  it("should encode content in the URI", () => {
    openInObsidian("# Special & <chars>", "test.md", "Vault");

    const uri = getTriggeredUri();
    expect(uri).toContain(
      `content=${encodeURIComponent("# Special & <chars>")}`,
    );
  });

  it("should encode vault name with special characters", () => {
    openInObsidian("content", "test.md", "My Vault & Notes");

    const uri = getTriggeredUri();
    expect(uri).toContain(`vault=${encodeURIComponent("My Vault & Notes")}`);
  });

  it("should include overwrite=true", () => {
    openInObsidian("content", "test.md", "Vault");

    const uri = getTriggeredUri();
    expect(uri).toContain("overwrite=true");
  });

  it("should remove the anchor after clicking", () => {
    openInObsidian("content", "test.md", "Vault");

    const anchors = document.body.querySelectorAll("a");
    expect(anchors.length).toBe(0);
  });
});
