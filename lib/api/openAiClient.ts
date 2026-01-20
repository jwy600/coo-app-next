/**
 * OpenAI client initialization and utilities
 */

import OpenAI from 'openai';

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
 * Check if OpenAI is configured
 */
export const isOpenAiConfigured = (): boolean => {
  return !!process.env.OPENAI_API_KEY;
};

/**
 * Parameters for creating a response using the Responses API
 */
export interface CreateResponseParams {
  model: string;
  input: string;
  instructions?: string;
  previousResponseId?: string;
}

/**
 * Result from the Responses API
 */
export interface ResponseResult {
  text: string;
  responseId: string;
}

/**
 * Create a response using OpenAI's Responses API
 * This enables contextual conversations via previous_response_id
 *
 * @param params - Response parameters
 * @returns Promise with response text and ID for chaining
 */
export const createResponse = async (params: CreateResponseParams): Promise<ResponseResult> => {
  const client = getOpenAiClient();

  const response = await client.responses.create({
    model: params.model,
    input: params.input,
    instructions: params.instructions,
    store: true,
    ...(params.previousResponseId && { previous_response_id: params.previousResponseId }),
  });

  const text = response.output_text?.trim() || '';

  return {
    text,
    responseId: response.id,
  };
};
