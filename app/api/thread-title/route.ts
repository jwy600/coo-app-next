import { NextRequest, NextResponse } from 'next/server';
import type { TitleRequest, TitleResponse, ApiError } from '@/types/api';
import { getOpenAiClient } from '@/lib/api/openAiClient';

const TITLE_INSTRUCTIONS = `Generate a concise title (5-7 words max) for a conversation thread.
The title should be descriptive and capture the main topic.
Return ONLY the title, no quotes or extra formatting.`;

export async function POST(request: NextRequest) {
  try {
    const body: TitleRequest = await request.json();

    if (!body.prompt?.trim()) {
      return NextResponse.json<ApiError>(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const client = getOpenAiClient();

    const inputContent = body.response
      ? `User's question: ${body.prompt}\n\nAI's response: ${body.response}`
      : `User's question: ${body.prompt}`;

    // Use the Responses API (consistent with the rest of the codebase)
    const response = await client.responses.create({
      model: 'gpt-5-mini',
      input: inputContent,
      instructions: TITLE_INSTRUCTIONS,
    });

    const generatedTitle = response.output_text?.trim();

    // Fallback to truncated prompt if generation fails
    const title = generatedTitle || (
      body.prompt.length > 50
        ? body.prompt.substring(0, 50) + '...'
        : body.prompt
    );

    return NextResponse.json<TitleResponse>({ title });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Thread title API error:', errorMessage, error);

    return NextResponse.json<ApiError>(
      { error: 'Failed to generate thread title', details: errorMessage },
      { status: 500 }
    );
  }
}
