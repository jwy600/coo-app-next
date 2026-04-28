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
  eli5: () => "Explain the passage like I'm 5.",
  example: () => "Give a concrete example that illustrates the passage.",
  expand: () => "Expand the passage with more detail and context.",
  summarize: () => "Summarize the passage concisely.",
  rewrite: (prompt) =>
    `Rewrite the passage according to this instruction: ${prompt ?? ""}`,
  ask: (prompt) =>
    `Answer this question about the passage.\n\nQuestion: ${prompt ?? ""}`,
};

const buildInput = (
  action: BlockAction,
  blockText: string,
  prompt?: string,
  referenceQuestion?: string,
): string => {
  const preamble = ACTION_PREAMBLES[action](prompt);
  const passage = `<passage>\n${blockText}\n</passage>`;
  const reference = referenceQuestion
    ? `<reference-question>\n${referenceQuestion}\n</reference-question>\n\n`
    : "";
  const body = preamble ? `${preamble}\n\n${passage}` : passage;
  return `${reference}${body}`;
};

export async function fetchBlockAction(
  action: BlockAction,
  blockText: string,
  prompt?: string,
  translateLanguage?: TranslateLanguage,
  settings?: Settings,
  previousResponseId?: string,
  referenceQuestion?: string,
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

  // Inject the reference question only when the chain is unavailable.
  // Once previousResponseId is set, the prior turns are carried server-side.
  const trimmedReference = previousResponseId
    ? undefined
    : parseString(referenceQuestion) || undefined;

  const input = buildInput(
    action,
    trimmedBlockText,
    trimmedPrompt,
    trimmedReference,
  );

  const result = await createResponse({
    apiKey: settings.apiKey,
    model: settings.model,
    input,
    instructions,
    reasoningEffort: settings.reasoningEffort,
    webSearchEnabled: settings.webSearchEnabled,
    previousResponseId,
    label: `focus:${action}`,
  });

  return { text: result.text, responseId: result.responseId };
}
