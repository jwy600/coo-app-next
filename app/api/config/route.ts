import { NextRequest, NextResponse } from 'next/server';
import type { ConfigResponse, ApiError } from '@/types/api';

export async function GET(request: NextRequest) {
  try {
    // Get Supabase configuration from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

    // Return configuration (even if empty - client will handle validation)
    return NextResponse.json<ConfigResponse>({
      supabaseUrl,
      supabaseAnonKey,
    });
  } catch (error: any) {
    console.error('Config API error:', error);

    return NextResponse.json<ApiError>(
      { error: 'Failed to retrieve configuration.' },
      { status: 500 }
    );
  }
}
