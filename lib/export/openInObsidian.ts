import type { ExportResult } from "./exportMarkdown";

/**
 * Open markdown content in Obsidian via the `obsidian://new` URI scheme.
 *
 * This works on any deployment (localhost or Vercel) because the browser
 * hands off to the OS, which launches Obsidian and creates the note.
 *
 * @param content  - Markdown content for the note
 * @param filename - Filename ending in .md (the .md suffix is stripped for the note path)
 * @param vaultName - Vault name as shown in Obsidian's vault switcher
 */
export function openInObsidian(
  content: string,
  filename: string,
  vaultName: string,
): ExportResult {
  if (!vaultName.trim()) {
    return { success: false, error: "Vault name is empty" };
  }

  // Strip .md extension — Obsidian uses the `file` param as a path, not a filename
  const notePath = `Coo/${filename.replace(/\.md$/, "")}`;

  const uri =
    `obsidian://new?vault=${encodeURIComponent(vaultName)}` +
    `&file=${encodeURIComponent(notePath)}` +
    `&content=${encodeURIComponent(content)}` +
    `&overwrite=true`;

  window.open(uri, "_self");

  return { success: true };
}
