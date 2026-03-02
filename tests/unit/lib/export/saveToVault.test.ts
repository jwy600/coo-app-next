import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, stat } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { saveToVault } from "@/lib/export/saveToVault";

describe("saveToVault", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "coo-vault-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should save a file to the Coo/ subfolder", async () => {
    const result = await saveToVault("# Hello", "test.md", tempDir);
    expect(result.success).toBe(true);

    const content = await readFile(join(tempDir, "Coo", "test.md"), "utf-8");
    expect(content).toBe("# Hello");
  });

  it("should create the Coo/ subfolder if missing", async () => {
    await saveToVault("content", "file.md", tempDir);

    const cooStat = await stat(join(tempDir, "Coo"));
    expect(cooStat.isDirectory()).toBe(true);
  });

  it("should return error for empty vault path", async () => {
    const result = await saveToVault("content", "file.md", "");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Vault path is empty");
  });

  it("should return error for whitespace-only vault path", async () => {
    const result = await saveToVault("content", "file.md", "   ");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Vault path is empty");
  });

  it("should return error for nonexistent vault path", async () => {
    const result = await saveToVault(
      "content",
      "file.md",
      "/nonexistent/path/to/vault"
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe("Vault path does not exist");
  });

  it("should overwrite existing file", async () => {
    await saveToVault("first", "test.md", tempDir);
    await saveToVault("second", "test.md", tempDir);

    const content = await readFile(join(tempDir, "Coo", "test.md"), "utf-8");
    expect(content).toBe("second");
  });
});
