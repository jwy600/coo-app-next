"use server";

import { mkdir, writeFile, stat } from "fs/promises";
import { join } from "path";

export interface SaveToVaultResult {
  success: boolean;
  error?: string;
}

/**
 * Save markdown content to an Obsidian vault folder.
 * Creates a `Coo/` subfolder inside the vault if it doesn't exist.
 *
 * @param content - Markdown content to save
 * @param filename - Filename (should end in .md)
 * @param vaultPath - Absolute path to the Obsidian vault root
 */
export async function saveToVault(
  content: string,
  filename: string,
  vaultPath: string
): Promise<SaveToVaultResult> {
  if (!vaultPath.trim()) {
    return { success: false, error: "Vault path is empty" };
  }

  try {
    // Validate vault path exists
    const vaultStat = await stat(vaultPath);
    if (!vaultStat.isDirectory()) {
      return { success: false, error: "Vault path is not a directory" };
    }

    // Create Coo/ subfolder if needed
    const cooDir = join(vaultPath, "Coo");
    await mkdir(cooDir, { recursive: true });

    // Write the file
    const filePath = join(cooDir, filename);
    await writeFile(filePath, content, "utf-8");

    return { success: true };
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") {
      return { success: false, error: "Vault path does not exist" };
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
