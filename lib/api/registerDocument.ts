/**
 * Browser-side document registration.
 *
 * Sends an uploaded markdown document to the API once (store: true) so it
 * becomes a server-side conversation root. The returned `responseId` is stored
 * on the imported message as `meta.openaiResponseId` — after that, chat chains
 * from it via `getLastAssistantResponseId` and ask chains from it via
 * `openEditor`, with no per-call doc injection.
 *
 * The model's acknowledgement text is discarded; only the `responseId` matters.
 * Throws on any failure so the caller can abort the upload.
 */

"use client";

import type { Settings } from "@/types/settings";
import { createResponse } from "./openAiClient";
import { getRegisterDocumentPrompt } from "@/lib/config/prompts";

export async function registerDocument(
  docText: string,
  settings: Settings,
): Promise<string> {
  if (!settings?.apiKey) {
    throw new Error(
      "Missing OpenAI API key. Open Settings and paste your key.",
    );
  }

  const result = await createResponse({
    apiKey: settings.apiKey,
    model: settings.model,
    input: docText,
    instructions: getRegisterDocumentPrompt(),
    label: "register-doc",
  });

  return result.responseId;
}
