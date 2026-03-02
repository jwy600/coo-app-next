import type { Settings } from "@/types/settings";
import { downloadMarkdown } from "./download";
import { saveToVault, type SaveToVaultResult } from "./saveToVault";

export interface ExportResult {
  success: boolean;
  error?: string;
}

/**
 * Unified export function that dispatches to the configured destination.
 *
 * - `local`: triggers a browser download (always succeeds)
 * - `obsidian`: saves to vault via server action, returns result for toast
 */
export async function exportMarkdown(
  content: string,
  filename: string,
  settings: Settings
): Promise<ExportResult> {
  if (settings.exportDestination === "obsidian") {
    const result: SaveToVaultResult = await saveToVault(
      content,
      filename,
      settings.obsidianVaultPath
    );
    return result;
  }

  // Local download (browser-side, always succeeds)
  downloadMarkdown(content, filename);
  return { success: true };
}
