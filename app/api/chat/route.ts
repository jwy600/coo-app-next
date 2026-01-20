import { NextRequest, NextResponse } from 'next/server';
import type { ChatRequest, ChatResponse, ApiError } from '@/types/api';
import { createResponse } from '@/lib/api/openAiClient';
import { parseString, validatePrompt } from '@/lib/utils/validation';
import { getOpenAIModelConfig, DEVELOPER_PROMPT } from '@/lib/config/openai';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ChatRequest = await request.json();
    const prompt = parseString(body?.prompt);
    const previousResponseId = body?.previousResponseId;

    // Validate prompt
    const validation = validatePrompt(prompt);
    if (!validation.valid) {
      return NextResponse.json<ApiError>(
        { error: validation.error || 'Invalid prompt.' },
        { status: 400 }
      );
    }

    // Get model configuration
    const modelConfig = getOpenAIModelConfig();

    // Call OpenAI Responses API (enables contextual chat via previous_response_id)
    const result = await createResponse({
      model: modelConfig.model,
      input: prompt,
      instructions: DEVELOPER_PROMPT,
      previousResponseId,
    });

    if (!result.text) {
      return NextResponse.json<ApiError>(
        { error: "The assistant didn't return any text." },
        { status: 500 }
      );
    }

    // Return successful response with response ID for chaining
    return NextResponse.json<ChatResponse>({
      text: result.text,
      responseId: result.responseId,
    });
  } catch (error: any) {
    console.error('Chat API error:', error);

    // Handle OpenAI configuration errors
    if (error?.message?.includes('Missing OpenAI API key')) {
      return NextResponse.json<ApiError>(
        { error: 'Missing OpenAI API key configuration.' },
        { status: 500 }
      );
    }

    // Handle OpenAI specific errors
    if (error?.status) {
      return NextResponse.json<ApiError>(
        {
          error: "We couldn't reach the assistant. Please try again in a moment.",
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Generic error
    return NextResponse.json<ApiError>(
      { error: 'We ran into an issue generating a response. Please try again.' },
      { status: 500 }
    );
  }
}
