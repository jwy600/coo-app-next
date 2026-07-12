/**
 * Browser-side thread title generator.
 * Fires a short non-streaming call to gpt-5.6-luna to produce a ≤5-word title
 * from the user's first message. Best-effort: returns null on any failure.
 */

"use client";

import type { Settings } from "@/types/settings";
import { createResponse } from "./openAiClient";
import { getThreadTitlePrompt } from "@/lib/config/prompts";
import { isTestMode } from "@/lib/utils/testMode";

const TITLE_MODEL = "gpt-5.6-luna";
const MAX_WORDS = 5;
const MAX_CHARS = 40;

export const sanitizeTitle = (raw: string): string | null => {
  let title = raw.trim();

  // Strip wrapping quotes or backticks
  title = title.replace(/^["'`]+|["'`]+$/g, "").trim();

  // Strip trailing punctuation
  title = title.replace(/[.!?,;:]+$/, "").trim();

  if (!title) return null;

  // Cap to MAX_WORDS words
  const words = title.split(/\s+/);
  if (words.length > MAX_WORDS) {
    title = words.slice(0, MAX_WORDS).join(" ");
  }

  // Safety belt: cap by character count
  if (title.length > MAX_CHARS) {
    title = title.substring(0, MAX_CHARS).trim();
  }

  return title || null;
};

export async function generateThreadTitle(
  userPrompt: string,
  settings: Settings,
): Promise<string | null> {
  if (!settings?.apiKey) return null;
  if (isTestMode()) return null;

  try {
    const result = await createResponse({
      apiKey: settings.apiKey,
      model: TITLE_MODEL,
      input: userPrompt,
      instructions: getThreadTitlePrompt(),
      label: "thread-title",
    });

    return sanitizeTitle(result.text);
  } catch {
    return null;
  }
}
