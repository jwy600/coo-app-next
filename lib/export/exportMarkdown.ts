import type { Settings } from "@/types/settings";
import { downloadMarkdown } from "./download";
import { openInObsidian } from "./openInObsidian";

export interface ExportResult {
  success: boolean;
  error?: string;
}

/**
 * Unified export function that dispatches to the configured destination.
 *
 * - `local`: triggers a browser download (always succeeds)
 * - `obsidian`: opens in Obsidian via URI scheme, returns result for toast
 */
export function exportMarkdown(
  content: string,
  filename: string,
  settings: Settings,
): ExportResult {
  if (settings.exportDestination === "obsidian") {
    return openInObsidian(content, filename, settings.obsidianVaultName);
  }

  // Local download (browser-side, always succeeds)
  downloadMarkdown(content, filename);
  return { success: true };
}
