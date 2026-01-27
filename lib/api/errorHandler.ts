import { NextResponse } from 'next/server';
import type { ApiError } from '@/types/api';

/**
 * Handle API errors consistently across all route handlers
 *
 * @param error - The caught error
 * @param context - Context string for logging (e.g., 'Chat API', 'Block action')
 * @returns NextResponse with appropriate error message and status
 */
export function handleApiError(error: unknown, context: string): NextResponse<ApiError> {
  console.error(`${context} error:`, error);

  const err = error as { message?: string; status?: number };

  // Handle OpenAI configuration errors
  if (err?.message?.includes('Missing OpenAI API key')) {
    return NextResponse.json<ApiError>(
      { error: 'Missing OpenAI API key configuration.' },
      { status: 500 }
    );
  }

  // Handle OpenAI specific errors (have status property)
  if (err?.status) {
    return NextResponse.json<ApiError>(
      {
        error: "We couldn't reach the assistant. Please try again in a moment.",
        details: err.message,
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
