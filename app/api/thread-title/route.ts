import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { TitleRequest, TitleResponse, ApiError } from '@/types/api';

const client = new OpenAI();

export async function POST(request: NextRequest) {
  try {
    const body: TitleRequest = await request.json();

    if (!body.prompt?.trim()) {
      return NextResponse.json<ApiError>(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const systemPrompt = `Generate a concise title (5-7 words max) for a conversation thread.
The title should be descriptive and capture the main topic.
Return ONLY the title, no quotes or extra formatting.`;

    const userContent = body.response
      ? `User's question: ${body.prompt}\n\nAI's response: ${body.response}`
      : `User's question: ${body.prompt}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: 30,
      temperature: 0.7,
    });

    const generatedTitle = completion.choices[0]?.message?.content?.trim();

    // Fallback to truncated prompt if generation fails
    const title = generatedTitle || (
      body.prompt.length > 50
        ? body.prompt.substring(0, 50) + '...'
        : body.prompt
    );

    return NextResponse.json<TitleResponse>({ title });
  } catch (error: unknown) {
    console.error('Thread title API error:', error);

    return NextResponse.json<ApiError>(
      { error: 'Failed to generate thread title' },
      { status: 500 }
    );
  }
}
