/**
 * Browser-side chat streaming.
 * Calls OpenAI directly using the user's API key from their local settings.
 */

"use client";

import type { Settings } from "@/types/settings";
import { validatePrompt } from "@/lib/utils/validation";
import { getChatPrompt } from "@/lib/config/prompts";
import { createResponseStream } from "./openAiClient";

export interface StreamChatCallbacks {
  onToken: (token: string) => void;
  onResponseId: (responseId: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export async function fetchChatCompletionStream(
  prompt: string,
  callbacks: StreamChatCallbacks,
  _threadId?: string,
  previousResponseId?: string,
  settings?: Settings,
): Promise<void> {
  const trimmedPrompt = prompt.trim();
  const validation = validatePrompt(trimmedPrompt);

  if (!validation.valid) {
    callbacks.onError(new Error(validation.error || "Invalid prompt"));
    return;
  }

  if (!settings?.apiKey) {
    callbacks.onError(
      new Error("Missing OpenAI API key. Open Settings and paste your key."),
    );
    return;
  }

  await createResponseStream(
    {
      apiKey: settings.apiKey,
      model: settings.model,
      input: trimmedPrompt,
      instructions: getChatPrompt(settings.responseLanguage),
      previousResponseId,
      reasoningEffort: settings.reasoningEffort,
      webSearchEnabled: settings.webSearchEnabled,
    },
    callbacks,
  );
}
