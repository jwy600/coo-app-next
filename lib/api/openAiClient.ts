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
