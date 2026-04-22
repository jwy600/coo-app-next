import type { ExportResult } from "./exportMarkdown";

/**
 * Open markdown content in Obsidian via the `obsidian://new` URI scheme.
 *
 * Triggers the navigation by programmatically clicking a hidden anchor. On
 * HTTPS origins (Vercel), Chrome silently drops `window.open(..., "_self")`
 * navigations to custom schemes unless they come from an anchor-click
 * dispatch. The anchor-click path is the same one the browser uses for real
 * link clicks, so the external-protocol handler always fires.
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

  const anchor = document.createElement("a");
  anchor.href = uri;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  return { success: true };
}
