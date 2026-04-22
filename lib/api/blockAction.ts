/**
 * Browser-side block action handler.
 * Calls OpenAI directly using the user's API key from their local settings.
 */

"use client";

import type { BlockAction, BlockActionResponse } from "@/types/api";
import type { Settings, TranslateLanguage } from "@/types/settings";
import { parseString } from "@/lib/utils/validation";
import {
  getBlockActionPrompt,
  getTranslatePrompt,
} from "@/lib/config/prompts";
import { createResponse } from "./openAiClient";

const ACTION_PREAMBLES: Record<BlockAction, (prompt?: string) => string> = {
  translate: () => "",
  eli5: () => "Explain the following text like I'm 5:",
  example: () => "Give a concrete example that illustrates the following text:",
  expand: () => "Expand the following text with more detail and context:",
  rewrite: (prompt) =>
    `Rewrite the following text according to this instruction: ${prompt ?? ""}`,
  ask: (prompt) =>
    `Answer the following question about the text below.\n\nQuestion: ${prompt ?? ""}\n\nText:`,
};

const buildInput = (
  action: BlockAction,
  blockText: string,
  prompt?: string,
): string => {
  const preamble = ACTION_PREAMBLES[action](prompt);
  return preamble ? `${preamble}\n\n${blockText}` : blockText;
};

export async function fetchBlockAction(
  action: BlockAction,
  blockText: string,
  prompt?: string,
  translateLanguage?: TranslateLanguage,
  settings?: Settings,
): Promise<BlockActionResponse> {
  const trimmedBlockText = parseString(blockText);
  const trimmedPrompt = parseString(prompt);

  if (!trimmedBlockText) throw new Error("Block text cannot be empty");
  if ((action === "ask" || action === "rewrite") && !trimmedPrompt) {
    throw new Error(`Action '${action}' requires a prompt`);
  }
  if (!settings?.apiKey) {
    throw new Error(
      "Missing OpenAI API key. Open Settings and paste your key.",
    );
  }

  const instructions =
    action === "translate" && translateLanguage
      ? getTranslatePrompt(translateLanguage)
      : getBlockActionPrompt(settings.responseLanguage);

  const result = await createResponse({
    apiKey: settings.apiKey,
    model: settings.model,
    input: buildInput(action, trimmedBlockText, trimmedPrompt),
    instructions,
    reasoningEffort: settings.reasoningEffort,
    webSearchEnabled: settings.webSearchEnabled,
  });

  return { text: result.text };
}
