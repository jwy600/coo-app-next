import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatRequest, ChatResponse, ApiError } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ChatRequest = await request.json();
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';

    // Validation: Prompt required
    if (!prompt) {
      return NextResponse.json<ApiError>(
        { error: 'Please provide a prompt.' },
        { status: 400 }
      );
    }

    // Validation: Prompt length
    if (prompt.length > 4000) {
      return NextResponse.json<ApiError>(
        { error: 'That prompt is a bit too long. Please shorten it.' },
        { status: 400 }
      );
    }

    // Validation: OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json<ApiError>(
        { error: 'Missing OpenAI API key configuration.' },
        { status: 500 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60000, // 60 seconds (default is 10 minutes)
      maxRetries: 2,
    });

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
