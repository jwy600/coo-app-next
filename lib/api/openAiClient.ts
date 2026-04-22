/**
 * Browser-side OpenAI client.
 *
 * Uses the official `openai` SDK configured with `dangerouslyAllowBrowser: true`
 * because we accept the trade-off: the user brings their own API key, stored in
 * their own browser localStorage. No server-side proxy is involved.
 */

"use client";

import OpenAI from "openai";
import type { ReasoningEffort } from "@/types/settings";

const isDev = process.env.NODE_ENV === "development";

export class MissingApiKeyError extends Error {
  constructor() {
    super("Missing OpenAI API key. Open Settings and paste your key.");
    this.name = "MissingApiKeyError";
  }
}

export const getOpenAiClient = (apiKey: string): OpenAI => {
  if (!apiKey) throw new MissingApiKeyError();
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
    timeout: 60000,
    maxRetries: 2,
  });
};

export interface CreateResponseParams {
  apiKey: string;
  model: string;
  input: string;
  instructions?: string;
  previousResponseId?: string;
  reasoningEffort?: ReasoningEffort;
  webSearchEnabled?: boolean;
}

export interface ResponseResult {
  text: string;
  responseId: string;
}

const logRequest = (
  params: Omit<CreateResponseParams, "apiKey">,
  streaming: boolean,
) => {
  if (!isDev) return;
  const inputPreview =
    params.input.length > 100
      ? params.input.substring(0, 100) + "..."
      : params.input;
  console.log("\n[OpenAI Request]", {
    model: params.model,
    streaming,
    reasoningEffort: params.reasoningEffort || "none",
    webSearch: params.webSearchEnabled || false,
    previousResponseId: params.previousResponseId
      ? "..." + params.previousResponseId.slice(-8)
      : null,
    inputPreview,
  });
};

const logResponse = (responseId: string, text: string, streaming: boolean) => {
  if (!isDev) return;
  const outputPreview =
    text.length > 200 ? text.substring(0, 200) + "..." : text;
  console.log("[OpenAI Response]", {
    responseId: "..." + responseId.slice(-8),
    streaming,
    outputLength: text.length,
    outputPreview,
  });
};

const logError = (error: Error) => {
  if (!isDev) return;
  console.error("[OpenAI Error]", error.message);
};

const buildRequestBody = (params: CreateResponseParams) => ({
  model: params.model,
  input: params.input,
  instructions: params.instructions,
  store: true,
  ...(params.previousResponseId && {
    previous_response_id: params.previousResponseId,
  }),
  ...(params.reasoningEffort &&
    params.reasoningEffort !== "none" && {
      reasoning: { effort: params.reasoningEffort },
    }),
  ...(params.webSearchEnabled && {
    tools: [{ type: "web_search" as const }],
  }),
});

export const createResponse = async (
  params: CreateResponseParams,
): Promise<ResponseResult> => {
  const client = getOpenAiClient(params.apiKey);
  logRequest(params, false);

  try {
    const response = await client.responses.create(buildRequestBody(params));
    const text = response.output_text?.trim() || "";
    logResponse(response.id, text, false);
    return { text, responseId: response.id };
  } catch (error) {
    logError(error as Error);
    throw error;
  }
};

export interface StreamEventHandler {
  onToken: (token: string) => void;
  onResponseId: (responseId: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export const createResponseStream = async (
  params: CreateResponseParams,
  handler: StreamEventHandler,
): Promise<void> => {
  const client = getOpenAiClient(params.apiKey);
  logRequest(params, true);

  let responseId = "";
  let fullText = "";

  try {
    const stream = await client.responses.create({
      ...buildRequestBody(params),
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === "response.created") {
        responseId = event.response.id;
        handler.onResponseId(event.response.id);
      } else if (event.type === "response.output_text.delta") {
        if (event.delta) {
          fullText += event.delta;
          handler.onToken(event.delta);
        }
      } else if (event.type === "response.completed") {
        logResponse(responseId, fullText, true);
        handler.onComplete();
      }
    }
  } catch (error) {
    logError(error as Error);
    handler.onError(error as Error);
  }
};
