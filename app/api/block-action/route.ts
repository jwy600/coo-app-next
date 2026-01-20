import { NextRequest, NextResponse } from 'next/server';
import type { BlockActionRequest, BlockActionResponse, ApiError, BlockAction } from '@/types/api';
import { getOpenAiClient } from '@/lib/api/openAiClient';
import { parseString, validatePrompt } from '@/lib/utils/validation';
import { getOpenAIModelConfig } from '@/lib/config/openai';

// Build action-specific prompt based on action type
function buildActionPrompt(
  action: BlockAction,
  blockText: string,
  prompt?: string
): string {
  const trimmedBlock = blockText.trim();

  switch (action) {
    case 'translate':
      return `Translate the following text into Chinese:\n\n${trimmedBlock}`;

    case 'example':
      return `Provide a concise example that illustrates the following text:\n\n${trimmedBlock}`;

    case 'expand':
      return `Expand on the following text with more depth and detail:\n\n${trimmedBlock}`;

    case 'eli5':
      return `Explain the following text like I'm five:\n\n${trimmedBlock}`;

    case 'rewrite': {
      const highlightPrompt = prompt?.trim() || '';
      return `Rewrite the following text, preserving meaning while emphasizing the highlighted phrases.\n\nHighlighted phrases:\n${highlightPrompt}\n\nText to rewrite:\n${trimmedBlock}`;
    }

    case 'ask': {
      const trimmedPrompt = prompt?.trim() || '';
      return `You are given a selected paragraph:\n"${trimmedBlock}"\n\nUser's question:\n"${trimmedPrompt}"\n\nAnswer the question about the selected paragraph only.`;
    }

    default:
      return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: BlockActionRequest = await request.json();
    const action = parseString(body?.action);
    const blockText = parseString(body?.blockText);
    const prompt = parseString(body?.prompt);

    // Validation: Required fields
    if (!action || !blockText) {
      return NextResponse.json<ApiError>(
        { error: 'Missing block action input.' },
        { status: 400 }
      );
    }

    // Validation: Actions that require prompt
    if ((action === 'ask' || action === 'rewrite') && !prompt) {
      return NextResponse.json<ApiError>(
        { error: 'Missing prompt for block action.' },
        { status: 400 }
      );
    }

    // Build action-specific prompt
    const actionPrompt = buildActionPrompt(action as BlockAction, blockText, prompt);

    if (!actionPrompt) {
      return NextResponse.json<ApiError>(
        { error: 'Unsupported action.' },
        { status: 400 }
      );
    }

    // Validate combined prompt length
    const validation = validatePrompt(actionPrompt);
    if (!validation.valid) {
      return NextResponse.json<ApiError>(
        { error: 'That request is a bit too long. Please shorten it.' },
        { status: 400 }
      );
    }

    // Initialize OpenAI client (throws if not configured)
    const openai = getOpenAiClient();

    // Get model configuration
    const modelConfig = getOpenAIModelConfig();

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: modelConfig.model,
      messages: [{ role: 'user', content: actionPrompt }],
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
    return NextResponse.json<BlockActionResponse>({ text });
  } catch (error: any) {
    console.error('Block action API error:', error);

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
