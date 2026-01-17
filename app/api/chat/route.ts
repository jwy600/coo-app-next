import { NextRequest, NextResponse } from 'next/server';
import type { ChatRequest, ChatResponse, ApiError } from '@/types/api';
import { getOpenAiClient } from '@/lib/api/openAiClient';
import { parseString, validatePrompt } from '@/lib/utils/validation';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ChatRequest = await request.json();
    const prompt = parseString(body?.prompt);

    // Validate prompt
    const validation = validatePrompt(prompt);
    if (!validation.valid) {
      return NextResponse.json<ApiError>(
        { error: validation.error || 'Invalid prompt.' },
        { status: 400 }
      );
    }

    // Initialize OpenAI client (throws if not configured)
    const openai = getOpenAiClient();

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract response text
    const text = completion.choices[0]?.message?.content?.trim();

    if (!text) {
      return NextResponse.json<ApiError>(
        { error: "The assistant didn't return any text." },
        { status: 500 }
      );
    }

    // Return successful response
    return NextResponse.json<ChatResponse>({ text });
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
