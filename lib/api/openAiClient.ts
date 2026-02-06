/**
 * OpenAI client initialization and utilities
 */

import OpenAI from 'openai';
import type { ReasoningEffort } from '@/types/settings';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Get configured OpenAI client instance
 * @throws Error if OPENAI_API_KEY is not configured
 */
export const getOpenAiClient = (): OpenAI => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OpenAI API key configuration.');
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 60000, // 60 seconds
    maxRetries: 2,
  });
};

/**
 * Parameters for creating a response using the Responses API
 */
export interface CreateResponseParams {
  model: string;
  input: string;
  instructions?: string;
  previousResponseId?: string;
  reasoningEffort?: ReasoningEffort;
  webSearchEnabled?: boolean;
}

/**
 * Result from the Responses API
 */
export interface ResponseResult {
  text: string;
  responseId: string;
}

/**
 * Log OpenAI API request (dev only)
 */
const logRequest = (params: CreateResponseParams, streaming: boolean) => {
  if (!isDev) return;

  const inputPreview = params.input.length > 100
    ? params.input.substring(0, 100) + '...'
    : params.input;

  console.log('\n[OpenAI Request]', {
    model: params.model,
    streaming,
    reasoningEffort: params.reasoningEffort || 'none',
    webSearch: params.webSearchEnabled || false,
    previousResponseId: params.previousResponseId ? '...' + params.previousResponseId.slice(-8) : null,
    inputPreview,
  });
};

/**
 * Log OpenAI API response (dev only)
 */
const logResponse = (responseId: string, text: string, streaming: boolean) => {
  if (!isDev) return;

  const outputPreview = text.length > 200
    ? text.substring(0, 200) + '...'
    : text;

  console.log('[OpenAI Response]', {
    responseId: '...' + responseId.slice(-8),
    streaming,
    outputLength: text.length,
    outputPreview,
  });
};

/**
 * Log OpenAI API error (dev only)
 */
const logError = (error: Error) => {
  if (!isDev) return;
  console.error('[OpenAI Error]', error.message);
};

/**
 * Create a response using OpenAI's Responses API
 * This enables contextual conversations via previous_response_id
 *
 * @param params - Response parameters
 * @returns Promise with response text and ID for chaining
 */
export const createResponse = async (params: CreateResponseParams): Promise<ResponseResult> => {
  const client = getOpenAiClient();

  logRequest(params, false);

  try {
    const response = await client.responses.create({
      model: params.model,
      input: params.input,
      instructions: params.instructions,
      store: true,
      ...(params.previousResponseId && { previous_response_id: params.previousResponseId }),
      // Add reasoning effort when not 'none'
      ...(params.reasoningEffort && params.reasoningEffort !== 'none' && {
        reasoning: { effort: params.reasoningEffort }
      }),
      // Add web search tool when enabled
      ...(params.webSearchEnabled && {
        tools: [{ type: 'web_search' as const }]
      }),
    });

    const text = response.output_text?.trim() || '';

    logResponse(response.id, text, false);

    return {
      text,
      responseId: response.id,
    };
  } catch (error) {
    logError(error as Error);
    throw error;
  }
};

/**
 * Event handler interface for streaming responses
 */
export interface StreamEventHandler {
  onToken: (token: string) => void;
  onResponseId: (responseId: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

/**
 * Create a streaming response using OpenAI's Responses API
 * This enables real-time token-by-token output
 *
 * @param params - Response parameters
 * @param handler - Event handlers for stream events
 */
export const createResponseStream = async (
  params: CreateResponseParams,
  handler: StreamEventHandler
): Promise<void> => {
  const client = getOpenAiClient();

  logRequest(params, true);

  let responseId = '';
  let fullText = '';

  try {
    const stream = await client.responses.create({
      model: params.model,
      input: params.input,
      instructions: params.instructions,
      store: true,
      stream: true,
      ...(params.previousResponseId && { previous_response_id: params.previousResponseId }),
      // Add reasoning effort when not 'none'
      ...(params.reasoningEffort && params.reasoningEffort !== 'none' && {
        reasoning: { effort: params.reasoningEffort }
      }),
      // Add web search tool when enabled
      ...(params.webSearchEnabled && {
        tools: [{ type: 'web_search' as const }]
      }),
    });

    for await (const event of stream) {
      // Handle response creation event (contains response ID)
      if (event.type === 'response.created') {
        responseId = event.response.id;
        handler.onResponseId(event.response.id);
      }
      // Handle text delta events (streaming tokens)
      else if (event.type === 'response.output_text.delta') {
        if (event.delta) {
          fullText += event.delta;
          handler.onToken(event.delta);
        }
      }
      // Handle completion
      else if (event.type === 'response.completed') {
        logResponse(responseId, fullText, true);
        handler.onComplete();
      }
    }
  } catch (error) {
    logError(error as Error);
    handler.onError(error as Error);
  }
};
