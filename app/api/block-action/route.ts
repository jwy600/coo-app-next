import { NextRequest, NextResponse } from 'next/server';
import type { BlockActionRequest, BlockActionResponse, ApiError, BlockAction } from '@/types/api';
import { getOpenAiClient } from '@/lib/api/openAiClient';
import { parseString, validatePrompt } from '@/lib/utils/validation';
import { getOpenAIModelConfig, BLOCK_ACTION_PROMPT } from '@/lib/config/openai';

// Build action-specific prompt based on action type
function buildActionPrompt(
  action: BlockAction,
  blockText: string,
  prompt?: string
): string {
  const trimmedBlock = blockText.trim();

  switch (action) {
    case 'translate':
      return `Translate into Chinese:\n\n${trimmedBlock}`;

    case 'example':
      return `Give one concrete example of this:\n\n${trimmedBlock}`;

    case 'expand':
      return `Expand on this with more detail:\n\n${trimmedBlock}`;

    case 'eli5':
      return `Explain this like I'm five:\n\n${trimmedBlock}`;

    case 'rewrite': {
      const highlightPrompt = prompt?.trim() || '';
      return `Rewrite this text, incorporating the highlighted phrases naturally. If a phrase is in a different language, substitute it directly.\n\nPhrases to incorporate: ${highlightPrompt}\n\nText: ${trimmedBlock}`;
    }

    case 'ask': {
      const trimmedPrompt = prompt?.trim() || '';
      return `Text: "${trimmedBlock}"\n\nQuestion: ${trimmedPrompt}`;
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
      messages: [
        { role: 'system', content: BLOCK_ACTION_PROMPT },
        { role: 'user', content: actionPrompt },
      ],
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
